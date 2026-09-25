/**
 * Heuristique PURE — sélection des Lieutenants (§7.3 epic).
 *
 * Les Lieutenants sont choisis parmi les candidats Radar (déjà scorés marché,
 * variations du pilier = bons mots-clés secondaires H2/H3), en excluant le
 * Capitaine, top N selon le niveau d'article.
 *
 * **Ancrage SERP (audit défaut n°14)** : v1 tranchait au seul `marketScore`,
 * alors que le SERP — déjà payé — dit quels sujets les pages qui rankent
 * traitent réellement. Un candidat présent dans les titres des concurrents est
 * donc privilégié : c'est un chapitre attendu par Google sur cette requête.
 *
 * Score = 0,6 × présence SERP + 0,4 × marché normalisé.
 * Sans données SERP, on retombe sur le classement marché (rétrocompatible).
 */

import { topicalAffinity } from '../text.js'
import type { CanonicalArticleType, RadarCandidate } from '../types.js'
import { ARTICLE_TYPE_RULES } from '../../../shared/constants/article-type-rules.js'

// Lieutenants retenus : le même maximum qu'à l'écran (FR-INFRA-TYPE-RULES-SSOT).
// Le mode automatique en gardait 8 pour un pilier quand l'écran en garde 5.
const LIEUTENANT_MAX = (type: CanonicalArticleType): number => ARTICLE_TYPE_RULES[type].maxLieutenants

export const SERP_WEIGHT = 0.6
export const MARKET_WEIGHT = 0.4

export interface PickLieutenantsOptions {
  /** Titres Hn des concurrents (SERP) — ancrage éditorial. */
  competitorHeadings?: string[]
}

export function pickLieutenants(
  candidates: RadarCandidate[],
  capitaine: string,
  type: CanonicalArticleType,
  opts: PickLieutenantsOptions = {},
): string[] {
  const cap = capitaine.trim().toLowerCase()
  const pool = candidates.filter((c) => c.keyword.trim().toLowerCase() !== cap)
  if (pool.length === 0) return []

  const headings = (opts.competitorHeadings ?? []).join(' ')
  const hasSerp = headings.trim().length > 0
  const maxMarket = Math.max(...pool.map((c) => c.marketScore), 0)

  return pool
    .map((c) => {
      const marketNorm = maxMarket > 0 ? c.marketScore / maxMarket : 0
      const serpPresence = hasSerp ? topicalAffinity(c.keyword, headings) : 0
      return {
        keyword: c.keyword,
        marketScore: c.marketScore,
        score: hasSerp ? SERP_WEIGHT * serpPresence + MARKET_WEIGHT * marketNorm : marketNorm,
      }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.marketScore !== a.marketScore) return b.marketScore - a.marketScore
      return a.keyword.localeCompare(b.keyword)
    })
    .slice(0, LIEUTENANT_MAX(type))
    .map((c) => c.keyword)
}
