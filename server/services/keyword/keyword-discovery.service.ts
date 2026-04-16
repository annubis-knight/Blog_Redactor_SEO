import { join } from 'path'
import {
  fetchDataForSeo,
  fetchKeywordOverviewBatch,
  fetchSearchIntentBatch,
  computeCompositeScore,
} from '../external/dataforseo.service.js'
import { log } from '../../utils/logger.js'
import { getKeywordsByCocoon } from '../infra/data.service.js'
import { slugify, getOrFetch } from '../../utils/cache.js'
import type {
  KeywordType,
  RelatedKeyword,
  ClassifiedKeyword,
  KeywordDiscoveryResult,
  DomainDiscoveryResult,
} from '../../../shared/types/index.js'

const DEFAULT_LOCATION_CODE = 2250 // France
const DEFAULT_LANGUAGE_CODE = 'fr'
const DISCOVERY_CACHE_DIR = join(process.cwd(), 'data', 'cache', 'discovery')
const DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000 // 24h

// --- Classification ---

/**
 * Classify keywords relative to the dataset using volume percentiles + word count.
 * - Pilier: top ~15% by volume AND ≤ 3 words
 * - Moyenne traine: next ~35% by volume AND ≤ 4 words
 * - Longue traine: everything else
 *
 * When a keyword has high volume but too many words, it falls one tier down.
 */
export function classifyKeywordsRelative(
  keywords: Array<{ searchVolume: number; wordsCount: number }>,
): KeywordType[] {
  if (keywords.length === 0) return []

  // Compute volume percentiles from the dataset
  const volumes = keywords.map(k => k.searchVolume).sort((a, b) => b - a)
  const p85 = volumes[Math.floor(volumes.length * 0.15)] ?? 0 // top 15%
  const p50 = volumes[Math.floor(volumes.length * 0.50)] ?? 0 // top 50%

  return keywords.map(({ searchVolume, wordsCount }) => {
    if (searchVolume >= p85 && wordsCount <= 3) return 'Pilier'
    if (searchVolume >= p50 && wordsCount <= 4) return 'Moyenne traine'
    // High volume but too many words → still Moyenne traine
    if (searchVolume >= p85 && wordsCount > 3) return 'Moyenne traine'
    return 'Longue traine'
  })
}

// --- Raw DataForSEO response interfaces ---

interface SuggestionItem {
  keyword: string
  keyword_info: {
    search_volume: number | null
    competition: number | null
    cpc: number | null
  }
  keyword_properties?: {
    core_keyword?: string | null
  }
}

interface SuggestionRawResult {
  items: SuggestionItem[] | null
}

interface RelatedRawResult {
  items: Array<{
    keyword_data: {
      keyword: string
      keyword_info: {
        search_volume: number | null
        competition: number | null
        cpc: number | null
      }
    }
    related_keywords: Array<{
      keyword: string
      keyword_info: {
        search_volume: number | null
        competition: number | null
        cpc: number | null
      }
    }> | null
  }>
}

interface KeywordIdeasRawResult {
  items: SuggestionItem[] | null
}

interface KeywordsForSiteRawResult {
  items: Array<{
    keyword: string
    keyword_info: {
      search_volume: number | null
      competition: number | null
      cpc: number | null
    }
  }> | null
}

// --- Core discovery functions ---

/** Fetch keyword suggestions (long-tail variations) */
async function fetchSuggestions(
  seed: string,
  limit: number,
): Promise<Array<{ keyword: string; source: 'suggestions' }>> {
  try {
    log.debug(`[Discovery] Fetching suggestions for "${seed}" (limit=${limit})`)
    const start = Date.now()
    const result = await fetchDataForSeo<SuggestionRawResult>(
      '/dataforseo_labs/google/keyword_suggestions/live',
      [{
        keyword: seed,
        location_code: DEFAULT_LOCATION_CODE,
        language_code: DEFAULT_LANGUAGE_CODE,
        limit,
        filters: ['keyword_info.search_volume', '>', 0],
      }],
    )
    const items = (result.items ?? [])
      .filter(i => i.keyword)
      .map(i => ({ keyword: i.keyword, source: 'suggestions' as const }))
    log.info(`[Discovery] Suggestions for "${seed}": ${items.length} keywords in ${Date.now() - start}ms`)
    return items
  } catch (err) {
    log.warn(`Keyword suggestions failed for "${seed}": ${(err as Error).message}`)
    return []
  }
}

