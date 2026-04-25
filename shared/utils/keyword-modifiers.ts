import { FRENCH_CITIES_SET } from '../data/french-cities.js'

export type ModifierKind = 'local' | 'persona' | null

/**
 * Retourne un tableau aligné sur les mots du keyword : le kind détecté pour
 * chaque mot (ou null si aucun). Respecte l'ordre et la casse d'origine.
 *
 * Heuristique v1 :
 *  - `local`   : mot présent dans FRENCH_CITIES_SET (lowercase, sans ponctuation)
 *  - `persona` : mot qui suit "pour" ou "pour les/la/des/un/une" — signale
 *                une cible/audience ("outil seo pour freelance" → freelance).
 *
 * Note : les mots grammaticaux qui aident à détecter (ex: "pour") restent
 * marqués null ; on marque seulement le terme signifiant.
 */
export function detectModifiers(keyword: string): ModifierKind[] {
  const words = keyword.trim().split(/\s+/)
  const result: ModifierKind[] = new Array(words.length).fill(null)

  for (let i = 0; i < words.length; i++) {
    const raw = words[i]!
    const lower = normalize(raw)

    // Local : match dans la liste villes/régions
    if (FRENCH_CITIES_SET.has(lower)) {
      result[i] = 'local'
      continue
    }

    // Persona : "pour X" ou "pour les/la/des/un/une X" → X est persona
    // On ignore les déterminants (le/la/les/des/un/une) quand ils suivent "pour",
    // pour ne marquer que le vrai terme signifiant.
    const DETERMINERS = ['le', 'la', 'les', 'des', 'un', 'une']
    const prev1 = i >= 1 ? normalize(words[i - 1]!) : ''
    const prev2 = i >= 2 ? normalize(words[i - 2]!) : ''
    const currentIsDeterminer = DETERMINERS.includes(lower)

    if (prev1 === 'pour' && !currentIsDeterminer) {
      result[i] = 'persona'
      continue
    }
    if (prev2 === 'pour' && DETERMINERS.includes(prev1)) {
      result[i] = 'persona'
      continue
    }
  }

  return result
}

/** Normalise un mot : minuscule + suppression ponctuation + accents de base. */
function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '')
}
