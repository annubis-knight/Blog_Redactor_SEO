/**
 * Types for the dual-score system: Market (KPI) vs Relevance.
 *
 * Two complementary scores, each scoped to a specific Moteur tab:
 *   - marketScore  → onglet Radar  → "ce mot-clé pèse-t-il SEO ?"
 *   - relevanceScore → onglet Capitaine → "ce mot-clé parle-t-il vraiment de la douleur ?"
 *
 * Source of truth: docs/scoring-kpi-vs-relevance.md
 */

import type { KpiScoreBreakdown } from '../scoring-kpi.js'

/** Verdict 0-100 → catégorie d'aide à la décision (purement informatif). */
export type ScoreVerdict = 'GO' | 'ORANGE' | 'NOGO'

/** Seuils communs aux deux scores. */
export const SCORE_VERDICT_THRESHOLDS = {
  GO: 70,
  ORANGE: 40,
} as const

/**
 * Map a 0-100 score to its verdict.
 *  ≥ 70 → GO
 *  40-69 → ORANGE
 *  < 40 → NOGO
 */
export function verdictFromScore(total: number): ScoreVerdict {
  if (total >= SCORE_VERDICT_THRESHOLDS.GO) return 'GO'
  if (total >= SCORE_VERDICT_THRESHOLDS.ORANGE) return 'ORANGE'
  return 'NOGO'
}

/**
 * Score KPI / Marché — affiché dans l'onglet Radar.
 * Réutilise `KpiScoreBreakdown` (composantes Volume/KD/CPC/Intent/PAA/AC) +
 * un verdict pour aide à la décision.
 */
export interface MarketScoreResult {
  total: number
  verdict: ScoreVerdict
  components: KpiScoreBreakdown['components']
}

// ---------------------------------------------------------------------------
// Score de Pertinence — affiché dans l'onglet Capitaine
// ---------------------------------------------------------------------------

export interface RelevanceScoreInput {
  /** Alignement sémantique keyword ↔ painPoint (0-100). Neutre 50 si absent. */
  painAlignmentScore?: number | null
  /** Moyenne 0-100 de l'alignement de chaque PAA × douleur. Neutre 50 si absent. */
  paaPainAlignmentAvg?: number | null
  /** Moyenne 0-100 de l'alignement de chaque autocomplete × douleur. Neutre 50 si absent. */
  autocompletePainAlignmentAvg?: number | null
  /** Moyenne 0-100 du score relevance des racines extraites. null → fallback redistribution. */
  rootsAverageScore?: number | null
  /** Types d'intent détectés. Optionnel — neutre si absent. */
  intentTypes?: PainIntentExpected[]
  /**
   * Type d'intent attendu derrière la douleur de l'article (champ DB
   * `articles.pain_intent_expected`). Si différent de l'intent réel détecté sur
   * le mot-clé, un MALUS est intégré directement dans `intentPain.normalized`
   * (-10 points sur la composante elle-même, pas une variable séparée).
   * Cf. docs/pain-point-editorial-backbone.md — "Pattern malus intégré".
   */
  painIntentExpected?: PainIntentExpected
}

/**
 * Les 4 types d'intention SEO reconnus, alignés sur la classification
 * DataForSEO `search_intent_info.main_intent`.
 *
 * AUTHORITY: PostgreSQL `articles.pain_intent_expected` TEXT (CHECK contraint).
 * RELATED FR: FR-CAP-RELEVANCE-INTENT-SIGNAL, FR-PIE-AI-GENERATION.
 */
export type PainIntentExpected =
  | 'commercial'
  | 'transactional'
  | 'informational'
  | 'navigational'

/** Constante des 4 valeurs autorisées — utile pour les schémas Zod et l'UI. */
export const PAIN_INTENT_EXPECTED_VALUES = [
  'commercial',
  'transactional',
  'informational',
  'navigational',
] as const satisfies readonly PainIntentExpected[]

/**
 * Malus appliqué à la composante `intentPain.normalized` quand l'intent réel
 * du mot-clé ne matche pas l'intent attendu (`painIntentExpected`).
 *
 * Ce malus n'est PAS une variable séparée du score : il est soustrait
 * directement de la composante `intentPain.normalized` (puis clampé [0, 100]).
 * Le breakdown reste lisible : un utilisateur qui regarde
 * `intentPain.normalized = 20` voit directement la pénalité reflétée.
 *
 * Pattern extensible : la même logique peut s'appliquer à d'autres composantes
 * (cannibalisation sur painKeyword, longueur excessive, etc.).
 */
export const INTENT_MISMATCH_MALUS = 10

export interface RelevanceScoreComponentBreakdown {
  /** Poids effectif appliqué (peut différer du poids cible si fallback). */
  weight: number
  /** Score 0-100 normalisé de la composante. */
  normalized: number
  /** Contribution = weight × normalized. */
  contribution: number
}

export interface RelevanceScoreBreakdown {
  painKeyword: RelevanceScoreComponentBreakdown
  paaPain: RelevanceScoreComponentBreakdown
  acPain: RelevanceScoreComponentBreakdown
  roots: RelevanceScoreComponentBreakdown
  intentPain: RelevanceScoreComponentBreakdown
}

export interface RelevanceScoreResult {
  total: number
  verdict: ScoreVerdict
  breakdown: RelevanceScoreBreakdown
  rootsContext: {
    rootsAverageScore: number | null
    /** True si keyword < 3 mots ou racines absentes → poids racines redistribués. */
    fallbackApplied: boolean
  }
}

/**
 * 2026-05-05 — Cause typée renvoyée par le backend quand `relevanceScore` est `null`.
 *
 * Voir docs/data-flows/relevance-score-live-computation.md §8 et FR-CAP-RELEVANCE-UNAVAILABLE-REASON.
 *
 * Mapping vers les messages UI :
 *   - 'no-pain'              → "Définis un point de douleur sur l'article"
 *   - 'long-tail'            → "Score non applicable (longue-traîne)"
 *   - 'missing-paa'          → "Pas de PAA disponible — relance un scan Radar pour ce keyword"
 *   - 'missing-autocomplete' → "Pas d'autocomplete — relance un scan Radar"
 *   - null                   → score présent (champ omis ou null)
 */
export type RelevanceUnavailableReason =
  | 'no-pain'
  | 'long-tail'
  | 'missing-paa'
  | 'missing-autocomplete'

/**
 * 2026-05-05 — Résultat du calcul Pertinence à la volée (architecture live computation).
 *
 * `total` peut être `null` quand le calcul n'est pas possible. Dans ce cas,
 * `unavailableReason` est rempli pour informer le frontend de la cause précise.
 *
 * Quand `total` est un nombre, `unavailableReason` est `null`.
 */
export interface RelevanceScoreLiveResult {
  total: number | null
  verdict: ScoreVerdict | null
  breakdown: RelevanceScoreBreakdown | null
  rootsContext: {
    rootsAverageScore: number | null
    fallbackApplied: boolean
  } | null
  /** Cause précise si total === null. Sinon null. */
  unavailableReason: RelevanceUnavailableReason | null
}