/** Fetch related keywords (semantic expansion) */
async function fetchRelated(
  seed: string,
  limit: number,
): Promise<Array<{ keyword: string; source: 'related' }>> {
  try {
    log.debug(`[Discovery] Fetching related keywords for "${seed}" (limit=${limit})`)
    const start = Date.now()
    const result = await fetchDataForSeo<RelatedRawResult>(
      '/dataforseo_labs/google/related_keywords/live',
      [{
        keyword: seed,
        location_code: DEFAULT_LOCATION_CODE,
        language_code: DEFAULT_LANGUAGE_CODE,
        depth: 2,
        limit,
      }],
    )
    const firstItem = result.items?.[0]
    if (!firstItem?.related_keywords) {
      log.info(`[Discovery] Related for "${seed}": 0 keywords in ${Date.now() - start}ms`)
      return []
    }
    const items = firstItem.related_keywords
      .filter(rk => rk.keyword)
      .map(rk => ({ keyword: rk.keyword, source: 'related' as const }))
    log.info(`[Discovery] Related for "${seed}": ${items.length} keywords in ${Date.now() - start}ms`)
    return items
  } catch (err) {
    log.warn(`Related keywords failed for "${seed}": ${(err as Error).message}`)
    return []
  }
}

/** Fetch keyword ideas (thematic discovery) */
async function fetchIdeas(
  seed: string,
  limit: number,
): Promise<Array<{ keyword: string; source: 'ideas' }>> {
  try {
    log.debug(`[Discovery] Fetching ideas for "${seed}" (limit=${limit})`)
    const start = Date.now()
    const result = await fetchDataForSeo<KeywordIdeasRawResult>(
      '/dataforseo_labs/google/keyword_ideas/live',
      [{
        keywords: [seed],
        location_code: DEFAULT_LOCATION_CODE,
        language_code: DEFAULT_LANGUAGE_CODE,
        limit,
        filters: ['keyword_info.search_volume', '>', 0],
      }],
    )
    const items = (result.items ?? [])
      .filter(i => i.keyword)
      .map(i => ({ keyword: i.keyword, source: 'ideas' as const }))
    log.info(`[Discovery] Ideas for "${seed}": ${items.length} keywords in ${Date.now() - start}ms`)
    return items
  } catch (err) {
    log.warn(`Keyword ideas failed for "${seed}": ${(err as Error).message}`)
    return []
  }
}

/** Deduplicate keywords by lowercase, keep first occurrence's source */
function deduplicateKeywords(
  all: Array<{ keyword: string; source: 'suggestions' | 'related' | 'ideas' | 'competitor' }>,
): Array<{ keyword: string; source: 'suggestions' | 'related' | 'ideas' | 'competitor' }> {
  const seen = new Map<string, { keyword: string; source: 'suggestions' | 'related' | 'ideas' | 'competitor' }>()
  for (const item of all) {
    const key = item.keyword.toLowerCase()
    if (!seen.has(key)) {
      seen.set(key, item)
    }
  }
  return [...seen.values()]
}

/** Enrich raw keywords with overview + intent + classification + score */
async function enrichAndClassify(
  rawKeywords: Array<{ keyword: string; source: 'suggestions' | 'related' | 'ideas' | 'competitor' }>,
  existingKeywords?: Set<string>,
): Promise<ClassifiedKeyword[]> {
  if (rawKeywords.length === 0) return []

  const keywordStrings = rawKeywords.map(k => k.keyword)

  // Batch fetch overview + intent in parallel
  log.info(`[Discovery] Enriching ${keywordStrings.length} keywords (overview + intent batch)`)
  const startEnrich = Date.now()
  const [overviewMap, intentMap] = await Promise.all([
    fetchKeywordOverviewBatch(keywordStrings),
    fetchSearchIntentBatch(keywordStrings),
  ])
  log.info(`[Discovery] Enrichment done in ${Date.now() - startEnrich}ms: overview=${overviewMap.size}, intent=${intentMap.size}`)

  // Build enriched entries (without type yet)
  const enriched: Array<{
    raw: typeof rawKeywords[number]
    overview: NonNullable<ReturnType<typeof overviewMap.get>>
    intentData: ReturnType<typeof intentMap.get>
    wordsCount: number
    compositeScore: ReturnType<typeof computeCompositeScore>
  }> = []

  for (const raw of rawKeywords) {
    const kwLower = raw.keyword.toLowerCase()
    const overview = overviewMap.get(kwLower)
    if (!overview) continue

    const wordsCount = overview.wordsCount ?? raw.keyword.split(/\s+/).length
    enriched.push({
      raw,
      overview,
      intentData: intentMap.get(kwLower),
      wordsCount,
      compositeScore: computeCompositeScore(overview),
    })
  }

  // Classify all keywords relative to the dataset
  const types = classifyKeywordsRelative(
    enriched.map(e => ({ searchVolume: e.overview.searchVolume, wordsCount: e.wordsCount })),
  )

  const results: ClassifiedKeyword[] = enriched.map((e, i) => ({
    keyword: e.raw.keyword,
    type: types[i],
    searchVolume: e.overview.searchVolume,
    difficulty: e.overview.difficulty,
    cpc: e.overview.cpc,
    competition: e.overview.competition,
    wordsCount: e.wordsCount,
    intent: e.intentData?.intent,
    intentProbability: e.intentData?.intentProbability,
    compositeScore: e.compositeScore,
    source: e.raw.source,
    existsInCocoon: existingKeywords?.has(e.raw.keyword.toLowerCase()),
  }))

  // Sort by composite score descending
  results.sort((a, b) => b.compositeScore.total - a.compositeScore.total)

  const typeCounts: Record<string, number> = { Pilier: 0, 'Moyenne traine': 0, 'Longue traine': 0, 'Intermédiaire': 0, 'Spécialisé': 0 }
  for (const r of results) typeCounts[r.type]++
  log.info(`[Discovery] Classification: ${results.length} keywords`, typeCounts)

  return results
}

