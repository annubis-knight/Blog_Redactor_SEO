/**
 * Module shared/score/aggregate.ts — agrégats sur listes de scores (S3.1).
 *
 * **Règle** : les `null` sont **ignorés** dans les agrégats, jamais
 * convertis en 0. Une moyenne de [80, null, 60] donne 70, pas 46.7.
 * (CLAUDE.md §2.0 — pas de fallback silencieux qui masque l'absence.)
 */
import type { Score } from './types.js'

/**
 * Moyenne arithmétique en ignorant les `null`.
 * Retourne `null` si aucune valeur exploitable.
 *
 * @example
 *   averageScores([80, null, 60]) // 70 (moyenne sur 2 valeurs)
 *   averageScores([null, null])   // null (rien à agréger)
 *   averageScores([])             // null
 */
export function averageScores(scores: readonly Score[]): Score {
  const valid = scores.filter((s): s is number => s !== null)
  if (valid.length === 0) return null
  return valid.reduce((sum, s) => sum + s, 0) / valid.length
}

/**
 * Maximum en ignorant les `null`.
 * Retourne `null` si aucune valeur exploitable.
 */
export function maxScore(scores: readonly Score[]): Score {
  const valid = scores.filter((s): s is number => s !== null)
  if (valid.length === 0) return null
  return Math.max(...valid)
}

/**
 * Minimum en ignorant les `null`.
 * Retourne `null` si aucune valeur exploitable.
 */
export function minScore(scores: readonly Score[]): Score {
  const valid = scores.filter((s): s is number => s !== null)
  if (valid.length === 0) return null
  return Math.min(...valid)
}

/** Compte les scores non-null d'une liste. */
export function countValidScores(scores: readonly Score[]): number {
  return scores.filter((s) => s !== null).length
}
