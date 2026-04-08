/**
 * Smart French keyword detection for SEO scoring.
 *
 * 3-layer matching: exact → semantic (token + proximity) → partial.
 * No external NLP dependencies — uses simple French suffix normalization.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatchMethod = 'exact' | 'semantic' | 'partial' | 'none'

export interface KeywordMatchResult {
  detected: boolean
  score: number       // 0–1
  method: MatchMethod
  occurrences: number
}

/** Pre-computed text representation for reuse across multiple keyword checks. */
export interface PreparedText {
  lowercase: string
  /** Tokenised words (lowercase, punctuation stripped). */
  words: string[]
  /** Same words after French suffix normalisation. */
  normalizedWords: string[]
}

// ---------------------------------------------------------------------------
// French stop words (compact, high-frequency words only)
// ---------------------------------------------------------------------------

const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'un', 'une',
  'et', 'ou', 'en', 'au', 'aux', 'ce', 'ces', 'cette', 'cet',
  'se', 'sa', 'son', 'ses', 'ma', 'mon', 'mes', 'ta', 'ton', 'tes',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'qui', 'que', 'qu', 'dont', 'où',
  'ne', 'pas', 'ni', 'si',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on',
  'me', 'te', 'lui', 'y',
  'pour', 'par', 'sur', 'dans', 'avec', 'sans', 'sous', 'vers', 'entre',
  'est', 'sont', 'a', 'ont', 'fait',
  'plus', 'très', 'tout', 'tous', 'toute', 'toutes',
  'mais', 'donc', 'car', 'or',
])

// ---------------------------------------------------------------------------
// French suffix normalisation (lightweight — no external lib)
// ---------------------------------------------------------------------------

/**
 * Normalise a French word by stripping common suffixes.
 * Good enough to match plurals, feminine forms, and light conjugation.
 *
 * Examples:
 *   étapes   → étap   (s then e)
 *   étape    → étap   (e)
 *   professionnelle → professionnel (e)
 *   créations → création (s)
 *   réseaux   → réseau (x)
 */
export function normalizeFrench(word: string): string {
  let w = word
  if (w.length <= 3) return w

  // Strip trailing 's' (plural) – but not 'ss' endings like "stress"
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) {
    w = w.slice(0, -1)
  }
  // Strip trailing 'x' (plural) – travaux, réseaux
  if (w.length > 3 && w.endsWith('x')) {
    w = w.slice(0, -1)
  }
  // Strip trailing 'e' (feminine) – but not 'ée', 'ie', 'ue' roots that are too short
  if (w.length > 4 && w.endsWith('e') && !w.endsWith('ee') && !w.endsWith('èe')) {
    w = w.slice(0, -1)
  }

  // Deduplicate trailing consonant after feminine stripping (professionnell → professionnel)
  if (w.length > 4 && w[w.length - 1] === w[w.length - 2]) {
    w = w.slice(0, -1)
  }

  return w
}

// ---------------------------------------------------------------------------
// Tokenisation
// ---------------------------------------------------------------------------

/**
 * Tokenise a string into lowercase words.
 * Splits on whitespace and French apostrophe contractions (l', d', qu', etc.)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // Replace apostrophe contractions: "l'article" → "l article", "d'une" → "d une"
    .replace(/['']/g, "' ")
    // Strip remaining punctuation (keep letters, digits, spaces, accented chars)
    .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0)
}

/** Remove French stop words from a token array. */
function removeStopWords(tokens: string[]): string[] {
  return tokens.filter(t => !FRENCH_STOP_WORDS.has(t))
}

// ---------------------------------------------------------------------------
// PreparedText — compute once, match many keywords
// ---------------------------------------------------------------------------

/**
 * Pre-process a text string for efficient keyword matching.
 * Call this once per text, then call `matchKeywordPrepared` for each keyword.
 */
export function prepareText(text: string): PreparedText {
  const lowercase = text.toLowerCase()
  const words = tokenize(lowercase)
  const normalizedWords = words.map(normalizeFrench)
  return { lowercase, words, normalizedWords }
}

// ---------------------------------------------------------------------------
// Core matching
// ---------------------------------------------------------------------------

