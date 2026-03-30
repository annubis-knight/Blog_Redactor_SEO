import { join } from 'path'
import { log } from '../utils/logger.js'
import { slugify } from './dataforseo.service.js'
import { readCached, writeCached, isFresh } from '../utils/cache.js'

// --- Types (local until Story 25.2 moves them to shared/types) ---

export interface AutocompleteSignal {
  suggestionsCount: number
  suggestions: string[]
  hasKeyword: boolean
  position: number | null
}

// --- Cache ---

const CACHE_DIR = join(process.cwd(), 'data', 'cache', 'autocomplete')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h
const CACHE_TTL_EMPTY_MS = 30 * 60 * 1000 // 30min for empty results — retry sooner

// --- Empty signal ---

const EMPTY_SIGNAL: AutocompleteSignal = {
  suggestionsCount: 0,
  suggestions: [],
  hasKeyword: false,
  position: null,
}

// --- Rate limiting ---

let lastRequestTime = 0
const MIN_INTERVAL_MS = 1000 // 1 request per second

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function rateLimitWait(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed)
  }
  lastRequestTime = Date.now()
}

// --- Core function ---

/**
 * Fetch Google Autocomplete suggestions for a keyword.
 * Uses the unofficial Google Autocomplete endpoint.
 * Rate limited to 1 request/second.
 * Returns an empty signal on error (graceful degradation).
 */
export async function fetchAutocomplete(
  keyword: string,
  lang = 'fr',
  country = 'fr',
): Promise<AutocompleteSignal> {
  // Check cache first (dynamic TTL: 24h normal, 30min empty)
  const cached = await readCached<AutocompleteSignal>(CACHE_DIR, slugify(keyword))
  if (cached) {
    const ttl = cached.data.suggestionsCount === 0 ? CACHE_TTL_EMPTY_MS : CACHE_TTL_MS
    if (isFresh(cached.cachedAt, ttl)) {
      log.debug(`Autocomplete cache hit for "${keyword}" (${cached.data.suggestionsCount} suggestions)`)
      return cached.data
    }
  }

  log.info(`Fetching autocomplete for "${keyword}"`)

  try {
    // Rate limit
    await rateLimitWait()

    const url = `https://www.google.com/complete/search?q=${encodeURIComponent(keyword)}&client=chrome&hl=${lang}&gl=${country}`

    // Timeout 3s
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
    } finally {
      clearTimeout(timeoutId)
    }

    // Retry once on 429/503
    if (response.status === 429 || response.status === 503) {
      log.warn(`Autocomplete rate limited (${response.status}) for "${keyword}", retrying...`)
      await sleep(1500)
      lastRequestTime = Date.now()

      const retryController = new AbortController()
      const retryTimeoutId = setTimeout(() => retryController.abort(), 3000)
      try {
        response = await fetch(url, {
          signal: retryController.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
      } finally {
        clearTimeout(retryTimeoutId)
      }

      if (!response.ok) {
        log.warn(`Autocomplete retry failed (${response.status}) for "${keyword}"`)
        return { ...EMPTY_SIGNAL }
      }
    }

    if (!response.ok) {
      log.warn(`Autocomplete HTTP ${response.status} for "${keyword}"`)
      return { ...EMPTY_SIGNAL }
    }

    // Parse response: Google returns a JSON array [query, suggestions[], ...]
    const text = await response.text()
    const parsed = JSON.parse(text) as [string, string[], ...unknown[]]
    const suggestions = parsed[1] ?? []

    const keywordLower = keyword.toLowerCase()
    const positionIndex = suggestions.findIndex(s => s.toLowerCase() === keywordLower)

    const signal: AutocompleteSignal = {
      suggestionsCount: suggestions.length,
      suggestions,
      hasKeyword: positionIndex >= 0,
      position: positionIndex >= 0 ? positionIndex + 1 : null,
    }

    // Write to cache
    await writeCached(CACHE_DIR, slugify(keyword), signal)

    log.info(`Autocomplete done for "${keyword}"`, {
      count: signal.suggestionsCount,
      hasKeyword: signal.hasKeyword,
    })

    return signal
  } catch (err) {
    const message = (err as Error).message
    if (message.includes('abort')) {
      log.warn(`Autocomplete timeout for "${keyword}"`)
    } else {
      log.warn(`Autocomplete failed for "${keyword}": ${message}`)
    }
    return { ...EMPTY_SIGNAL }
  }
}
