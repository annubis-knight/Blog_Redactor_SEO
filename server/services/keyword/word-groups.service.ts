/**
 * Word group clustering — tokenize keywords, remove stopwords,
 * normalize accents, and compute token frequency groups.
 *
 * Ported from export/app/routers/word_groups.py
 */

const STOPWORDS = new Set([
  // FR
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'a', 'au',
  'aux', 'pour', 'par', 'sur', 'avec', 'dans', 'que', 'qui', 'est', 'pas',
  'ne', 'se', 'ce', 'son', 'sa', 'ses', 'ou', 'mais', 'il', 'elle', 'on',
  'nous', 'vous', 'ils', 'elles', 'leur', 'leurs', 'mon', 'ma', 'mes',
  'ton', 'ta', 'tes', 'je', 'tu',
  // EN
  'the', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'is', 'it', 'its', 'this', 'that', 'are', 'was',
  'be', 'as', 'has', 'had', 'not', 'you', 'your', 'we', 'our', 'they',
  'their', 'he', 'she', 'my', 'me', 'do', 'no', 'so', 'if',
])

const TOKEN_RE = /[\s\-_.,;:!?'"()[\]{}/\\]+/

/** Strip diacritics and lowercase: "Référencement" → "referencement" */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export interface WordGroup {
  word: string       // display form (most frequent)
  count: number      // number of keywords containing this token
  normalized: string // accent-stripped form
}

/**
 * Compute word groups from a list of keyword strings.
 * Each token is counted max 1x per keyword (deduped within keyword).
 */
export function computeWordGroups(
  keywords: string[],
  minCount = 2,
  maxGroups = 50,
): WordGroup[] {
  const freq = new Map<string, number>()
  const displayCounts = new Map<string, Map<string, number>>()

  for (const kw of keywords) {
    if (!kw) continue
    const tokens = kw.toLowerCase().split(TOKEN_RE)
    const seen = new Set<string>()

    for (const token of tokens) {
      if (token.length < 2) continue
      const norm = normalize(token)
      if (STOPWORDS.has(norm) || norm.length < 2) continue
      if (seen.has(norm)) continue
      seen.add(norm)

      freq.set(norm, (freq.get(norm) ?? 0) + 1)

      if (!displayCounts.has(norm)) displayCounts.set(norm, new Map())
      const dc = displayCounts.get(norm)!
      dc.set(token, (dc.get(token) ?? 0) + 1)
    }
  }

  const results: WordGroup[] = []
  for (const [norm, count] of freq) {
    if (count < minCount) continue
    const dc = displayCounts.get(norm)
    let bestForm = norm
    if (dc && dc.size > 0) {
      let maxCount = 0
      for (const [form, c] of dc) {
        if (c > maxCount) {
          maxCount = c
          bestForm = form
        }
      }
    }
    results.push({ word: bestForm, count, normalized: norm })
  }

  results.sort((a, b) => b.count - a.count)
  return results.slice(0, maxGroups)
}

