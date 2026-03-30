import { log } from '../utils/logger.js'
import { fetchAutocomplete, type AutocompleteSignal } from './autocomplete.service.js'
import { fetchDataForSeo, fetchKeywordOverview } from './dataforseo.service.js'
import { computeSemanticScores } from './embedding.service.js'
import type { IntentScanResult, ResonanceItem, ResonanceMatch } from '../../shared/types/intent.types.js'

export interface SerpAdvancedRawResult {
  items: Array<{
    type: string
    title?: string
    question?: string
    items?: Array<{
      title?: string
      question?: string
      expanded_element?: Array<{ description?: string }>
    }>
  }>
}

/**
 * Fetch SERP Advanced (includes PAA, featured snippets, etc.)
 * Uses /serp/google/organic/live/advanced which returns all SERP modules.
 */
export async function fetchSerpAdvanced(keyword: string): Promise<SerpAdvancedRawResult | null> {
  try {
    return await fetchDataForSeo<SerpAdvancedRawResult>(
      '/serp/google/organic/live/advanced',
      [{ keyword, location_code: 2250, language_code: 'fr' }],
    )
  } catch (err) {
    log.warn(`SERP Advanced fetch failed for "${keyword}": ${(err as Error).message}`)
    return null
  }
}

/**
 * Normalize a string for fuzzy matching:
 * lowercase, strip accents, collapse whitespace.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** French stop words to ignore in matching */
export const STOP_WORDS = new Set([
  'les', 'des', 'une', 'pour', 'dans', 'avec', 'sur', 'par', 'pas', 'son', 'ses',
  'est', 'sont', 'qui', 'que', 'quel', 'quelle', 'quels', 'quelles', 'comment',
  'pourquoi', 'quand', 'plus', 'mon', 'ton', 'nos', 'vos', 'aux', 'ces', 'cet',
  'cette', 'tout', 'tous', 'toute', 'toutes', 'etre', 'avoir', 'faire',
])

/**
 * Simple French stemmer: strips common suffixes to normalize morphological variants.
 * "croissance" → "croiss", "développement" → "developp", "stratégies" → "strateg"
 */
export function stemFrench(word: string): string {
  if (word.length <= 3) return word

  // Ordered longest-first to match most specific suffix
  const suffixes = [
    'issements', 'issement', 'alisations', 'alisation', 'ifications', 'ification',
    'issantes', 'issante', 'issants', 'issant', 'issaient',
    'ements', 'ement', 'ations', 'ation', 'ances', 'ance', 'ences', 'ence',
    'ments', 'ment', 'ibles', 'ible', 'ables', 'able', 'iques', 'ique',
    'euses', 'euse', 'eurs', 'eur', 'ions', 'ion', 'ites', 'ite',
    'ants', 'ant', 'ents', 'ent', 'eaux', 'aux',
    'ees', 'ee', 'ies', 'ie', 'er', 'ir', 're',
    'fs', 'if', 'es', 's', 'e',
  ]

  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length)
    }
  }
  return word
}

/**
 * Check if two words match via their stems.
 * Handles exact stem match + substring match on stems (min 4 chars).
 */
export function stemsMatch(a: string, b: string): boolean {
  if (a === b) return true
  const stemA = stemFrench(a)
  const stemB = stemFrench(b)
  if (stemA === stemB) return true
  if (stemA.length >= 4 && stemB.length >= 4) {
    if (stemA.includes(stemB) || stemB.includes(stemA)) return true
  }
  return false
}

/**
 * Return the strongest match between two resonance levels.
 */
export function bestMatch(a: ResonanceMatch, b: ResonanceMatch): ResonanceMatch {
  const rank: Record<ResonanceMatch, number> = { total: 2, partial: 1, none: 0 }
  return rank[a] >= rank[b] ? a : b
}

/**
 * Extract meaningful words from a topic, filtering stop words and short words.
 */
export function extractTopicWords(topic: string): string[] {
  return normalize(topic)
    .split(' ')
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

/**
 * Determine how well a PAA/Autocomplete text matches the specific article topic.
 * Uses bidirectional stem-based matching: stems both sides to catch morphological
 * variants (croissance/croissant, développement/développer, stratégie/stratégies).
 */
export function matchResonance(text: string, topicWords: string[]): ResonanceMatch {
  if (!text || topicWords.length === 0) return 'none'

  const norm = normalize(text)
  const textWords = norm.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w))

  if (textWords.length === 0) return 'none'

  // Stem-based bidirectional matching
  const topicHits = topicWords.filter(tw =>
    textWords.some(xw => stemsMatch(tw, xw)),
  )
  const topicRatio = topicHits.length / topicWords.length

  const textHits = textWords.filter(xw =>
    topicWords.some(tw => stemsMatch(xw, tw)),
  )
  const textRatio = textHits.length / textWords.length

  const combined = (topicRatio + textRatio) / 2

  if (combined >= 0.5) return 'total'
  if (combined >= 0.2) return 'partial'
  return 'none'
}

