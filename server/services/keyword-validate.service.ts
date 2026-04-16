import type { ArticleLevel } from '../../shared/types/keyword-validate.types.js'

export { getThresholds, scoreKpi, computeVerdict } from '../../shared/kpi-scoring.js'

// ---------------------------------------------------------------------------
// Intent scoring matrix (server-only — depends on DataForSEO intent labels)
// ---------------------------------------------------------------------------

const INTENT_MATRIX: Record<string, Record<ArticleLevel, number>> = {
  informational:  { pilier: 0.7, intermediaire: 0.5, specifique: 1.0 },
  commercial:     { pilier: 1.0, intermediaire: 1.0, specifique: 0.5 },
  transactional:  { pilier: 0.3, intermediaire: 0.7, specifique: 0.3 },
  navigational:   { pilier: 0.2, intermediaire: 0.2, specifique: 0.2 },
}

/**
 * Compute a continuous intent score (0..1) from DataForSEO intent label + probability.
 */
export function computeIntentScore(
  intent: string,
  probability: number,
  articleLevel: ArticleLevel,
): number {
  const levelMap = INTENT_MATRIX[intent]
  if (!levelMap) return 0.5 // Fallback for unknown intents
  return Math.min(1, Math.max(0, levelMap[articleLevel] * probability))
}
