/**
 * Module shared/score/format.ts — formattage uniforme des scores (S3.1).
 *
 * **Règle d'or** (CLAUDE.md §2.0) : la même expression doit produire
 * l'affichage et la valeur de tri. Cette fonction est l'UNIQUE source
 * d'affichage. Tout endroit qui affiche un score doit l'appeler.
 */
import type { Score } from './types.js'

const PLACEHOLDER = '—'

/**
 * Convertit un Score en string affichable.
 * - null/undefined → "—" (placeholder explicite, jamais "0" ou vide)
 * - nombre        → arrondi à l'entier
 *
 * @example
 *   formatScore(84)   // "84"
 *   formatScore(null) // "—"
 *   formatScore(0)    // "0"  ← attention, "0" ≠ "—" : 0 est une valeur, null est l'absence
 */
export function formatScore(score: Score): string {
  if (score === null || score === undefined) return PLACEHOLDER
  return String(Math.round(score))
}

/** Constante exportée pour les tests / cas où l'on doit reconnaître le placeholder. */
export const SCORE_PLACEHOLDER = PLACEHOLDER
