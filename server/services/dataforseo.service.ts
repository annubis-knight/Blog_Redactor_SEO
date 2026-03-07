import { join } from 'path'
import { readJson, writeJson } from '../utils/json-storage.js'
import type {
  SerpResult,
  PaaQuestion,
  RelatedKeyword,
  KeywordOverview,
  DataForSeoCacheEntry,
} from '../../shared/types/index.js'

const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3'
const DEFAULT_LOCATION_CODE = 2250 // France
const DEFAULT_LANGUAGE_CODE = 'fr'
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

const CACHE_DIR = join(process.cwd(), 'data', 'cache')

// --- Auth ---

export function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) {
    throw new Error('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set in environment variables')
  }
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`
}

// --- Slugify ---

export function slugify(keyword: string): string {
  return keyword
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// --- Cache ---

function getCachePath(keyword: string): string {
  return join(CACHE_DIR, `${slugify(keyword)}.json`)
}

export async function readCache(keyword: string): Promise<DataForSeoCacheEntry | null> {
  try {
    return await readJson<DataForSeoCacheEntry>(getCachePath(keyword))
  } catch {
    return null
  }
}

async function writeCache(data: DataForSeoCacheEntry): Promise<void> {
  await writeJson(getCachePath(data.keyword), data)
}

// --- Retry with backoff ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchDataForSeo<T>(endpoint: string, body: unknown[]): Promise<T> {
  const url = `${DATAFORSEO_BASE_URL}${endpoint}`
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
      if (!json.tasks?.[0]?.result?.[0]) {
        throw new Error('DataForSEO: empty result')
      }
      return json.tasks[0].result[0] as T
    }

    // Retry only on 429 (rate limit) and 503 (service unavailable)
    if (response.status === 429 || response.status === 503) {
      lastError = new Error(`DataForSEO HTTP ${response.status}: ${response.statusText}`)
      continue
    }

    // Non-retryable errors
    throw new Error(`DataForSEO HTTP ${response.status}: ${response.statusText}`)
  }

  // All retries exhausted for retryable error
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
      search_volume: number
      competition: number
      cpc: number
    }
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

  return (result.items ?? []).map((item) => ({
    keyword: item.keyword_data.keyword,
    searchVolume: item.keyword_data.search_volume ?? 0,
    competition: item.keyword_data.competition ?? 0,
    cpc: item.keyword_data.cpc ?? 0,
  }))
}

interface KeywordRawResult {
  items: Array<{
    keyword: string
    search_volume: number
    keyword_difficulty: number
    cpc: number
    competition: number
    monthly_searches: Array<{ search_volume: number }>
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
  if (!item) throw new Error('DataForSEO: no keyword data returned')

  return {
    searchVolume: item.search_volume ?? 0,
    difficulty: item.keyword_difficulty ?? 0,
    cpc: item.cpc ?? 0,
    competition: item.competition ?? 0,
    monthlySearches: (item.monthly_searches ?? []).map((m) => m.search_volume ?? 0),
  }
}

// --- Orchestrator ---

export async function getBrief(keyword: string, forceRefresh = false): Promise<DataForSeoCacheEntry> {
  // Check cache first
  if (!forceRefresh) {
    const cached = await readCache(keyword)
    if (cached) return cached
  }

  // Fetch all 4 endpoints in parallel
  const [serp, paa, relatedKeywords, keywordData] = await Promise.all([
    fetchSerp(keyword),
    fetchPaa(keyword),
    fetchRelatedKeywords(keyword),
    fetchKeywordOverview(keyword),
  ])

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

  return entry
}
