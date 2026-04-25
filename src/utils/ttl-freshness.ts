/**
 * Règle produit U5 : ne jamais relancer un appel IA si la donnée persistée en DB
 * a moins de N jours (par défaut 7). Évite la consommation de crédits inutile.
 *
 * Usage typique :
 *   if (shouldRegenerate(entry.exploredAt)) { launchAiStream() } else { displayFromDb() }
 */

const DEFAULT_TTL_DAYS = 7

/**
 * Retourne true si la donnée doit être régénérée :
 *  - `exploredAt` est null/undefined/vide
 *  - OU la date est antérieure à `ttlDays` jours.
 *
 * Retourne false si la donnée est fraîche (< ttlDays jours) → l'affichage doit
 * réutiliser la valeur persistée sans relancer d'appel externe.
 */
export function shouldRegenerate(
  exploredAt: string | null | undefined,
  ttlDays: number = DEFAULT_TTL_DAYS,
): boolean {
  if (!exploredAt) return true
  const parsed = Date.parse(exploredAt)
  if (Number.isNaN(parsed)) return true
  const ageMs = Date.now() - parsed
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000
  return ageMs > ttlMs
}

/**
 * Inverse de shouldRegenerate — utile pour les conditions d'affichage
 * "la donnée est-elle encore fraîche ?".
 */
export function isFresh(
  exploredAt: string | null | undefined,
  ttlDays: number = DEFAULT_TTL_DAYS,
): boolean {
  return !shouldRegenerate(exploredAt, ttlDays)
}

/** Nombre de jours depuis la dernière exploration (null si inexplorée). */
export function ageInDays(exploredAt: string | null | undefined): number | null {
  if (!exploredAt) return null
  const parsed = Date.parse(exploredAt)
  if (Number.isNaN(parsed)) return null
  return Math.floor((Date.now() - parsed) / (24 * 60 * 60 * 1000))
}

export const TTL_DAYS = DEFAULT_TTL_DAYS