// --- Public API ---

/** Discover keywords from a seed keyword via 3 parallel DataForSEO endpoints */
export async function discoverKeywords(
  seed: string,
  options?: { maxResults?: number },
): Promise<KeywordDiscoveryResult> {
  return getOrFetch<KeywordDiscoveryResult>(DISCOVERY_CACHE_DIR, `seed-${slugify(seed)}`, DISCOVERY_TTL_MS, async () => {
    const startTotal = Date.now()
    log.info(`[Discovery] Starting seed discovery for "${seed}"`)
    const maxPerEndpoint = Math.min(options?.maxResults ?? 200, 200)

    const [suggestions, related, ideas] = await Promise.all([
      fetchSuggestions(seed, maxPerEndpoint),
      fetchRelated(seed, Math.min(maxPerEndpoint, 100)),
      fetchIdeas(seed, maxPerEndpoint),
    ])

    const totalBeforeDedup = suggestions.length + related.length + ideas.length
    const allRaw = [...suggestions, ...related, ...ideas]
    const unique = deduplicateKeywords(allRaw)
    log.info(`[Discovery] Dedup for "${seed}": ${totalBeforeDedup} raw → ${unique.length} unique (suggestions=${suggestions.length}, related=${related.length}, ideas=${ideas.length})`)

    const keywords = await enrichAndClassify(unique)

    const apiCost = 0.05 + 0.01 + 0.05 + 0.01 + 0.001

    log.info(`[Discovery] Seed discovery for "${seed}" complete in ${Date.now() - startTotal}ms: ${keywords.length} final keywords, cost=$${Math.round(apiCost * 1000) / 1000}`)

    return {
      seed,
      keywords,
      totalBeforeDedup,
      totalAfterDedup: unique.length,
      apiCost: Math.round(apiCost * 1000) / 1000,
    }
  })
}

/** Discover keywords from a competitor domain */
export async function discoverFromDomain(
  domain: string,
  options?: { maxResults?: number },
  existingCocoonKeywords?: string[],
): Promise<DomainDiscoveryResult> {
  return getOrFetch<DomainDiscoveryResult>(DISCOVERY_CACHE_DIR, `domain-${slugify(domain)}`, DISCOVERY_TTL_MS, async () => {
    const startTotal = Date.now()
    log.info(`[Discovery] Starting domain discovery for "${domain}"`)
    const limit = options?.maxResults ?? 200

    let rawKeywords: Array<{ keyword: string; source: 'competitor' }> = []
    try {
      log.debug(`[Discovery] Fetching keywords_for_site for "${domain}" (limit=${limit})`)
      const startSite = Date.now()
      const result = await fetchDataForSeo<KeywordsForSiteRawResult>(
        '/dataforseo_labs/google/keywords_for_site/live',
        [{
          target: domain,
          location_code: DEFAULT_LOCATION_CODE,
          language_code: DEFAULT_LANGUAGE_CODE,
          limit,
          filters: ['keyword_info.search_volume', '>', 0],
        }],
      )
      rawKeywords = (result.items ?? [])
        .filter(i => i.keyword)
        .map(i => ({ keyword: i.keyword, source: 'competitor' as const }))
      log.info(`[Discovery] keywords_for_site for "${domain}": ${rawKeywords.length} keywords in ${Date.now() - startSite}ms`)
    } catch (err) {
      log.warn(`Keywords for site failed for "${domain}": ${(err as Error).message}`)
    }

    const existingSet = new Set(
      (existingCocoonKeywords ?? []).map(k => k.toLowerCase()),
    )

    const keywords = await enrichAndClassify(rawKeywords, existingSet)
    const apiCost = 0.05 + 0.01 + 0.001

    log.info(`[Discovery] Domain discovery for "${domain}" complete in ${Date.now() - startTotal}ms: ${keywords.length} final keywords, cost=$${Math.round(apiCost * 1000) / 1000}`)

    return {
      domain,
      keywords,
      total: rawKeywords.length,
      apiCost: Math.round(apiCost * 1000) / 1000,
    }
  })
}
