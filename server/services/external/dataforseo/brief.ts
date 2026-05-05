import { log } from '../../../utils/logger.js'
import type { DataForSeoCacheEntry } from '../../../../shared/types/index.js'
import { readCache, writeCache } from './cache.js'
import { fetchSerp, fetchPaa } from './serp.js'
import { fetchRelatedKeywords, fetchKeywordOverview } from './keywords.js'

// --- Orchestrator ---

export async function getBrief(keyword: string, forceRefresh = false): Promise<DataForSeoCacheEntry & { fromCache: boolean }> {
  // Sprint 15.8 — check keyword_metrics first (cross-article DB).
  if (!forceRefresh) {
    const { getKeywordMetrics, isKeywordMetricsFresh } = await import('../../keyword/keyword-metrics.service.js')
    const metrics = await getKeywordMetrics(keyword)
    if (metrics && isKeywordMetricsFresh(metrics.fetchedAt) && metrics.searchVolume !== null) {
      log.debug(`DB-first hit for brief "${keyword}"`)
      // Rebuild a minimal DataForSeoCacheEntry from keyword_metrics (shape matches PaaQuestion[]).
      return {
        keyword,
        serp: (metrics.serpRawJson as any)?.competitors ?? [],
        paa: metrics.paaQuestions.map(q => ({ question: q.question, answer: q.answer ?? null })),
        relatedKeywords: [],
        // Adapter DataForSEO brief — FR-INFRA-KPI-NULLABLE : null propagé tel
        // quel depuis keyword_metrics jusqu'au consommateur.
        keywordData: {
          searchVolume: metrics.searchVolume,
          difficulty: metrics.keywordDifficulty,
          cpc: metrics.cpc,
          competition: metrics.competition,
          monthlySearches: [],
        },
         
        cachedAt: metrics.fetchedAt,
        fromCache: true,
      }
    }
    // Legacy fallback: old api_cache[dataforseo] entries still readable.
    const cached = await readCache(keyword)
    if (cached) {
      log.debug(`Legacy api_cache hit for "${keyword}"`)
      return { ...cached, fromCache: true }
    }
  }

  log.info(`Fetching SEO brief for "${keyword}"${forceRefresh ? ' (force refresh)' : ''}`)

  const briefStart = Date.now()

  // Fetch all 4 endpoints in parallel — graceful degradation on individual failures
  const [serpResult, paaResult, relatedResult, keywordResult] = await Promise.allSettled([
    fetchSerp(keyword),
    fetchPaa(keyword),
    fetchRelatedKeywords(keyword),
    fetchKeywordOverview(keyword),
  ])

  const serp = serpResult.status === 'fulfilled' ? serpResult.value : []
  const paa = paaResult.status === 'fulfilled' ? paaResult.value : []
  const relatedKeywords = relatedResult.status === 'fulfilled' ? relatedResult.value : []
  // FR-INFRA-KPI-NULLABLE : si l'appel échoue, on retourne null sur tous les
  // KPIs (la donnée n'est pas "0", elle est absente).
  const keywordData = keywordResult.status === 'fulfilled'
    ? keywordResult.value
    : { searchVolume: null, difficulty: null, cpc: null, competition: null, monthlySearches: [] as number[] }

  // Log failures without crashing
  if (serpResult.status === 'rejected') log.warn(`SERP failed for "${keyword}": ${serpResult.reason?.message}`)
  if (paaResult.status === 'rejected') log.warn(`PAA failed for "${keyword}": ${paaResult.reason?.message}`)
  if (relatedResult.status === 'rejected') log.warn(`Related keywords failed for "${keyword}": ${relatedResult.reason?.message}`)
  if (keywordResult.status === 'rejected') log.warn(`Keyword overview failed for "${keyword}": ${keywordResult.reason?.message}`)

  const entry: DataForSeoCacheEntry = {
    keyword,
    serp,
    paa,
    relatedKeywords,
    keywordData,
    cachedAt: new Date().toISOString(),
  }

  // Sprint 15.8 — mirror the brief into keyword_metrics so other workflows benefit.
  try {
    const { upsertKeywordKpis, upsertKeywordPaa } = await import('../../keyword/keyword-metrics.service.js')
    await upsertKeywordKpis(keyword, {
      searchVolume: keywordData.searchVolume,
      keywordDifficulty: keywordData.difficulty,
      cpc: keywordData.cpc,
      competition: keywordData.competition,
    })
    if (paa.length > 0) {
      // paa already has shape { question, answer } from dataforseo.types.PaaQuestion
      await upsertKeywordPaa(keyword, paa.map(q => ({ question: q.question, answer: q.answer })))
    }
  } catch (err) {
    log.warn(`brief: DB-first persist failed — ${(err as Error).message}`)
  }

  // Keep the legacy api_cache write for now (will be removed in Sprint 15.10).
  await writeCache(entry)

  log.info(`SEO brief done for "${keyword}"`, {
    ms: Date.now() - briefStart,
    serp: serp.length,
    paa: paa.length,
    related: relatedKeywords.length,
    volume: keywordData.searchVolume,
  })

  return { ...entry, fromCache: false }
}
