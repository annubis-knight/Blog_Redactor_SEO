/**
 * Google Suggest multi-strategy keyword expansion.
 *
 * Ported from export/app/routers/suggest.py — 4 strategies:
 * 1. Alphabet expansion (seed + a-z) → 150-250 results
 * 2. Question prefixes (comment, pourquoi...) → 50-80 results
 * 3. Intent modifiers (prix, avis, gratuit...) → 100-200 results
 * 4. Prepositions (pour, avec, vs...) → 60-100 results
 */

import { log } from '../../utils/logger.js'
import { getCached, setCached, slugify } from '../../db/cache-helpers.js'

const SUGGEST_URL = 'https://suggestqueries.google.com/complete/search'
const MAX_CONCURRENT = 5
const CACHE_TTL_MS = 60 * 60 * 1000 // 1h

async function getOrFetch<T>(cacheType: string, key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await getCached<T>(cacheType, key)
  if (cached) { log.debug(`Cache HIT: ${key}`); return cached }
  log.debug(`Cache MISS: ${key}`)
  const data = await fetcher()
  await setCached(cacheType, key, data, ttlMs)
  return data
}

/**
 * Split a multi-word seed into sub-queries for better coverage.
 * "design emotionnel" → ["design emotionnel", "design", "emotionnel"]
 * Single-word seeds return just themselves.
 */
function seedVariants(keyword: string): string[] {
  const words = keyword.trim().split(/\s+/)
  if (words.length <= 1) return [keyword]
  // Full seed + individual words (skip words < 3 chars)
  return [keyword, ...words.filter(w => w.length >= 3)]
}

export interface SuggestItem {
  query: string
  source: string
}

// --- Language-specific word lists ---

const QUESTION_PREFIXES_FR = [
  'comment', 'pourquoi', 'quand', 'où', 'qui',
  'quel', 'quelle', 'est-ce que', 'combien',
]

const PREPOSITIONS_FR = [
  'pour', 'avec', 'sans', 'vs', 'et', 'ou', 'pas',
  'comme', 'contre', 'avant', 'après', 'entre',
]

const INTENT_MODIFIERS_FR = [
  'prix', 'avis', 'guide', 'gratuit', 'comparatif', 'meilleur',
  'alternative', 'formation', 'exemple', 'définition', 'outil',
  'logiciel', 'agence', 'freelance', 'débutant', 'avancé',
  '2025', '2026', 'en ligne', 'pdf',
]

// --- Core fetch ---

async function fetchSuggestions(query: string, language = 'fr', country = 'fr'): Promise<string[]> {
  const url = new URL(SUGGEST_URL)
  url.searchParams.set('client', 'firefox')
  url.searchParams.set('q', query)
  url.searchParams.set('hl', language)
  url.searchParams.set('gl', country)

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) {
      log.warn('Google Suggest HTTP error', { query, status: res.status })
      return []
    }

    const text = await res.text()
    try {
      const data = JSON.parse(text) as [string, string[]]
      return data[1] ?? []
    } catch (err) {
      log.warn('Google Suggest parse error', { query, error: (err as Error).message, responsePreview: text.slice(0, 100) })
      return []
    }
  } catch (err) {
    const message = (err as Error).message
    if (message.includes('abort') || message.includes('timeout')) {
      log.warn('Google Suggest timeout', { query })
    } else {
      log.error('Google Suggest fetch error', { query, error: message })
    }
    return []
  }
}

/** Run tasks with concurrency limit */
async function withConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = []
  let idx = 0

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results
}

// --- Strategy: Alphabet expansion ---

export async function suggestAlphabet(keyword: string, language = 'fr', country = 'fr'): Promise<SuggestItem[]> {
  return getOrFetch<SuggestItem[]>('suggest', `alphabet-${slugify(keyword)}`, CACHE_TTL_MS, async () => {
    const start = Date.now()
    const seen = new Set<string>()
    const results: SuggestItem[] = []

    const addResults = (suggestions: string[], source: string) => {
      for (const s of suggestions) {
        if (!seen.has(s)) {
          seen.add(s)
          results.push({ query: s, source })
        }
      }
    }

    const direct = await fetchSuggestions(keyword, language, country)
    addResults(direct, 'direct')

    const tasks = Array.from({ length: 26 }, (_, i) => {
      const letter = String.fromCharCode(97 + i)
      return async () => {
        const sug = await fetchSuggestions(`${keyword} ${letter}`, language, country)
        return { sug, source: `alphabet:${letter}` }
      }
    })

    const batchResults = await withConcurrency(tasks, MAX_CONCURRENT)
    for (const { sug, source } of batchResults) {
      addResults(sug, source)
    }

    log.info(`Suggest alphabet "${keyword}" — ${results.length} unique results`, { queries: 27, ms: Date.now() - start })
    return results
  })
}

