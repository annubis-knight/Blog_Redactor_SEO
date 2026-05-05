import { log } from '../../../utils/logger.js'
import type {
  DataForSeoCacheEntry,
  KeywordOverview,
  KeywordCompositeScore,
  KeywordAlert,
  RedundancyPair,
  KeywordAuditResult,
  AuditCacheStatus,
  RelatedKeyword,
  Keyword,
} from '../../../../shared/types/index.js'
import {
  KEYWORD_SCORE_WEIGHTS,
  KEYWORD_AUDIT_THRESHOLDS,
} from '../../../../shared/constants/seo.constants.js'
import { AUDIT_INTER_REQUEST_DELAY_MS, sleep } from './_client.js'
import { readCache, writeCache, isCacheFresh } from './cache.js'
import { fetchRelatedKeywords, fetchKeywordSuggestions, fetchKeywordOverviewBatch, fetchSearchIntentBatch } from './keywords.js'

// --- Keyword Audit ---

/**
 * Compute composite score (0-100) for a keyword based on DataForSEO metrics.
 *
 * Null-safe (FR-INFRA-KPI-SCORING-NULLSAFE) : chaque KPI `null` produit une
 * composante `null` (exclue de la pondération), les poids restants sont
 * renormalisés. Si toutes les composantes sont `null`, le total est `null`
 * — jamais `0`, qui serait une vraie valeur basse trompeuse.
 */
export function computeCompositeScore(overview: KeywordOverview): KeywordCompositeScore {
  // Volume — log scale, cap à 10000 pour score=100. null préservé.
  const volumeNorm: number | null = overview.searchVolume === null
    ? null
    : overview.searchVolume > 0
      ? Math.min(100, (Math.log10(overview.searchVolume) / Math.log10(10000)) * 100)
      : 0

  // Difficulty — inversé (faible KD = score élevé). null préservé.
  const difficultyInverse: number | null = overview.difficulty === null
    ? null
    : 100 - Math.min(100, overview.difficulty)

  // CPC — log scale, cap à 5 EUR pour score=100. null préservé.
  const cpcNorm: number | null = overview.cpc === null
    ? null
    : overview.cpc > 0
      ? Math.min(100, (Math.log10(overview.cpc + 1) / Math.log10(6)) * 100)
      : 0

  // Competition — inversé (faible competition = score élevé). null préservé.
  const competitionInverse: number | null = overview.competition === null
    ? null
    : 100 - Math.min(100, overview.competition * 100)

  // Renormalisation : sommer poids des composantes effectives, exclure null.
  const components: Array<{ value: number; weight: number }> = []
  if (volumeNorm !== null) components.push({ value: volumeNorm, weight: KEYWORD_SCORE_WEIGHTS.volume })
  if (difficultyInverse !== null) components.push({ value: difficultyInverse, weight: KEYWORD_SCORE_WEIGHTS.difficultyInverse })
  if (cpcNorm !== null) components.push({ value: cpcNorm, weight: KEYWORD_SCORE_WEIGHTS.cpc })
  if (competitionInverse !== null) components.push({ value: competitionInverse, weight: KEYWORD_SCORE_WEIGHTS.competitionInverse })

  let total: number | null
  if (components.length === 0) {
    total = null
  } else {
    const weightSum = components.reduce((sum, c) => sum + c.weight, 0)
    const weighted = components.reduce((sum, c) => sum + c.value * c.weight, 0)
    total = Math.max(0, Math.min(100, Math.round(weighted / weightSum)))
  }

  return {
    volume: volumeNorm === null ? null : Math.round(volumeNorm),
    difficultyInverse: difficultyInverse === null ? null : Math.round(difficultyInverse),
    cpc: cpcNorm === null ? null : Math.round(cpcNorm),
    competitionInverse: competitionInverse === null ? null : Math.round(competitionInverse),
    total,
  }
}

/**
 * Generate alerts for a keyword based on its metrics.
 *
 * Null-safe (FR-INFRA-KPI-SCORING-NULLSAFE AC5) : `searchVolume === null` →
 * alerte `missing_metrics` (info), pas `zero_volume` (danger). Les seuils
 * `lowVolume` / `highDifficulty` ne s'appliquent qu'aux valeurs numériques.
 */
