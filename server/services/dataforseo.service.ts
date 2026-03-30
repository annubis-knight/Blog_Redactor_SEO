import { join } from 'path'
import { log } from '../utils/logger.js'
import { readJson, writeJson } from '../utils/json-storage.js'
import { slugify as cacheSlugify, readCached, writeCached, isFresh } from '../utils/cache.js'
import type {
  SerpResult,
  PaaQuestion,
  RelatedKeyword,
  KeywordOverview,
  DataForSeoCacheEntry,
  KeywordAuditResult,
  KeywordCompositeScore,
  KeywordAlert,
  RedundancyPair,
  AuditCacheStatus,
  Keyword,
} from '../../shared/types/index.js'
import {
  KEYWORD_SCORE_WEIGHTS,
  KEYWORD_AUDIT_THRESHOLDS,
  DEFAULT_MIN_REFRESH_HOURS,
} from '../../shared/constants/seo.constants.js'

const DEFAULT_LOCATION_CODE = 2250 // France
const DEFAULT_LANGUAGE_CODE = 'fr'
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000
const AUDIT_INTER_REQUEST_DELAY_MS = 200
const KEYWORD_OVERVIEW_BATCH_MAX = 700
const SEARCH_INTENT_BATCH_MAX = 1000

const CACHE_DIR = join(process.cwd(), 'data', 'cache')

// --- Sandbox / Production URL ---

/** Returns true when running against the DataForSEO sandbox */
export function isSandbox(): boolean {
  return process.env.DATAFORSEO_SANDBOX === 'true' ||
    (process.env.NODE_ENV === 'development' && process.env.DATAFORSEO_SANDBOX !== 'false')
}

/** Returns sandbox URL in dev mode (free & unlimited), production URL otherwise */
export function getBaseUrl(): string {
  return isSandbox()
    ? 'https://sandbox.dataforseo.com/v3'
    : 'https://api.dataforseo.com/v3'
}

// --- Auth ---

export function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) {
    throw new Error('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set in environment variables')
  }
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`
}

// --- Slugify (re-export from cache utility) ---

export { slugify } from '../utils/cache.js'

// --- Cache (using unified cache utility) ---

export async function readCache(keyword: string): Promise<DataForSeoCacheEntry | null> {
  const entry = await readCached<DataForSeoCacheEntry>(CACHE_DIR, cacheSlugify(keyword))
  return entry ? entry.data : null
}

async function writeCache(data: DataForSeoCacheEntry): Promise<void> {
  await writeCached(CACHE_DIR, cacheSlugify(data.keyword), data)
}

// --- Retry with backoff ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchDataForSeo<T>(endpoint: string, body: unknown[]): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`
  const auth = getAuthHeader()

  let lastError: Error | null = null

  log.debug(`DataForSEO request → ${endpoint}`)

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      log.warn(`DataForSEO retry ${attempt}/${MAX_RETRIES} for ${endpoint} (waiting ${delay}ms)`)
      await sleep(delay)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      const json = await response.json() as { status_code: number; tasks: Array<{ status_code: number; result: T[] }> }
      if (json.status_code !== 20000) {
        log.error(`DataForSEO API error status ${json.status_code} for ${endpoint}`)
        throw new Error(`DataForSEO error: status ${json.status_code}`)
      }
      if (!json.tasks?.[0]?.result?.[0]) {
        log.warn(`DataForSEO empty result for ${endpoint}`)
        throw new Error('DataForSEO: empty result')
      }
      log.debug(`DataForSEO response OK ← ${endpoint}`)
      return json.tasks[0].result[0] as T
    }

    // Retry only on 429 (rate limit) and 503 (service unavailable)
    if (response.status === 429 || response.status === 503) {
      lastError = new Error(`DataForSEO HTTP ${response.status}: ${response.statusText}`)
      continue
    }

    // Non-retryable errors
    log.error(`DataForSEO HTTP ${response.status} for ${endpoint}`)
    throw new Error(`DataForSEO HTTP ${response.status}: ${response.statusText}`)
  }

  // All retries exhausted for retryable error
  log.error(`DataForSEO max retries exceeded for ${endpoint}`)
  throw lastError ?? new Error('DataForSEO: max retries exceeded')
}