/**
 * Detailed resonance matching that differentiates exact word matches from stem-based matches.
 * Exact matches (same normalized words) rank higher than stem matches (morphological variants).
 */
export function matchResonanceDetailed(
  text: string,
  topicWords: string[],
): { match: ResonanceMatch; quality: 'exact' | 'stem' } {
  if (!text || topicWords.length === 0) return { match: 'none', quality: 'stem' }

  const norm = normalize(text)
  const textWords = norm.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w))
  if (textWords.length === 0) return { match: 'none', quality: 'stem' }

  // Phase 1: Exact word matching (no stemming)
  const exactTopicHits = topicWords.filter(tw => textWords.includes(tw))
  const exactTextHits = textWords.filter(xw => topicWords.includes(xw))
  const exactCombined = (exactTopicHits.length / topicWords.length + exactTextHits.length / textWords.length) / 2

  if (exactCombined >= 0.5) return { match: 'total', quality: 'exact' }
  if (exactCombined >= 0.2) return { match: 'partial', quality: 'exact' }

  // Phase 2: Stem-based matching (morphological variants)
  const stemTopicHits = topicWords.filter(tw => textWords.some(xw => stemsMatch(tw, xw)))
  const stemTextHits = textWords.filter(xw => topicWords.some(tw => stemsMatch(xw, tw)))
  const stemCombined = (stemTopicHits.length / topicWords.length + stemTextHits.length / textWords.length) / 2

  if (stemCombined >= 0.5) return { match: 'total', quality: 'stem' }
  if (stemCombined >= 0.2) return { match: 'partial', quality: 'stem' }

  return { match: 'none', quality: 'stem' }
}

export interface PaaExtracted {
  question: string
  answer: string | undefined
}

/**
 * Extract PAA questions + answer snippets from a raw SERP result.
 */
export function extractPaaFromSerp(serpResult: SerpAdvancedRawResult | null): PaaExtracted[] {
  if (!serpResult?.items) return []

  const results: PaaExtracted[] = []
  for (const item of serpResult.items) {
    if (item.type === 'people_also_ask' && Array.isArray(item.items)) {
      for (const paaItem of item.items) {
        const question = paaItem.title ?? paaItem.question ?? ''
        const answer = paaItem.expanded_element?.[0]?.description
        if (question) results.push({ question, answer })
      }
    }
  }
  return results
}

/**
 * Crawl PAA questions recursively up to maxDepth levels.
 * Level 1: PAA from the broad keyword SERP (~4 questions, 1 API call)
 * Level 2: PAA from each L1 question (~16 more, +4 API calls)
 * Deduplicates questions across levels.
 */
async function crawlPaaDeep(
  broadKeyword: string,
  maxDepth: number,
): Promise<{ questions: Array<{ text: string; answer?: string; depth: number; parent?: string }> }> {
  const serpResult = await fetchSerpAdvanced(broadKeyword)
  const level1Paa = extractPaaFromSerp(serpResult)

  const allQuestions: Array<{ text: string; answer?: string; depth: number; parent?: string }> = []
  const seen = new Set<string>()

  for (const paa of level1Paa) {
    const key = normalize(paa.question)
    if (!seen.has(key)) {
      seen.add(key)
      allQuestions.push({ text: paa.question, answer: paa.answer, depth: 1 })
    }
  }

  log.info(`PAA level 1 for "${broadKeyword}": ${level1Paa.length} questions`)

  if (maxDepth >= 2 && level1Paa.length > 0) {
    log.info(`PAA level 2: crawling ${level1Paa.length} sub-queries...`)

    const level2Results = await Promise.allSettled(
      level1Paa.map(async (parentPaa) => {
        const subSerp = await fetchSerpAdvanced(parentPaa.question)
        return { parentQ: parentPaa.question, paaItems: extractPaaFromSerp(subSerp) }
      }),
    )

    for (const r of level2Results) {
      if (r.status === 'fulfilled') {
        for (const paa of r.value.paaItems) {
          const key = normalize(paa.question)
          if (!seen.has(key)) {
            seen.add(key)
            allQuestions.push({ text: paa.question, answer: paa.answer, depth: 2, parent: r.value.parentQ })
          }
        }
      }
    }

    log.info(`PAA level 2 done: ${allQuestions.filter((q: { depth: number }) => q.depth === 2).length} new questions`)
  }

  return { questions: allQuestions }
}