/**
 * Count exact (substring) occurrences of `keyword` in `text`.
 */
function countExact(text: string, keyword: string): number {
  if (keyword.length === 0) return 0
  const kw = keyword.toLowerCase()
  const src = text.toLowerCase()
  let count = 0
  let pos = 0
  while ((pos = src.indexOf(kw, pos)) !== -1) {
    count++
    pos += kw.length
  }
  return count
}

/**
 * Sliding-window proximity search.
 *
 * Returns the number of non-overlapping windows in `normalizedText` where ALL
 * `keywordTokens` appear within `windowSize` consecutive words.
 */
function countProximityMatches(
  normalizedText: string[],
  kwNormTokens: string[],
  windowSize: number,
): number {
  if (kwNormTokens.length === 0 || normalizedText.length === 0) return 0

  let occurrences = 0
  let skipUntil = 0

  for (let start = 0; start <= normalizedText.length - kwNormTokens.length; start++) {
    if (start < skipUntil) continue

    const end = Math.min(start + windowSize, normalizedText.length)
    const window = normalizedText.slice(start, end)

    const allFound = kwNormTokens.every(kt =>
      window.some(wt => wt === kt || (wt.length > 3 && kt.length > 3 && wt.startsWith(kt.slice(0, Math.max(3, kt.length - 1))))),
    )

    if (allFound) {
      occurrences++
      // Skip past this match window to avoid double-counting
      skipUntil = start + Math.max(1, kwNormTokens.length)
    }
  }

  return occurrences
}

/**
 * Match a keyword against pre-processed text.
 *
 * Three layers:
 * 1. **Exact** — fast substring check
 * 2. **Semantic** — tokenise → stop-word removal → normalise → proximity window
 * 3. **Partial** — count how many keyword tokens appear anywhere in the text
 */
export function matchKeywordPrepared(
  prepared: PreparedText,
  keyword: string,
): KeywordMatchResult {
  // ----- Layer 1: Exact match -----
  const exactCount = countExact(prepared.lowercase, keyword)
  if (exactCount > 0) {
    return { detected: true, score: 1.0, method: 'exact', occurrences: exactCount }
  }

  // ----- Prepare keyword tokens -----
  const kwTokensRaw = tokenize(keyword)
  const kwTokensClean = removeStopWords(kwTokensRaw)
  const kwNormTokens = kwTokensClean.map(normalizeFrench)

  if (kwNormTokens.length === 0) {
    return { detected: false, score: 0, method: 'none', occurrences: 0 }
  }

  // ----- Layer 2: Semantic proximity match -----
  const windowSize = Math.max(kwNormTokens.length * 3, 6)
  const semanticOccurrences = countProximityMatches(
    prepared.normalizedWords,
    kwNormTokens,
    windowSize,
  )

  if (semanticOccurrences > 0) {
    // Score: base 0.85, slightly decreasing for wider windows
    const score = Math.min(0.95, 0.80 + (kwNormTokens.length / (windowSize * 2)))
    return { detected: true, score, method: 'semantic', occurrences: semanticOccurrences }
  }

  // ----- Layer 3: Partial match (global token presence) -----
  const textNormSet = new Set(prepared.normalizedWords)
  const matchedCount = kwNormTokens.filter(kt =>
    textNormSet.has(kt) ||
    Array.from(textNormSet).some(wt => wt.length > 3 && kt.length > 3 && wt.startsWith(kt.slice(0, Math.max(3, kt.length - 1)))),
  ).length

  const ratio = matchedCount / kwNormTokens.length

  if (ratio >= 0.6) {
    return {
      detected: true,
      score: ratio * 0.6,
      method: 'partial',
      occurrences: 0,
    }
  }

  return { detected: false, score: ratio * 0.3, method: 'none', occurrences: 0 }
}

/**
 * Convenience wrapper — prepares text inline and matches a single keyword.
 * For one-off checks (e.g. meta title). Use `prepareText` + `matchKeywordPrepared`
 * when checking multiple keywords against the same text.
 */
export function matchKeyword(text: string, keyword: string): KeywordMatchResult {
  return matchKeywordPrepared(prepareText(text), keyword)
}
