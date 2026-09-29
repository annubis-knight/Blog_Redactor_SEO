/**
 * Mock fixture: suggest_long_tail
 *
 * Tool utilise par long-tail-suggest.service.ts::generateLongTailSuggestions
 * pour produire des combinaisons longue-traine a partir des mots-cles
 * racines Radar. Le mock retourne un set determine de suggestions stables
 * et pertinentes pour les tests E2E et unit (AI_PROVIDER=mock).
 *
 * FR-RAD-LONGTAIL-GENERATE : le service place les mots-cles racines dans la
 * CONSIGNE (`radar-long-tail-suggest.md`, variable {{radar_keywords_with_kpis}}),
 * pas dans le message utilisateur. L'ancienne fixture les cherchait dans le
 * message : la liste revenait toujours vide, et cette reponse vide etait mise en
 * cache 7 jours. Garde par tests/unit/services/mock-moteur-panneaux.test.ts.
 */
import { registerToolFixture } from '../mock-registry.js'
import { promptField, promptSection } from './prompt-fields.js'

interface LongTailSuggestion {
  keyword: string
  rationale: string
  preferenceScore: number
  derivedFromRoots: string[]
}

/** Lignes `- "mot-clé"` du bloc des mots-cles racines de la consigne. */
function motsClesRacines(systemPrompt: string, userPrompt: string): string[] {
  const bloc = promptSection(systemPrompt, 'Mots-cles racines disponibles dans l\'onglet Radar') ?? userPrompt
  return [...bloc.matchAll(/^- "([^"]+)"/gm)].map(m => m[1]!.trim()).filter(k => k.length > 0)
}

registerToolFixture('suggest_long_tail', ({ systemPrompt, userPrompt }) => {
  const roots = motsClesRacines(systemPrompt, userPrompt).slice(0, 6)
  const titre = promptField(systemPrompt, 'Titre de l\'article')
  const pourArticle = titre && titre !== '(non defini)' ? ` pour l'article « ${titre} »` : ''

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
        rationale: `Combine "${a}" et "${b}" pour cibler une intention precise alignee avec la douleur de l'article${pourArticle}.`,
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