/**
 * Compute resonance score (0-100) from items.
 */
function computeResonanceScore(items: ResonanceItem[]): number {
  const autoItems = items.filter(i => i.source === 'autocomplete')
  let autoScore = 0
  if (autoItems.length > 0) {
    const matchingAuto = autoItems.filter(i => i.match !== 'none')
    if (matchingAuto.length > 0) {
      const bestPos = Math.min(...matchingAuto.map(i => i.position ?? 10))
      autoScore = Math.max(0, 110 - bestPos * 10)
    }
  }

  const paaItems = items.filter(i => i.source === 'paa')
  let paaScore = 0
  if (paaItems.length > 0) {
    const totalMatches = paaItems.filter(i => i.match === 'total').length
    const partialMatches = paaItems.filter(i => i.match === 'partial').length
    paaScore = Math.min(100, totalMatches * 15 + partialMatches * 7)
  }

  return Math.round(autoScore * 0.4 + paaScore * 0.6)
}

export function getHeatLevel(score: number): IntentScanResult['heatLevel'] {
  if (score >= 70) return 'brulante'
  if (score >= 45) return 'chaude'
  if (score >= 20) return 'tiede'
  return 'froide'
}

export function getVerdict(heatLevel: IntentScanResult['heatLevel']): string {
  switch (heatLevel) {
    case 'brulante': return 'Douleur d\'urgence. Le sujet résonne fortement dans l\'écosystème Google.'
    case 'chaude': return 'Sujet validé. Des questions et suggestions confirment l\'intérêt.'
    case 'tiede': return 'Signal faible. Le sujet existe mais n\'est pas prioritaire.'
    case 'froide': return 'Aucune résonance trouvée. Reformulez ou changez d\'angle.'
  }
}

/**
 * Extract significant words from a keyword (no stop words, no short words).
 */
function significantWords(keyword: string): string[] {
  return normalize(keyword)
    .split(' ')
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

/**
 * Split a long keyword into multiple 2-word sub-queries (sliding window).
 * "stratégie croissance digitale entreprises" → ["strategie croissance", "croissance digitale", "digitale entreprises"]
 * Short keywords (≤2 significant words) return as-is in a single-element array.
 */
function splitIntoSubQueries(keyword: string): string[] {
  const words = significantWords(keyword)

  if (words.length <= 2) return [words.join(' ')]

  const pairs: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    pairs.push(`${words[i]} ${words[i + 1]}`)
  }
  return pairs
}

/**
 * Pick strategic sub-queries based on how many results the full keyword returned.
 *
 * The number of autocomplete results is a difficulty signal:
 *  - ≥ 8 results  → popular keyword, full results are enough → no sub-queries
 *  - 4–7 results  → niche keyword → first bi-gram (topic) + last bi-gram (audience)
 *  - 0–3 results  → very niche → all bi-grams
 */
function pickSubQueries(keyword: string, fullResultCount: number): string[] {
  const words = significantWords(keyword)
  if (words.length < 3) return []

  const allPairs = splitIntoSubQueries(keyword)
  if (allPairs.length <= 1) return []

  // Popular keyword — full results are sufficient
  if (fullResultCount >= 8) return []

  // Niche — first (topic) + last (audience/context) bi-grams
  if (fullResultCount >= 4) {
    const picked = [allPairs[0]]
    if (allPairs[allPairs.length - 1] !== allPairs[0]) {
      picked.push(allPairs[allPairs.length - 1])
    }
    return picked
  }

  // Very niche — all bi-grams (no uni-grams: too generic, too noisy)
  return [...allPairs]
}

/**
 * Stricter relevance check for autocomplete post-filtering.
 *
 * Unlike matchResonance (which accepts a single stem overlap), this requires
 * multi-word suggestions to share at least 2 distinct topic-word stems.
 * Uses stem equality only (no substring containment) to avoid cross-language
 * false positives like "frein" ⊂ "friend".
 *
 * Rules:
 *  - Single-word suggestion: 1 stem match is enough
 *  - Multi-word suggestion: at least 2 distinct topic stems must match
 */
