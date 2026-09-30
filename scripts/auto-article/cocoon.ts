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

/** Nom de cocon comparé sans la casse ni les espaces (réponse tapée, `--cocoon`). */
export function sameCocoonName(a: string, b: string): boolean {
  const key = (s: string) => s.toLowerCase().replace(/\s+/g, '')
  return key(a) === key(b)
}

export type CocoonAnswer =
  | { kind: 'none' }
  | { kind: 'found'; name: string }
  | { kind: 'unknown' }
  | { kind: 'ambiguous'; names: string[] }

/**
 * Lit la réponse à « Cocon cible » (recette du 2026-09-30, PU-06) : vide → le
 * script propose ; un cocon existant (sans compter la casse ni les espaces) →
 * il impose l'emplacement, comme `--cocoon`, sous son nom exact ; sinon le nom
 * est inconnu. Deux cocons qui ne diffèrent que par la casse : le nom tapé
 * à l'identique l'emporte, sinon la réponse est ambiguë.
 */
export function resolveCocoonAnswer(names: readonly string[], answer: string): CocoonAnswer {
  const typed = answer.trim()
  if (!typed) return { kind: 'none' }
  const exact = names.find((n) => n.trim() === typed)
  if (exact) return { kind: 'found', name: exact }
  const matches = [...new Set(names.filter((n) => sameCocoonName(n, typed)))]
  if (matches.length === 1) return { kind: 'found', name: matches[0]! }
  if (matches.length > 1) return { kind: 'ambiguous', names: matches }
  return { kind: 'unknown' }
}
