/**
 * Heuristique PURE — sélection des candidats Radar (§7.1 epic).
 *
 * Depuis les RadarCards du scan : garde le top K par `marketScore.total`,
 * en excluant les cards sans KPI (`kpis === null`) ou sans score numérique
 * (invariant §13 design-registry : `kpis === null` ⇒ hors tri par score).
 */

import type { CanonicalArticleType, RadarCandidate, RadarSeedKeyword } from '../types.js'

export interface RadarCardLike {
  keyword: string
  reasoning?: string
  kpis: unknown | null
  marketScore?: { total?: number | null } | null
}

const K_BY_TYPE: Record<CanonicalArticleType, number> = {
  pilier: 12,
  intermediaire: 8,
  specifique: 5,
}

export function pickRadarCandidates(
  cards: RadarCardLike[],
  type: CanonicalArticleType,
): RadarCandidate[] {
  return cards
    .filter((c): c is RadarCardLike & { marketScore: { total: number } } =>
      c.kpis != null && typeof c.marketScore?.total === 'number')
    .map((c) => ({
      keyword: c.keyword,
      reasoning: c.reasoning ?? '',
      marketScore: c.marketScore.total,
    }))
    .sort((a, b) => b.marketScore - a.marketScore)
    .slice(0, K_BY_TYPE[type])
}

/** Déduplique des semences par mot-clé (lowercased + trim), en préservant l'ordre. */
export function dedupeRadarKeywords(kws: RadarSeedKeyword[]): RadarSeedKeyword[] {
  const seen = new Set<string>()
  const out: RadarSeedKeyword[] = []
  for (const k of kws) {
    const key = k.keyword.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(k)
  }
  return out
}