// --- Strategy: Question prefixes ---

export async function suggestQuestions(keyword: string, language = 'fr', country = 'fr'): Promise<SuggestItem[]> {
  return getOrFetch<SuggestItem[]>('suggest', `questions-${slugify(keyword)}`, CACHE_TTL_MS, async () => {
    const start = Date.now()
    const seen = new Set<string>()
    const results: SuggestItem[] = []
    const prefixes = QUESTION_PREFIXES_FR
    const variants = seedVariants(keyword)

    const tasks = prefixes.flatMap(prefix =>
      variants.map(variant => async () => {
        const sug = await fetchSuggestions(`${prefix} ${variant}`, language, country)
        return { sug, source: `question:${prefix}` }
      }),
    )

    const batchResults = await withConcurrency(tasks, MAX_CONCURRENT)
    for (const { sug, source } of batchResults) {
      for (const s of sug) {
        if (!seen.has(s)) {
          seen.add(s)
          results.push({ query: s, source })
        }
      }
    }

    log.info(`Suggest questions "${keyword}" — ${results.length} unique results (${variants.length} variants × ${prefixes.length} prefixes)`, { queries: tasks.length, ms: Date.now() - start })
    return results
  })
}

// --- Strategy: Intent modifiers ---

export async function suggestIntents(keyword: string, language = 'fr', country = 'fr'): Promise<SuggestItem[]> {
  return getOrFetch<SuggestItem[]>('suggest', `intents-${slugify(keyword)}`, CACHE_TTL_MS, async () => {
    const start = Date.now()
    const seen = new Set<string>()
    const results: SuggestItem[] = []
    const modifiers = INTENT_MODIFIERS_FR
    const variants = seedVariants(keyword)

    const tasks = modifiers.flatMap(mod =>
      variants.map(variant => async () => {
        const sug = await fetchSuggestions(`${variant} ${mod}`, language, country)
        return { sug, source: `intent:${mod}` }
      }),
    )

    const batchResults = await withConcurrency(tasks, MAX_CONCURRENT)
    for (const { sug, source } of batchResults) {
      for (const s of sug) {
        if (!seen.has(s)) {
          seen.add(s)
          results.push({ query: s, source })
        }
      }
    }

    log.info(`Suggest intents "${keyword}" — ${results.length} unique results (${variants.length} variants × ${modifiers.length} modifiers)`, { queries: tasks.length, ms: Date.now() - start })
    return results
  })
}

// --- Strategy: Prepositions ---

export async function suggestPrepositions(keyword: string, language = 'fr', country = 'fr'): Promise<SuggestItem[]> {
  return getOrFetch<SuggestItem[]>('suggest', `prepositions-${slugify(keyword)}`, CACHE_TTL_MS, async () => {
    const start = Date.now()
    const seen = new Set<string>()
    const results: SuggestItem[] = []
    const preps = PREPOSITIONS_FR
    const variants = seedVariants(keyword)

    const tasks = preps.flatMap(prep =>
      variants.map(variant => async () => {
        const sug = await fetchSuggestions(`${variant} ${prep}`, language, country)
        return { sug, source: `preposition:${prep}` }
      }),
    )

    const batchResults = await withConcurrency(tasks, MAX_CONCURRENT)
    for (const { sug, source } of batchResults) {
      for (const s of sug) {
        if (!seen.has(s)) {
          seen.add(s)
          results.push({ query: s, source })
        }
      }
    }

    log.info(`Suggest prepositions "${keyword}" — ${results.length} unique results (${variants.length} variants × ${preps.length} preps)`, { queries: tasks.length, ms: Date.now() - start })
    return results
  })
}

// --- All-in-one: run all 4 strategies in parallel ---

export interface SuggestAllResult {
  alphabet: SuggestItem[]
  questions: SuggestItem[]
  intents: SuggestItem[]
  prepositions: SuggestItem[]
  totalUnique: number
}

export async function suggestAll(keyword: string, language = 'fr', country = 'fr'): Promise<SuggestAllResult> {
  const start = Date.now()

  const [alphabet, questions, intents, prepositions] = await Promise.all([
    suggestAlphabet(keyword, language, country),
    suggestQuestions(keyword, language, country),
    suggestIntents(keyword, language, country),
    suggestPrepositions(keyword, language, country),
  ])

  // Count unique across all strategies
  const allQueries = new Set<string>()
  for (const item of [...alphabet, ...questions, ...intents, ...prepositions]) {
    allQueries.add(item.query)
  }

  log.info(`Suggest all "${keyword}" — ${allQueries.size} total unique across 4 strategies`, {
    alphabet: alphabet.length,
    questions: questions.length,
    intents: intents.length,
    prepositions: prepositions.length,
    ms: Date.now() - start,
  })
  return { alphabet, questions, intents, prepositions, totalUnique: allQueries.size }
}