function isAutocompleteRelevant(text: string, topicWords: string[]): boolean {
  const norm = normalize(text)
  const textWords = norm.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w))
  if (textWords.length === 0) return false

  const topicStems = topicWords.map(w => stemFrench(w))

  // Count distinct topic stems with at least one matching text-word stem
  const matchedTopicStems = new Set<string>()
  for (const tw of topicStems) {
    for (const xw of textWords) {
      if (xw === topicWords[topicStems.indexOf(tw)] || stemFrench(xw) === tw) {
        matchedTopicStems.add(tw)
        break
      }
    }
  }

  // Single-word suggestions: 1 match is enough
  if (textWords.length <= 1) return matchedTopicStems.size >= 1

  // Multi-word suggestions: require at least 2 distinct topic concepts
  return matchedTopicStems.size >= 2
}

/** A single autocomplete suggestion tagged with the query that produced it. */
export interface TaggedSuggestion {
  text: string
  query: string
  position: number // position within its query's results (1-based)
}

/**
 * Fetch autocomplete for a keyword using both "MOT" (prefix) and " MOT" (suffix/infix).
 *
 * Uses result count as a difficulty signal to decide sub-query depth:
 *  - ≥ 8 results from full keyword → popular, stop there
 *  - 4–7 results → niche, also fetch first + last bi-gram
 *  - 0–3 results → very niche, all bi-grams
 *
 * Phase 3 applies a stem-based relevance filter: suggestions with zero
 * topical overlap with the keyword are removed (matchResonance = 'none').
 *
 * Returns tagged suggestions preserving which query produced each result.
 */
export async function fetchAutocompleteMergedGrouped(keyword: string): Promise<{ suggestions: TaggedSuggestion[]; totalCount: number; unfilteredCount: number }> {
  const seen = new Set<string>()
  const all: TaggedSuggestion[] = []

  function addResults(signal: AutocompleteSignal, queryLabel: string) {
    for (let i = 0; i < signal.suggestions.length; i++) {
      const key = normalize(signal.suggestions[i])
      if (!seen.has(key)) {
        seen.add(key)
        all.push({ text: signal.suggestions[i], query: queryLabel, position: i + 1 })
      }
    }
  }

  // Phase 1: Fetch prefix ("MOT*") and suffix ("*MOT") in parallel
  const [direct, reverse] = await Promise.all([
    fetchAutocomplete(keyword),
    fetchAutocomplete(` ${keyword}`),
  ])

  addResults(direct, keyword)
  addResults(reverse, `*${keyword}`)

  const fullCount = all.length

  // Phase 2: Pick sub-queries based on how niche the keyword is
  const subQueries = pickSubQueries(keyword, fullCount)

  if (subQueries.length === 0) {
    if (fullCount > 0) {
      log.info(`Autocomplete for "${keyword}": ${fullCount} suggestions (popular, no sub-queries needed)`)
    } else {
      log.info(`Autocomplete for "${keyword}": 0 suggestions, no sub-queries possible`)
    }
    return { suggestions: all, totalCount: all.length, unfilteredCount: all.length }
  }

  log.info(`Autocomplete for "${keyword}": ${fullCount} suggestions (niche), expanding with ${subQueries.length} sub-queries: ${subQueries.join(' | ')}`)

  // Fetch sub-queries in parallel (prefix + suffix each)
  const fetches: Array<{ promise: Promise<AutocompleteSignal>; label: string }> = []
  for (const q of subQueries) {
    fetches.push({ promise: fetchAutocomplete(q), label: q })
    fetches.push({ promise: fetchAutocomplete(` ${q}`), label: `*${q}` })
  }

  const results = await Promise.all(fetches.map(f => f.promise))
  for (let i = 0; i < results.length; i++) {
    addResults(results[i], fetches[i].label)
  }

  const unfilteredCount = all.length

  // Phase 3: Relevance post-filter — remove off-topic suggestions
  // Requires 2+ distinct topic-word stems in multi-word suggestions
  const topicWords = extractTopicWords(keyword)
  if (topicWords.length >= 2 && subQueries.length > 0) {
    const filtered = all.filter(s => isAutocompleteRelevant(s.text, topicWords))
    const removed = unfilteredCount - filtered.length

    if (removed > 0) {
      log.info(`Autocomplete relevance filter for "${keyword}": kept ${filtered.length}/${unfilteredCount} (removed ${removed} off-topic)`)
    }

    log.info(`Autocomplete merged for "${keyword}": ${filtered.length} relevant suggestions (${fullCount} direct + ${filtered.length - fullCount} from sub-queries, ${removed} filtered)`)
    return { suggestions: filtered, totalCount: filtered.length, unfilteredCount }
  }

  log.info(`Autocomplete merged for "${keyword}": ${all.length} unique suggestions (${fullCount} direct + ${all.length - fullCount} from sub-queries)`)
  return { suggestions: all, totalCount: all.length, unfilteredCount }
}

