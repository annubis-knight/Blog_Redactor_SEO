import { log } from '../../utils/logger.js'
import {
  getKeywordMetrics,
  upsertKeywordAutocomplete,
  isKeywordMetricsFresh,
} from './keyword-metrics.service.js'

// --- Types (local until Story 25.2 moves them to shared/types) ---

export interface AutocompleteSignal {
  suggestionsCount: number
  suggestions: string[]
  hasKeyword: boolean
  position: number | null
}

// Sprint 15.3 — Storage moved from api_cache[autocomplete] to the
// `keyword_metrics` table (cross-article, keyed by keyword + lang + country).
// Freshness: 1 day for non-empty, 30 min for empty (retry sooner).

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
  // Sprint 15.3 — DB-first on keyword_metrics (cross-article, keyed by lang+country).
  const existing = await getKeywordMetrics(keyword, lang, country)
  if (existing && existing.autocompleteSource) {
    const ttlDays = existing.autocompleteSuggestions.length === 0 ? 0.02 : 1 // 30 min vs 24 h
    if (isKeywordMetricsFresh(existing.fetchedAt, ttlDays)) {
      log.debug(`Autocomplete DB hit for "${keyword}" (${existing.autocompleteSuggestions.length} suggestions)`)
      const suggestions = existing.autocompleteSuggestions.map(s => s.text)
      const keywordLower = keyword.toLowerCase()
      const positionIndex = suggestions.findIndex(s => s.toLowerCase() === keywordLower)
      return {
        suggestionsCount: suggestions.length,
        suggestions,
        hasKeyword: positionIndex >= 0,
        position: positionIndex >= 0 ? positionIndex + 1 : null,
      }
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

    // Sprint 15.3 — persist in keyword_metrics.autocomplete_* instead of api_cache
    await upsertKeywordAutocomplete(
      keyword,
      signal.suggestions.map((text, idx) => ({ text, position: idx + 1 })),
      'google',
      lang,
      country,
    )

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
