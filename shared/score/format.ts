/**
 * Module shared/score/format.ts — formattage uniforme des scores et KPIs (S3.1).
 *
 * **Règle d'or** (CLAUDE.md §2.0) : la même expression doit produire
 * l'affichage et la valeur de tri. Cette fonction est l'UNIQUE source
 * d'affichage. Tout endroit qui affiche un score ou un KPI marché doit
 * passer par les helpers exportés ici.
 *
 * Voir aussi PRD §8.14 — FR-INFRA-KPI-DISPLAY-DASH.
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

/**
 * Affiche un volume de recherche.
 * - null/undefined → "—"
 * - >= 1000        → "1.2k", "12.3k" (1 décimale)
 * - sinon          → "124"
 */
export function formatVolume(value: number | null | undefined): string {
  if (value === null || value === undefined) return PLACEHOLDER
  if (value >= 1000) {
    const truncated = Math.floor((value / 1000) * 10) / 10
    return `${truncated}k`
  }
  return String(Math.round(value))
}

/**
 * Affiche un Cost-Per-Click en euros.
 * - null/undefined → "—"
 * - sinon          → "1.23 €" (toFixed(2) + suffixe)
 */
export function formatCpc(value: number | null | undefined): string {
  if (value === null || value === undefined) return PLACEHOLDER
  return `${value.toFixed(2)} €`
}

/**
 * Affiche un Keyword Difficulty (0-100).
 * - null/undefined → "—"
 * - sinon          → "42" (entier arrondi)
 */
export function formatKd(value: number | null | undefined): string {
  if (value === null || value === undefined) return PLACEHOLDER
  return String(Math.round(value))
}

/**
 * Affiche un pourcentage.
 * - null/undefined            → "—"
 * - { fromRatio: true }, 0.42 → "42 %" (interprète comme ratio 0-1)
 * - sinon, 42                 → "42 %" (interprète comme % déjà en 0-100)
 */
export function formatPercent(
  value: number | null | undefined,
  opts?: { fromRatio?: boolean },
): string {
  if (value === null || value === undefined) return PLACEHOLDER
  const pct = opts?.fromRatio ? value * 100 : value
  return `${Math.round(pct)} %`
}

/** Constante exportée pour les tests / cas où l'on doit reconnaître le placeholder. */
export const SCORE_PLACEHOLDER = PLACEHOLDER
