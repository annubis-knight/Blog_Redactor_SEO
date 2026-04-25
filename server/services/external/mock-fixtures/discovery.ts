/**
 * Mock fixtures: classify_relevance + curate_keywords
 *
 * classify_relevance — POST /keywords/relevance-score : retourne les indices
 * des mots-clés NON pertinents par rapport au seed.
 *
 * curate_keywords — POST /keywords/analyze-discovery : retourne une shortlist
 * curée avec reasoning + priorité.
 */
import { registerToolFixture } from '../mock.service.js'

// ---------------------------------------------------------------------------
// classify_relevance
// ---------------------------------------------------------------------------
registerToolFixture('classify_relevance', ({ userPrompt }) => {
  // Le userPrompt contient la liste numérotée "0. kw1\n1. kw2\n..."
  // On extrait les lignes pour déterminer combien de kw on a en entrée.
  const lines = userPrompt.match(/^\s*\d+\.\s+.+$/gm) ?? []
  const total = lines.length

  // Marque comme non-pertinent : tout kw contenant "paris" ou "recette" quand
  // le seed concerne autre chose (heuristique simple pour tests).
  const irrelevantIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase()
    if (/\b(paris|recette|marseille|lyon|bordeaux|lille)\b/.test(lower)) {
      irrelevantIndices.push(i)
    }
  }

  // Si rien trouvé, marque ~10% des derniers comme non-pertinents (simule
  // le bruit habituel en bout de liste)
  if (irrelevantIndices.length === 0 && total > 5) {
    irrelevantIndices.push(total - 1)
  }

  return { irrelevant_indices: irrelevantIndices }
})

// ---------------------------------------------------------------------------
// curate_keywords
// ---------------------------------------------------------------------------
registerToolFixture('curate_keywords', ({ userPrompt }) => {
  // Extrait les mots-clés de la liste numérotée "0. kw [meta]"
  const lineMatches = userPrompt.match(/^\s*\d+\.\s+(.+?)\s*(?:\[|$)/gm) ?? []
  const keywords = lineMatches
    .map(m => m.replace(/^\s*\d+\.\s+/, '').replace(/\s*\[.*$/, '').trim())
    .filter(k => k.length > 2)
    .slice(0, 30)

  const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low']
  const reasoningByPriority = {
    high: 'Forte pertinence avec le pain point + signal multi-source + CPC attractif.',
    medium: 'Complète le cocon sémantique avec une bonne intention de recherche.',
    low: 'Soutien sémantique secondaire, à inclure pour la couverture thématique.',
  }

  const curated = keywords.slice(0, Math.max(20, Math.min(25, keywords.length))).map((kw, i) => {
    const priority = priorities[Math.min(Math.floor(i / 8), 2)]
    return {
      keyword: kw,
      reasoning: reasoningByPriority[priority],
      priority,
    }
  })

  return {
    keywords: curated,
    summary: `Sélection de ${curated.length} mots-clés stratégiques alignés sur le pain point et le contexte business. Mix intentions informationnelles et transactionnelles pour un cocon équilibré.`,
  }
})
