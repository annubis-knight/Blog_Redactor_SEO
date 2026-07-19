/**
 * Heuristique PURE — sélection des Lieutenants (§7.3 epic, variante MVP).
 *
 * Les Lieutenants sont dérivés des candidats Radar (déjà scorés marché,
 * variations du pilier = bons mots-clés secondaires H2/H3), en excluant le
 * Capitaine, top N par marketScore selon le niveau d'article.
 */

import type { CanonicalArticleType, RadarCandidate } from '../types.js'

const LIEUTENANT_MAX: Record<CanonicalArticleType, number> = {
  pilier: 8,
  intermediaire: 5,
  specifique: 3,
}

export function pickLieutenants(
  candidates: RadarCandidate[],
  capitaine: string,
  type: CanonicalArticleType,
): string[] {
  const cap = capitaine.trim().toLowerCase()
  return candidates
    .filter((c) => c.keyword.trim().toLowerCase() !== cap)
    .sort((a, b) => b.marketScore - a.marketScore)
    .slice(0, LIEUTENANT_MAX[type])
    .map((c) => c.keyword)
}
