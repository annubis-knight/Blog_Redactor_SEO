import type { RadarCombinedScoreBreakdown, RadarIntentType } from './types/intent.types.js'
import {
  verdictFromScore,
  type RelevanceScoreInput,
  type RelevanceScoreResult,
  type RelevanceScoreBreakdown,
} from './types/scoring.types.js'

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

// ---------------------------------------------------------------------------
// Score de Pertinence — onglet Capitaine (séparation KPI vs Pertinence, 2026-04-28)
// ---------------------------------------------------------------------------

/**
 * Pondération cible du Score de Pertinence.
 *
 * Réponse à : "Ce mot-clé parle-t-il VRAIMENT de la douleur de mon article ?"
 * Aucun signal de marché brut (volume / KD / CPC) ici — ils vivent dans `computeMarketScore`.
 */
const RELEVANCE_WEIGHTS_TARGET = {
  painKeyword: 0.30,
  paaPain:     0.25,
  acPain:      0.15,
  roots:       0.20,
  intentPain:  0.10,
} as const

type RelevanceIntentType = NonNullable<RelevanceScoreInput['intentTypes']>[number]
type RelevancePainType = NonNullable<RelevanceScoreInput['painType']>

/**
 * Mapping qualitatif intent × douleur → score 0-100.
 * Si pas de painType ou pas d'intentTypes → 50 neutre.
 */
function computeIntentPainAlignment(
  intentTypes: RelevanceIntentType[] | undefined,
  painType: RelevancePainType | undefined,
): number {
  if (!painType || !intentTypes || intentTypes.length === 0) return 50

  const matrix: Record<RelevancePainType, Record<RelevanceIntentType, number>> = {
    commercial: {
      commercial:    100,
      transactional: 80,
      informational: 30,
      navigational:  20,
    },
    transactional: {
      transactional: 100,
      commercial:    80,
      informational: 30,
      navigational:  20,
    },
    informational: {
      informational: 100,
      commercial:    50,
      transactional: 40,
      navigational:  30,
    },
    navigational: {
      navigational:  100,
      commercial:    60,
      transactional: 50,
      informational: 40,
    },
  }

  return Math.max(...intentTypes.map(t => matrix[painType][t] ?? 50))
}

/**
 * Calcule le Score de Pertinence (0-100) — affiché dans l'onglet Capitaine.
 *
 * Composantes :
 *   - Pain alignment keyword            30 %
 *   - PAA × douleur (qualité)           25 %
 *   - Autocomplete × douleur (qualité)  15 %
 *   - Racines (cohérence sémantique)    20 %
 *   - Intent × douleur                  10 %
 *
 * Fallback racines : si `rootsAverageScore` est absent (keyword < 3 mots ou
 * pas de racines pré-validées), les 20 % sont redistribués proportionnellement
 * sur les 4 autres composantes.
 *
 * Composantes manquantes (paaPain, acPain, painAlignmentScore) → neutralisées à 50.
 */
export function computeRelevanceScore(input: RelevanceScoreInput): RelevanceScoreResult {
  const painKeywordNorm = clampScore(input.painAlignmentScore, 50)
  const paaPainNorm = clampScore(input.paaPainAlignmentAvg, 50)
  const acPainNorm = clampScore(input.autocompletePainAlignmentAvg, 50)
  const intentPainNorm = computeIntentPainAlignment(input.intentTypes, input.painType)

  const hasRoots = input.rootsAverageScore != null
  const rootsNorm = hasRoots ? clampScore(input.rootsAverageScore, 50) : 0

  const weights: { painKeyword: number; paaPain: number; acPain: number; roots: number; intentPain: number } = {
    painKeyword: RELEVANCE_WEIGHTS_TARGET.painKeyword,
    paaPain:     RELEVANCE_WEIGHTS_TARGET.paaPain,
    acPain:      RELEVANCE_WEIGHTS_TARGET.acPain,
    roots:       RELEVANCE_WEIGHTS_TARGET.roots,
    intentPain:  RELEVANCE_WEIGHTS_TARGET.intentPain,
  }
  if (!hasRoots) {
    const remaining = 1 - RELEVANCE_WEIGHTS_TARGET.roots
    const factor = 1 / remaining
    weights.painKeyword = RELEVANCE_WEIGHTS_TARGET.painKeyword * factor
    weights.paaPain     = RELEVANCE_WEIGHTS_TARGET.paaPain * factor
    weights.acPain      = RELEVANCE_WEIGHTS_TARGET.acPain * factor
    weights.roots       = 0
    weights.intentPain  = RELEVANCE_WEIGHTS_TARGET.intentPain * factor
  }

  const breakdown: RelevanceScoreBreakdown = {
    painKeyword: makeComponent(weights.painKeyword, painKeywordNorm),
    paaPain:     makeComponent(weights.paaPain, paaPainNorm),
    acPain:      makeComponent(weights.acPain, acPainNorm),
    roots:       makeComponent(weights.roots, rootsNorm),
    intentPain:  makeComponent(weights.intentPain, intentPainNorm),
  }

  const total = Math.round(
    breakdown.painKeyword.contribution +
    breakdown.paaPain.contribution +
    breakdown.acPain.contribution +
    breakdown.roots.contribution +
    breakdown.intentPain.contribution,
  )

  const clampedTotal = Math.min(100, Math.max(0, total))

  return {
    total: clampedTotal,
    verdict: verdictFromScore(clampedTotal),
    breakdown,
    rootsContext: {
      rootsAverageScore: hasRoots ? rootsNorm : null,
      fallbackApplied: !hasRoots,
    },
  }
}

export { verdictFromScore }

function clampScore(value: number | null | undefined, fallback: number): number {
  if (value == null || Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(100, value))
}

function makeComponent(weight: number, normalized: number) {
  return {
    weight,
    normalized,
    contribution: weight * normalized,
  }
}