/**
 * Execute 2-pass intent scan with multi-depth PAA crawling.
 *
 * @param depth 1 = PAA level 1 only (~4 questions, 1 SERP call)
 *              2 = PAA levels 1+2 (~20 questions, ~5 SERP calls)
 */
export async function scanIntent(
  broadKeyword: string,
  specificTopic: string,
  depth: number = 1,
): Promise<IntentScanResult> {
  const effectiveDepth = Math.min(Math.max(depth, 1), 2)
  log.info(`Intent scan: broad="${broadKeyword}" specific="${specificTopic}" depth=${effectiveDepth}`)

  const topicWords = extractTopicWords(specificTopic)

  // Pass 1: Fetch broad data in parallel
  const [autocompleteResult, paaResult, keywordData] = await Promise.all([
    fetchAutocompleteMergedGrouped(broadKeyword),
    crawlPaaDeep(broadKeyword, effectiveDepth),
    fetchKeywordOverview(broadKeyword).catch(() => null),
  ])

  // Pass 2: Score resonance
  const items: ResonanceItem[] = []

  for (const suggestion of autocompleteResult.suggestions) {
    items.push({
      text: suggestion.text,
      source: 'autocomplete',
      match: matchResonance(suggestion.text, topicWords),
      position: suggestion.position,
      depth: 1,
      query: suggestion.query,
    })
  }

  for (const paaQ of paaResult.questions) {
    // Match against question text + answer snippet (if available)
    const questionMatch = matchResonance(paaQ.text, topicWords)
    const answerMatch = paaQ.answer ? matchResonance(paaQ.answer, topicWords) : 'none'
    // Take the best match between question and answer
    const match = bestMatch(questionMatch, answerMatch)

    items.push({
      text: paaQ.text,
      answer: paaQ.answer,
      source: 'paa',
      match,
      position: null,
      depth: paaQ.depth,
      parentQuestion: paaQ.parent,
    })
  }

  // Pass 3: Semantic boost via embeddings (graceful fallback if unavailable)
  const itemTexts = items.map(i => {
    // For PAA, combine question + answer for richer embedding
    if (i.source === 'paa' && i.answer) return `${i.text} ${i.answer}`
    return i.text
  })

  const semanticScores = await computeSemanticScores(specificTopic, itemTexts)

  if (semanticScores) {
    log.info(`[Embedding] Semantic scores computed for ${semanticScores.length} items`)
    for (let i = 0; i < items.length; i++) {
      const score = Math.round(semanticScores[i] * 1000) / 1000
      items[i].semanticScore = score

      // Upgrade match level based on semantic similarity
      if (items[i].match === 'none' && score >= 0.5) {
        items[i].match = 'partial'
        log.info(`[Embedding] Upgraded "${items[i].text.slice(0, 50)}" none→partial (sim=${score})`)
      } else if (items[i].match === 'partial' && score >= 0.7) {
        items[i].match = 'total'
        log.info(`[Embedding] Upgraded "${items[i].text.slice(0, 50)}" partial→total (sim=${score})`)
      }
    }
  } else {
    log.info('[Embedding] Semantic scores unavailable, using stem-only matching')
  }

  const resonanceScore = computeResonanceScore(items)
  const heatLevel = getHeatLevel(resonanceScore)

  const result: IntentScanResult = {
    broadKeyword,
    specificTopic,
    paaCount: paaResult.questions.length,
    autocompleteCount: autocompleteResult.totalCount,
    cpc: keywordData?.cpc ?? null,
    resonanceScore,
    heatLevel,
    items,
    verdict: getVerdict(heatLevel),
    depth: effectiveDepth,
  }

  log.info(`Intent scan done: score=${resonanceScore}, heat=${heatLevel}`, {
    paaTotal: paaResult.questions.length,
    paaL1: paaResult.questions.filter((q: { depth: number }) => q.depth === 1).length,
    paaL2: paaResult.questions.filter((q: { depth: number }) => q.depth === 2).length,
    autocomplete: autocompleteResult.totalCount,
  })

  return result
}
