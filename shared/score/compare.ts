/**
 * Module shared/score/compare.ts — comparaison uniforme des scores (S3.1).
 *
 * **Convention** : les scores `null` sont placés EN BAS, peu importe
 * le sens du tri. Affichage "—" + position en bas = signal cohérent
 * pour l'utilisateur (CLAUDE.md §2.0).
 *
 * Cette convention est la SEULE source de vérité pour le tri par score.
 * Plus jamais de `?? 0` dans les `.sort(...)`.
 */
import type { Score } from './types.js'

/**
 * Compare deux scores.
 * Retourne :
 *   - négatif si `a` doit venir avant `b`
 *   - positif si `b` doit venir avant `a`
 *   - 0 si égaux
 *
 * **Tri descendant par défaut** (le plus haut en premier).
 * Les `null` sont TOUJOURS en bas, indépendamment du sens.
 *
 * @example
 *   [80, null, 50].sort((a, b) => compareScores(a, b))
 *   // → [80, 50, null]
 */
export function compareScores(a: Score, b: Score): number {
  // null toujours en bas (peu importe ascendant/descendant)
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  // Descendant par défaut : plus grand score en premier
  return b - a
}

/**
 * Variante ascendante (rare, mais explicite quand utile).
 * `null` reste en bas.
 */
export function compareScoresAsc(a: Score, b: Score): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a - b
}
