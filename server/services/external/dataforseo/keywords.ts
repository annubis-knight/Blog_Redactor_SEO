import { log } from '../../../utils/logger.js'
import type { RelatedKeyword, KeywordOverview } from '../../../../shared/types/index.js'
import {
  DEFAULT_LOCATION_CODE,
  DEFAULT_LANGUAGE_CODE,
  KEYWORD_OVERVIEW_BATCH_MAX,
  SEARCH_INTENT_BATCH_MAX,
  fetchDataForSeo,
  fetchDataForSeoBatch,
} from './_client.js'

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

export async function fetchRelatedKeywords(
  keyword: string,
  locationCode = DEFAULT_LOCATION_CODE,
  languageCode = DEFAULT_LANGUAGE_CODE,
): Promise<RelatedKeyword[]> {
  log.debug(`fetchRelatedKeywords start`, { keyword, locationCode, languageCode })
  const result = await fetchDataForSeo<RelatedRawResult>(
    '/dataforseo_labs/google/related_keywords/live',
    [{ keyword, location_code: locationCode, language_code: languageCode, depth: 2, limit: 50 }],
  )

  const firstItem = result.items?.[0]
  if (!firstItem?.related_keywords) {
    log.debug(`fetchRelatedKeywords done — no related keywords`, { keyword })
    return []
  }

  const related = firstItem.related_keywords
    .filter((rk) => rk.keyword != null)
    .map((rk) => ({
      keyword: rk.keyword,
      searchVolume: rk.keyword_info?.search_volume ?? 0,
      competition: rk.keyword_info?.competition ?? 0,
      cpc: rk.keyword_info?.cpc ?? 0,
    }))
  log.debug(`fetchRelatedKeywords done`, { keyword, relatedCount: related.length })
  return related
}

// --- Keyword Suggestions (fallback when relatedKeywords is empty) ---

interface SuggestionRawResult {
  items: Array<{
    keyword: string
    keyword_info: {
      search_volume: number | null
      competition: number | null
      cpc: number | null
    }
  }> | null
}

export async function fetchKeywordSuggestions(
  keyword: string,
  locationCode = DEFAULT_LOCATION_CODE,
  languageCode = DEFAULT_LANGUAGE_CODE,
  limit = 20,
): Promise<RelatedKeyword[]> {
  log.debug(`fetchKeywordSuggestions start`, { keyword, locationCode, languageCode, limit })
  const result = await fetchDataForSeo<SuggestionRawResult>(
    '/dataforseo_labs/google/keyword_suggestions/live',
    [{ keyword, location_code: locationCode, language_code: languageCode, limit }],
  )

  if (!result.items) {
    log.debug(`fetchKeywordSuggestions done — no items`, { keyword })
    return []
  }

  const suggestions = result.items
    .filter((item) => item.keyword != null)
    .map((item) => ({
      keyword: item.keyword,
      searchVolume: item.keyword_info?.search_volume ?? 0,
      competition: item.keyword_info?.competition ?? 0,
      cpc: item.keyword_info?.cpc ?? 0,
    }))
  log.debug(`fetchKeywordSuggestions done`, { keyword, suggestionsCount: suggestions.length })
  return suggestions
}

interface KeywordRawResult {
  items: Array<{
    keyword: string
    keyword_info: {
      search_volume: number | null
      cpc: number | null
      competition: number | null
      monthly_searches: Array<{ search_volume: number }> | null
    }
    keyword_properties: {
      keyword_difficulty: number | null
      words_count?: number | null
      core_keyword?: string | null
    }
  }>
}

export async function fetchKeywordOverview(
  keyword: string,
  locationCode = DEFAULT_LOCATION_CODE,
  languageCode = DEFAULT_LANGUAGE_CODE,
): Promise<KeywordOverview> {
  log.debug(`fetchKeywordOverview start`, { keyword, locationCode, languageCode })
  const result = await fetchDataForSeo<KeywordRawResult>(
    '/dataforseo_labs/google/keyword_overview/live',
    [{ keywords: [keyword], location_code: locationCode, language_code: languageCode }],
  )

  const item = result.items?.[0]
  if (!item) {
    log.warn(`No keyword data for "${keyword}", using defaults`)
    return { searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, monthlySearches: [] }
  }

  log.debug(`fetchKeywordOverview done`, { keyword, volume: item.keyword_info?.search_volume, difficulty: item.keyword_properties?.keyword_difficulty })
  return {
    searchVolume: item.keyword_info?.search_volume ?? 0,
    difficulty: item.keyword_properties?.keyword_difficulty ?? 0,
    cpc: item.keyword_info?.cpc ?? 0,
    competition: item.keyword_info?.competition ?? 0,
    monthlySearches: (item.keyword_info?.monthly_searches ?? []).map((m) => m.search_volume ?? 0),
    wordsCount: item.keyword_properties?.words_count ?? undefined,
    coreKeyword: item.keyword_properties?.core_keyword ?? undefined,
  }
}

// --- Batch endpoints (Task 2 & 3) ---