export function generateAlerts(overview: KeywordOverview): KeywordAlert[] {
  const alerts: KeywordAlert[] = []

  if (overview.searchVolume === null) {
    alerts.push({
      level: 'info',
      type: 'missing_metrics',
      message: 'Données KPI indisponibles — DataForSEO n\'a renvoyé aucun signal pour ce mot-clé',
    })
  } else if (overview.searchVolume === KEYWORD_AUDIT_THRESHOLDS.zeroVolume) {
    alerts.push({ level: 'danger', type: 'zero_volume', message: 'Aucun volume de recherche — ce mot-clé n\'existe pas' })
  } else if (overview.searchVolume < KEYWORD_AUDIT_THRESHOLDS.lowVolume) {
    alerts.push({ level: 'warning', type: 'low_volume', message: `Volume très faible (${overview.searchVolume}) — trafic limité` })
  }

  if (overview.difficulty !== null && overview.difficulty > KEYWORD_AUDIT_THRESHOLDS.highDifficulty) {
    alerts.push({ level: 'warning', type: 'high_difficulty', message: `Difficulté élevée (${overview.difficulty}/100) — concurrence forte` })
  }

  return alerts
}

/** Detect redundancy between keywords based on shared related keywords */
export function detectRedundancy(auditResults: KeywordAuditResult[]): RedundancyPair[] {
  const pairs: RedundancyPair[] = []
  for (let i = 0; i < auditResults.length; i++) {
    for (let j = i + 1; j < auditResults.length; j++) {
      const a = auditResults[i]
      const b = auditResults[j]
      const aRelated = new Set(a.relatedKeywords.filter(r => r.keyword).map(r => r.keyword.toLowerCase()))
      const bRelated = new Set(b.relatedKeywords.filter(r => r.keyword).map(r => r.keyword.toLowerCase()))
      if (aRelated.size === 0 || bRelated.size === 0) continue
      const shared = [...aRelated].filter(k => bRelated.has(k))
      const minSize = Math.min(aRelated.size, bRelated.size)
      const overlapPercent = Math.round((shared.length / minSize) * 100)
      if (overlapPercent >= KEYWORD_AUDIT_THRESHOLDS.redundancyOverlapPercent) {
        pairs.push({
          keyword1: a.keyword,
          keyword2: b.keyword,
          overlapPercent,
          sharedRelatedKeywords: shared.slice(0, 10),
        })
      }
    }
  }
  return pairs
}

