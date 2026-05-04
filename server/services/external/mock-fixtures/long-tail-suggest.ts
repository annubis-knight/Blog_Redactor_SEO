/**
 * Mock fixture: suggest_long_tail
 *
 * Tool utilise par long-tail-suggest.service.ts::generateLongTailSuggestions
 * pour produire des combinaisons longue-traine a partir des mots-cles
 * racines Radar. Le mock retourne un set determine de suggestions stables
 * et pertinentes pour les tests E2E et unit (AI_PROVIDER=mock).
 */
import { registerToolFixture } from '../mock.service.js'

interface LongTailSuggestion {
  keyword: string
  rationale: string
  preferenceScore: number
  derivedFromRoots: string[]
}

registerToolFixture('suggest_long_tail', ({ userPrompt }) => {
  // Le service injecte les mots-cles racines dans le userPrompt via la variable
  // {{radar_keywords_with_kpis}}. On les extrait ici par regex simple pour
  // produire des suggestions plausibles, deterministes, et basees sur les
  // entrees reelles du test.
  const keywordMatches = userPrompt.match(/- "([^"]+)"/g) ?? []
  const roots = keywordMatches
    .map(m => m.replace(/^- "/, '').replace(/"$/, '').trim())
    .filter(k => k.length > 0)
    .slice(0, 6)

  if (roots.length < 2) {
    return { suggestions: [] }
  }

  // Genere 5 paires + 2 triples si on a >=4 roots → max 7 suggestions, dans
  // les bornes du schema (1-10 suggestions).
  const out: LongTailSuggestion[] = []
  let score = 9

  // Paires
  for (let i = 0; i < roots.length && out.length < 5; i++) {
    for (let j = i + 1; j < roots.length && out.length < 5; j++) {
      const a = roots[i]!
      const b = roots[j]!
      const combined = mergeNaturally(a, b)
      out.push({
        keyword: combined,
        rationale: `Combine "${a}" et "${b}" pour cibler une intention precise alignee avec la douleur de l'article.`,
        preferenceScore: Math.max(score--, 4),
        derivedFromRoots: [a, b],
      })
    }
  }

  // Triples
  if (roots.length >= 4) {
    for (let i = 0; i < Math.min(2, roots.length - 2); i++) {
      const a = roots[i]!
      const b = roots[i + 1]!
      const c = roots[i + 2]!
      const combined = mergeNaturally(mergeNaturally(a, b), c)
      out.push({
        keyword: combined,
        rationale: `Triple combinaison de "${a}", "${b}" et "${c}" pour une longue-traine ciblee.`,
        preferenceScore: Math.max(score--, 3),
        derivedFromRoots: [a, b, c],
      })
    }
  }

  return { suggestions: out.slice(0, 10) }
})

function mergeNaturally(a: string, b: string): string {
  // Concat dedupliquee des mots significatifs
  const wordsA = a.toLowerCase().split(/\s+/)
  const wordsB = b.toLowerCase().split(/\s+/)
  const out: string[] = []
  const seen = new Set<string>()
  for (const w of [...wordsA, ...wordsB]) {
    if (w.length >= 2 && !seen.has(w)) {
      seen.add(w)
      out.push(w)
    }
  }
  return out.join(' ')
}