interface KeywordOverviewBatchItem {
  keyword: string
  keyword_info: {
    search_volume: number | null
    cpc: number | null
    competition: number | null
    monthly_searches: Array<{ search_volume: number }> | null
  }
  keyword_properties: {
    keyword_difficulty: number | null
    words_count?: number | null
    core_keyword?: string | null
  }
}

/** Fetch keyword overview for up to 700 keywords in a single API call. Chunks automatically if > 700. */
export async function fetchKeywordOverviewBatch(
  keywords: string[],
  locationCode = DEFAULT_LOCATION_CODE,
  languageCode = DEFAULT_LANGUAGE_CODE,
): Promise<Map<string, KeywordOverview>> {
  const result = new Map<string, KeywordOverview>()
  if (keywords.length === 0) return result

  // Chunk into batches of max 700
  const chunks: string[][] = []
  for (let i = 0; i < keywords.length; i += KEYWORD_OVERVIEW_BATCH_MAX) {
    chunks.push(keywords.slice(i, i + KEYWORD_OVERVIEW_BATCH_MAX))
  }

  log.info(`fetchKeywordOverviewBatch start`, { totalKeywords: keywords.length, chunks: chunks.length, locationCode, languageCode })
  const batchStart = Date.now()

  for (const chunk of chunks) {
    try {
      const start = Date.now()
      const rawResults = await fetchDataForSeoBatch<{ items: KeywordOverviewBatchItem[] | null }>(
        '/dataforseo_labs/google/keyword_overview/live',
        [{ keywords: chunk, location_code: locationCode, language_code: languageCode }],
      )
      // API returns result[0].items — unwrap the wrapper
      const items = rawResults.flatMap(r => r.items ?? [])
      log.debug(`fetchKeywordOverviewBatch chunk done`, { chunkSize: chunk.length, itemsReturned: items.length, ms: Date.now() - start })

      for (const item of items) {
        if (!item?.keyword) continue
        const kwLower = item.keyword.toLowerCase()
        result.set(kwLower, {
          searchVolume: item.keyword_info?.search_volume ?? 0,
          difficulty: item.keyword_properties?.keyword_difficulty ?? 0,
          cpc: item.keyword_info?.cpc ?? 0,
          competition: item.keyword_info?.competition ?? 0,
          monthlySearches: (item.keyword_info?.monthly_searches ?? []).map((m) => m.search_volume ?? 0),
          wordsCount: item.keyword_properties?.words_count ?? undefined,
          coreKeyword: item.keyword_properties?.core_keyword ?? undefined,
        })
      }
    } catch (err) {
      log.warn(`Batch keyword overview failed for ${chunk.length} keywords: ${(err as Error).message}`)
    }
  }

  log.info(`fetchKeywordOverviewBatch done`, { totalKeywords: keywords.length, resultsReturned: result.size, ms: Date.now() - batchStart })
  return result
}

interface SearchIntentItem {
  keyword: string
  keyword_intent: {
    label: string
    probability: number
  } | null
}

/** Fetch search intent for up to 1000 keywords in a single API call. Chunks automatically if > 1000. */
export async function fetchSearchIntentBatch(
  keywords: string[],
  languageCode = DEFAULT_LANGUAGE_CODE,
): Promise<Map<string, { intent: string; intentProbability: number }>> {
  const result = new Map<string, { intent: string; intentProbability: number }>()
  if (keywords.length === 0) return result

  // Chunk into batches of max 1000
  const chunks: string[][] = []
  for (let i = 0; i < keywords.length; i += SEARCH_INTENT_BATCH_MAX) {
    chunks.push(keywords.slice(i, i + SEARCH_INTENT_BATCH_MAX))
  }

  log.info(`fetchSearchIntentBatch start`, { totalKeywords: keywords.length, chunks: chunks.length, languageCode })
  const batchStart = Date.now()

  for (const chunk of chunks) {
    try {
      const start = Date.now()
      const rawResults = await fetchDataForSeoBatch<{ items: SearchIntentItem[] | null }>(
        '/dataforseo_labs/google/search_intent/live',
        [{ keywords: chunk, language_code: languageCode }],
      )
      // API returns result[0].items — unwrap the wrapper
      const items = rawResults.flatMap(r => r.items ?? [])
      log.debug(`fetchSearchIntentBatch chunk done`, { chunkSize: chunk.length, itemsReturned: items.length, ms: Date.now() - start })

      for (const item of items) {
        if (!item?.keyword || !item.keyword_intent) continue
        const kwLower = item.keyword.toLowerCase()
        result.set(kwLower, {
          intent: item.keyword_intent.label,
          intentProbability: item.keyword_intent.probability,
        })
      }
    } catch (err) {
      log.warn(`Batch search intent failed for ${chunk.length} keywords: ${(err as Error).message}`)
    }
  }

  log.info(`fetchSearchIntentBatch done`, { totalKeywords: keywords.length, resultsReturned: result.size, ms: Date.now() - batchStart })
  return result
}