/** Audit all keywords in a cocoon — batch fetch with fallback to sequential for related keywords */
export async function auditCocoonKeywords(
  keywords: Keyword[],
  forceRefresh = false,
): Promise<KeywordAuditResult[]> {
  log.info(`Auditing ${keywords.length} keywords${forceRefresh ? ' (force refresh)' : ''}`)

  const auditStart = Date.now()

  // Step 1: Separate cached vs stale keywords
  const cachedResults: KeywordAuditResult[] = []
  const staleKeywords: Keyword[] = []

  for (const kw of keywords) {
    if (!forceRefresh) {
      const cached = await readCache(kw.keyword)
      if (cached && isCacheFresh(cached.cachedAt)) {
        const score = computeCompositeScore(cached.keywordData)
        const alerts = generateAlerts(cached.keywordData)
        cachedResults.push({
          keyword: kw.keyword,
          type: kw.type,
          status: kw.status ?? 'suggested',
          cocoonName: kw.cocoonName,
          searchVolume: cached.keywordData.searchVolume,
          difficulty: cached.keywordData.difficulty,
          cpc: cached.keywordData.cpc,
          competition: cached.keywordData.competition,
          wordsCount: cached.keywordData.wordsCount,
          intent: (cached as DataForSeoCacheEntry & { intent?: string }).intent,
          intentProbability: (cached as DataForSeoCacheEntry & { intentProbability?: number }).intentProbability,
          compositeScore: score,
          relatedKeywords: cached.relatedKeywords,
          fromCache: true,
          cachedAt: cached.cachedAt,
          alerts,
        })
        continue
      }
    }
    staleKeywords.push(kw)
  }

  log.debug(`Audit cache check done`, { cached: cachedResults.length, stale: staleKeywords.length })
  if (staleKeywords.length === 0) {
    log.info(`Audit complete (all cached)`, { total: keywords.length, ms: Date.now() - auditStart })
    return cachedResults
  }

  // Step 2: Batch fetch keyword_overview + search_intent in parallel
  const staleKeywordStrings = staleKeywords.map(kw => kw.keyword)

  const [overviewMap, intentMap] = await Promise.all([
    fetchKeywordOverviewBatch(staleKeywordStrings),
    fetchSearchIntentBatch(staleKeywordStrings),
  ])

  // Step 3: Fetch related keywords individually (no batch endpoint available)
  const relatedMap = new Map<string, RelatedKeyword[]>()
  for (let i = 0; i < staleKeywords.length; i++) {
    const kw = staleKeywords[i]
    try {
      let related = await fetchRelatedKeywords(kw.keyword)
      if (related.length === 0) {
        related = await fetchKeywordSuggestions(kw.keyword)
      }
      relatedMap.set(kw.keyword.toLowerCase(), related)
    } catch (err) {
      log.warn(`Related keywords failed for "${kw.keyword}": ${(err as Error).message}`)
      relatedMap.set(kw.keyword.toLowerCase(), [])
    }

    // Delay between individual related keyword requests
    if (i < staleKeywords.length - 1) {
      await sleep(AUDIT_INTER_REQUEST_DELAY_MS)
    }
  }

  // Step 4: Merge results and write cache
  const freshResults: KeywordAuditResult[] = []
  for (const kw of staleKeywords) {
    const kwLower = kw.keyword.toLowerCase()
    // Si le keyword est absent du batch overview (rare), on fallback sur un
    // overview "tout null" — FR-INFRA-KPI-NULLABLE.
    const overview = overviewMap.get(kwLower) ?? { searchVolume: null, difficulty: null, cpc: null, competition: null, monthlySearches: [] as number[] }
    const intentData = intentMap.get(kwLower)
    const related = relatedMap.get(kwLower) ?? []

    // Update cache entry (merge with existing serp/paa if any)
    const existingCache = await readCache(kw.keyword)
    const cacheEntry: DataForSeoCacheEntry & { intent?: string; intentProbability?: number } = {
      keyword: kw.keyword,
      serp: existingCache?.serp ?? [],
      paa: existingCache?.paa ?? [],
      relatedKeywords: related,
      keywordData: overview,
      cachedAt: new Date().toISOString(),
      intent: intentData?.intent,
      intentProbability: intentData?.intentProbability,
    }
    await writeCache(cacheEntry as DataForSeoCacheEntry)

    const score = computeCompositeScore(overview)
    const alerts = generateAlerts(overview)

    freshResults.push({
      keyword: kw.keyword,
      type: kw.type,
      status: kw.status ?? 'suggested',
      cocoonName: kw.cocoonName,
      searchVolume: overview.searchVolume,
      difficulty: overview.difficulty,
      cpc: overview.cpc,
      competition: overview.competition,
      wordsCount: overview.wordsCount,
      intent: intentData?.intent,
      intentProbability: intentData?.intentProbability,
      compositeScore: score,
      relatedKeywords: related,
      fromCache: false,
      cachedAt: cacheEntry.cachedAt,
      alerts,
    })
  }

  log.info(`Audit complete`, { total: keywords.length, cached: cachedResults.length, fresh: freshResults.length, ms: Date.now() - auditStart })
  return [...cachedResults, ...freshResults]
}

/** Get audit cache status for a cocoon */
export async function getAuditCacheStatus(keywords: Keyword[]): Promise<AuditCacheStatus> {
  let cachedCount = 0
  let lastDate: string | null = null

  for (const kw of keywords) {
    const cached = await readCache(kw.keyword)
    if (cached && isCacheFresh(cached.cachedAt)) {
      cachedCount++
      if (!lastDate || cached.cachedAt > lastDate) {
        lastDate = cached.cachedAt
      }
    }
  }

  return {
    cocoonName: keywords[0]?.cocoonName ?? '',
    totalKeywords: keywords.length,
    cachedKeywords: cachedCount,
    lastAuditDate: lastDate,
  }
}
