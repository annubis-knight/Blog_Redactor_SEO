import type { RadarCombinedScoreBreakdown, RadarIntentType } from './types/intent.types.js'

export interface CombinedScoreInput {
  searchVolume: number
  difficulty: number
  cpc: number
  paaWeightedScore: number
  autocompleteMatchCount: number
  avgSemanticScore?: number | null
  intentTypes?: RadarIntentType[]
  /** QW3 : alignement keyword ↔ painPoint (0-100). Si absent/undefined → neutre 50. */
  painAlignmentScore?: number
  /** Étape 3A : moyenne numérique 0-100 de l'alignement PAA × douleur.
   *  Si fourni, remplace `paaMatchScore` (matching lexical PAA × keyword) dans la pondération. */
  paaPainAlignmentAvg?: number
  /** Étape 3B : moyenne numérique 0-100 de l'alignement autocomplete × douleur.
   *  Si fourni, remplace `resonanceBonus` dans la pondération. */
  autocompletePainAlignmentAvg?: number
  /** Étape 3C : moyenne numérique 0-100 du combinedScore des racines (capitaine 3+ mots).
   *  Si fourni, ajoute la composante `rootsBonus`. */
  rootsAverageScore?: number
}

const INTENT_VALUES: Record<string, number> = {
  commercial: 100,
  transactional: 80,
  informational: 50,
  navigational: 20,
}

/**
 * Compute combined radar score from KPIs.
 * Single source of truth — used by both client and server.
 *
 * Deux modes de pondération :
 *
 *  • Mode "pertinence article" (quand `paaPainAlignmentAvg`, `autocompletePainAlignmentAvg`
 *    et `rootsAverageScore` sont fournis) :
 *      - Pain alignment keyword  25 %
 *      - PAA × douleur           25 %  (remplace paaMatchScore lexical)
 *      - Autocomplete × douleur  15 %  (remplace resonanceBonus)
 *      - Racines                 15 %  (nouveau)
 *      - Intent                  10 %
 *      - Opportunité             10 %
 *
 *  • Mode "fallback" (quand les champs pertinence-article manquent) :
 *      - PAA match lexical       25 %
 *      - Pain alignment keyword  20 %
 *      - Opportunité             20 %
 *      - Résonance autocomplete  15 %
 *      - Intent                  10 %
 *      - CPC                     10 %
 *    Garantit la rétrocompatibilité avec les cas sans douleur / sans racines.
 */
export function computeCombinedScore(input: CombinedScoreInput): RadarCombinedScoreBreakdown {
  // ---- Composantes brutes (toujours calculées) ----

  // PAA match lexical (mode fallback)
  const paaMatchScore = Math.min(100, input.paaWeightedScore * 10)

  // Resonance lexical (mode fallback)
  const autoBonus = Math.min(30, input.autocompleteMatchCount * 10)
  const semanticBonus = input.avgSemanticScore != null ? input.avgSemanticScore * 70 : 0
  const resonanceBonus = Math.min(100, autoBonus + semanticBonus)

  // Opportunité (toujours présent)
  const adjustedVol = Math.max(1, input.searchVolume * Math.max(0.01, 1 - input.difficulty / 100))
  const opportunityScore = Math.min(100, Math.log10(adjustedVol) / 5 * 100)

  // Intent
  const types = input.intentTypes ?? []
  const intentValueScore = types.length > 0
    ? Math.max(...types.map(t => INTENT_VALUES[t] ?? 50))
    : 50

  // CPC (mode fallback)
  const cpcScore = Math.min(100, Math.log10(input.cpc + 1) / Math.log10(11) * 100)

  // Pain alignment keyword (50 = neutre si absent)
  const painAlignmentScore = input.painAlignmentScore != null
    ? Math.max(0, Math.min(100, input.painAlignmentScore))
    : 50

  // Composantes "pertinence article" (nouvelles, optionnelles)
  const paaPainAlignmentScore = input.paaPainAlignmentAvg != null
    ? Math.max(0, Math.min(100, input.paaPainAlignmentAvg))
    : null
  const autocompletePainAlignmentScore = input.autocompletePainAlignmentAvg != null
    ? Math.max(0, Math.min(100, input.autocompletePainAlignmentAvg))
    : null
  const rootsBonus = input.rootsAverageScore != null
    ? Math.max(0, Math.min(100, input.rootsAverageScore))
    : null

  // ---- Pondération ----
  let total: number
  const hasRelevance = paaPainAlignmentScore != null && autocompletePainAlignmentScore != null

  if (hasRelevance) {
    // Mode "pertinence article" — 65 % signaux article + 35 % signaux marché
    // Si pas de racines, on répartit proportionnellement les 15 % sur les autres.
    if (rootsBonus != null) {
      total = Math.round(
        painAlignmentScore * 0.25 +
        paaPainAlignmentScore * 0.25 +
        autocompletePainAlignmentScore * 0.15 +
        rootsBonus * 0.15 +
        intentValueScore * 0.10 +
        opportunityScore * 0.10,
      )
    } else {
      // Sans racines : rebalance — pain keyword 30, PAA pain 30, AC pain 15, intent 10, opp 15
      total = Math.round(
        painAlignmentScore * 0.30 +
        paaPainAlignmentScore * 0.30 +
        autocompletePainAlignmentScore * 0.15 +
        intentValueScore * 0.10 +
        opportunityScore * 0.15,
      )
    }
  } else {
    // Mode fallback — formule historique
    total = Math.round(
      paaMatchScore * 0.25 +
      resonanceBonus * 0.15 +
      opportunityScore * 0.20 +
      intentValueScore * 0.10 +
      cpcScore * 0.10 +
      painAlignmentScore * 0.20,
    )
  }

  return {
    paaMatchScore: Math.round(paaPainAlignmentScore ?? paaMatchScore),
    resonanceBonus: Math.round(autocompletePainAlignmentScore ?? resonanceBonus),
    opportunityScore: Math.round(opportunityScore),
    intentValueScore: Math.round(intentValueScore),
    cpcScore: Math.round(cpcScore),
    painAlignmentScore: Math.round(painAlignmentScore),
    total: Math.min(100, Math.max(0, total)),
  }
}