/** Variant that returns ALL result items instead of just the first one (for batch endpoints) */
async function fetchDataForSeoBatch<T>(endpoint: string, body: unknown[]): Promise<T[]> {
  const url = `${getBaseUrl()}${endpoint}`
  const auth = getAuthHeader()

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      await sleep(delay)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      const json = await response.json() as { status_code: number; tasks: Array<{ status_code: number; result: T[] }> }
      if (json.status_code !== 20000) {
        throw new Error(`DataForSEO error: status ${json.status_code}`)
      }
      return json.tasks?.[0]?.result ?? []
    }

    if (response.status === 429 || response.status === 503) {
      lastError = new Error(`DataForSEO HTTP ${response.status}: ${response.statusText}`)
      continue
    }

    throw new Error(`DataForSEO HTTP ${response.status}: ${response.statusText}`)
  }

  throw lastError ?? new Error('DataForSEO: max retries exceeded')
}

// --- Individual endpoint fetchers ---

interface SerpRawResult {
  items: Array<{
    type: string
    rank_group: number
    title: string
    url: string
    description: string
    domain: string
  }>
}

export async function fetchSerp(
  keyword: string,
  locationCode = DEFAULT_LOCATION_CODE,
  languageCode = DEFAULT_LANGUAGE_CODE,
): Promise<SerpResult[]> {
  const result = await fetchDataForSeo<SerpRawResult>(
    '/serp/google/organic/live/regular',
    [{ keyword, location_code: locationCode, language_code: languageCode }],
  )

  return (result.items ?? [])
    .filter((item) => item.type === 'organic')
    .slice(0, 10)
    .map((item) => ({
      position: item.rank_group,
      title: item.title ?? '',
      url: item.url ?? '',
      description: item.description ?? '',
      domain: item.domain ?? '',
    }))
}

interface PaaRawResult {
  items: Array<{
    type: string
    title: string
    expanded_element?: Array<{
      description?: string
    }>
  }>
}

