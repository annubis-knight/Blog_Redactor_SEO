import type { RadarCombinedScoreBreakdown, RadarIntentType } from './types/intent.types.js'

export interface CombinedScoreInput {
  searchVolume: number
  difficulty: number
  cpc: number
  paaWeightedScore: number
  autocompleteMatchCount: number
  avgSemanticScore?: number | null
  intentTypes?: RadarIntentType[]
}

const INTENT_VALUES: Record<string, number> = {
  commercial: 100,
  transactional: 80,
  informational: 50,
  navigational: 20,
}

/** Compute combined radar score from KPIs.
 *  Single source of truth — used by both client and server. */
export function computeCombinedScore(input: CombinedScoreInput): RadarCombinedScoreBreakdown {
  // 1. PAA Match Score (30%) — weighted sum × 10, cap 100
  const paaMatchScore = Math.min(100, input.paaWeightedScore * 10)

  // 2. Resonance Bonus (15%) — autocomplete matches × 10 cap 30, + avg semantic × 70
  const autoBonus = Math.min(30, input.autocompleteMatchCount * 10)
  const semanticBonus = input.avgSemanticScore != null ? input.avgSemanticScore * 70 : 0
  const resonanceBonus = Math.min(100, autoBonus + semanticBonus)

  // 3. Opportunity Score (25%) — log10(volume × (1 - KD/100)) normalized
  const adjustedVol = Math.max(1, input.searchVolume * Math.max(0.01, 1 - input.difficulty / 100))
  const opportunityScore = Math.min(100, Math.log10(adjustedVol) / 5 * 100)

  // 4. Intent Value Score (15%) — best intent from array, default 50
  const types = input.intentTypes ?? []
  const intentValueScore = types.length > 0
    ? Math.max(...types.map(t => INTENT_VALUES[t] ?? 50))
    : 50

  // 5. CPC Score (15%) — log10(cpc+1) normalized, cap at CPC=10
  const cpcScore = Math.min(100, Math.log10(input.cpc + 1) / Math.log10(11) * 100)

  const total = Math.round(
    paaMatchScore * 0.30 +
    resonanceBonus * 0.15 +
    opportunityScore * 0.25 +
    intentValueScore * 0.15 +
    cpcScore * 0.15,
  )

  return {
    paaMatchScore: Math.round(paaMatchScore),
    resonanceBonus: Math.round(resonanceBonus),
    opportunityScore: Math.round(opportunityScore),
    intentValueScore: Math.round(intentValueScore),
    cpcScore: Math.round(cpcScore),
    total: Math.min(100, Math.max(0, total)),
  }
}
