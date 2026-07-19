/** Résolution d'un cocon existant par nom (le CLI ne crée pas de cocon). */

export interface CocoonSummary {
  id: number
  name: string
  siloName?: string
}

// Marques diacritiques combinantes U+0300–U+036F (source ASCII → lint-safe).
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

const norm = (s: string): string =>
  s.trim().toLowerCase().normalize('NFD').replace(DIACRITICS, '')

/** Match insensible à la casse et aux accents. Retourne null si absent. */
export function findCocoonByName(cocoons: CocoonSummary[], name: string): CocoonSummary | null {
  const target = norm(name)
  return cocoons.find((c) => norm(c.name) === target) ?? null
}