export async function fetchPaa(
  keyword: string,
  locationCode = DEFAULT_LOCATION_CODE,
  languageCode = DEFAULT_LANGUAGE_CODE,
): Promise<PaaQuestion[]> {
  const result = await fetchDataForSeo<PaaRawResult>(
    '/serp/google/organic/live/advanced',
    [{ keyword, location_code: locationCode, language_code: languageCode }],
  )

  return (result.items ?? [])
    .filter((item) => item.type === 'people_also_ask')
    .map((item) => ({
      question: item.title ?? '',
      answer: item.expanded_element?.[0]?.description ?? null,
    }))
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

export async function fetchRelatedKeywords(
  keyword: string,
  locationCode = DEFAULT_LOCATION_CODE,
  languageCode = DEFAULT_LANGUAGE_CODE,
): Promise<RelatedKeyword[]> {
  const result = await fetchDataForSeo<RelatedRawResult>(
    '/dataforseo_labs/google/related_keywords/live',
    [{ keyword, location_code: locationCode, language_code: languageCode, depth: 2, limit: 50 }],
  )

  const firstItem = result.items?.[0]
  if (!firstItem?.related_keywords) return []

  return firstItem.related_keywords
    .filter((rk) => rk.keyword != null)
    .map((rk) => ({
      keyword: rk.keyword,
      searchVolume: rk.keyword_info?.search_volume ?? 0,
      competition: rk.keyword_info?.competition ?? 0,
      cpc: rk.keyword_info?.cpc ?? 0,
    }))
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
  const result = await fetchDataForSeo<SuggestionRawResult>(
    '/dataforseo_labs/google/keyword_suggestions/live',
    [{ keyword, location_code: locationCode, language_code: languageCode, limit }],
  )

  if (!result.items) return []

  return result.items
    .filter((item) => item.keyword != null)
    .map((item) => ({
      keyword: item.keyword,
      searchVolume: item.keyword_info?.search_volume ?? 0,
      competition: item.keyword_info?.competition ?? 0,
      cpc: item.keyword_info?.cpc ?? 0,
    }))
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
  const result = await fetchDataForSeo<KeywordRawResult>(
    '/dataforseo_labs/google/keyword_overview/live',
    [{ keywords: [keyword], location_code: locationCode, language_code: languageCode }],
  )

  const item = result.items?.[0]
  if (!item) {
    log.warn(`No keyword data for "${keyword}", using defaults`)
    return { searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, monthlySearches: [] }
  }

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

  for (const chunk of chunks) {
    try {
      const rawResults = await fetchDataForSeoBatch<{ items: KeywordOverviewBatchItem[] | null }>(
        '/dataforseo_labs/google/keyword_overview/live',
        [{ keywords: chunk, location_code: locationCode, language_code: languageCode }],
      )
      // API returns result[0].items — unwrap the wrapper
      const items = rawResults.flatMap(r => r.items ?? [])

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

  for (const chunk of chunks) {
    try {
      const rawResults = await fetchDataForSeoBatch<{ items: SearchIntentItem[] | null }>(
        '/dataforseo_labs/google/search_intent/live',
        [{ keywords: chunk, language_code: languageCode }],
      )
      // API returns result[0].items — unwrap the wrapper
      const items = rawResults.flatMap(r => r.items ?? [])

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

  return result
}

// --- Orchestrator ---

export async function getBrief(keyword: string, forceRefresh = false): Promise<DataForSeoCacheEntry & { fromCache: boolean }> {
  // Check cache first
  if (!forceRefresh) {
    const cached = await readCache(keyword)
    if (cached) {
      log.debug(`Cache hit for "${keyword}"`)
      return { ...cached, fromCache: true }
    }
  }

  log.info(`Fetching SEO brief for "${keyword}"${forceRefresh ? ' (force refresh)' : ''}`)

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
  const keywordData = keywordResult.status === 'fulfilled'
    ? keywordResult.value
    : { searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, monthlySearches: [] as number[] }

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

  // Write to cache
  await writeCache(entry)

  log.info(`SEO brief done for "${keyword}"`, {
    serp: serp.length,
    paa: paa.length,
    related: relatedKeywords.length,
    volume: keywordData.searchVolume,
  })

  return { ...entry, fromCache: false }
}

// --- Keyword Audit ---

/** Get minimum refresh hours from env or default */
export function getMinRefreshHours(): number {
  const envVal = process.env.DATAFORSEO_MIN_REFRESH_HOURS
  if (envVal !== undefined) return Number(envVal)
  if (process.env.NODE_ENV === 'development') return 0
  return DEFAULT_MIN_REFRESH_HOURS
}

/** Check if cache is still fresh enough based on min refresh hours */
export function isCacheFresh(cachedAt: string): boolean {
  const minHours = getMinRefreshHours()
  return isFresh(cachedAt, minHours * 60 * 60 * 1000)
}

/** Compute composite score (0-100) for a keyword based on DataForSEO metrics */
export function computeCompositeScore(overview: KeywordOverview): KeywordCompositeScore {
  // Normalize volume: log scale, cap at 10000 for score=100
  const volumeNorm = overview.searchVolume > 0
    ? Math.min(100, (Math.log10(overview.searchVolume) / Math.log10(10000)) * 100)
    : 0

  // Difficulty: invert (low difficulty = high score)
  const difficultyInverse = 100 - Math.min(100, overview.difficulty)

  // CPC: log scale, cap at 5 EUR for score=100
  const cpcNorm = overview.cpc > 0
    ? Math.min(100, (Math.log10(overview.cpc + 1) / Math.log10(6)) * 100)
    : 0

  // Competition: invert (low competition = high score)
  const competitionInverse = 100 - Math.min(100, overview.competition * 100)

  const total = Math.round(
    volumeNorm * KEYWORD_SCORE_WEIGHTS.volume +
    difficultyInverse * KEYWORD_SCORE_WEIGHTS.difficultyInverse +
    cpcNorm * KEYWORD_SCORE_WEIGHTS.cpc +
    competitionInverse * KEYWORD_SCORE_WEIGHTS.competitionInverse
  )

  return {
    volume: Math.round(volumeNorm),
    difficultyInverse: Math.round(difficultyInverse),
    cpc: Math.round(cpcNorm),
    competitionInverse: Math.round(competitionInverse),
    total: Math.max(0, Math.min(100, total)),
  }
}

/** Generate alerts for a keyword based on its metrics */
export function generateAlerts(overview: KeywordOverview): KeywordAlert[] {
  const alerts: KeywordAlert[] = []
  if (overview.searchVolume === KEYWORD_AUDIT_THRESHOLDS.zeroVolume) {
    alerts.push({ level: 'danger', type: 'zero_volume', message: 'Aucun volume de recherche — ce mot-clé n\'existe pas' })
  } else if (overview.searchVolume < KEYWORD_AUDIT_THRESHOLDS.lowVolume) {
    alerts.push({ level: 'warning', type: 'low_volume', message: `Volume très faible (${overview.searchVolume}) — trafic limité` })
  }
  if (overview.difficulty > KEYWORD_AUDIT_THRESHOLDS.highDifficulty) {
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

  if (staleKeywords.length === 0) return cachedResults

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
    const overview = overviewMap.get(kwLower) ?? { searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, monthlySearches: [] as number[] }
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
