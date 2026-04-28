/**
 * Similarité Jaccard front-only entre un terme et un painPoint.
 *
 * Utilisé par le toggle « Trier par alignement douleur » du Lexique (Sprint S2).
 * Calcul léger, pas d'appel API. Mots significatifs ≥ 4 caractères pour ignorer
 * les stopwords courts français (le, la, des, mes, …) sans avoir besoin
 * d'une liste explicite.
 */

function normalizeWords(input: string): string[] {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4)
}

/**
 * Retourne un score Jaccard ∈ [0, 1] entre `term` et `painPoint`.
 * Renvoie 0 si painPoint est falsy ou si l'un des deux ensembles est vide.
 */
export function jaccardWithPainPoint(term: string, painPoint: string | null | undefined): number {
  if (!painPoint || painPoint.trim() === '') return 0
  const a = new Set(normalizeWords(term))
  const b = new Set(normalizeWords(painPoint))
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const w of a) if (b.has(w)) inter++
  return inter / (a.size + b.size - inter)
}

/**
 * Trie un tableau de termes par alignement Jaccard décroissant avec le painPoint.
 * Si `painPoint` est falsy ou si `enabled` est false, retourne le tableau original (réf identique).
 */
export function sortByPainAlignmentJaccard<T extends { term: string }>(
  terms: T[],
  painPoint: string | null | undefined,
  enabled: boolean,
): T[] {
  if (!enabled || !painPoint) return terms
  return [...terms].sort((x, y) =>
    jaccardWithPainPoint(y.term, painPoint) - jaccardWithPainPoint(x.term, painPoint),
  )
}
