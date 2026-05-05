/**
 * Stopwords français pour le calcul des racines de keywords.
 * Partagé entre frontend (useCapitaineValidation) et backend (captain-relevance, keyword-validate).
 */
export const FRENCH_STOPWORDS = new Set([
  // Articles & déterminants
  'le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'un', 'une',
  // Pronoms personnels
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'me', 'te', 'lui', 'se', 'y',
  // Possessifs
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  // Démonstratifs
  'ce', 'cet', 'cette', 'ces',
  // Relatifs & interrogatifs
  'qui', 'que', 'qu', 'dont', 'où', 'comment', 'pourquoi',
  // Prépositions
  'à', 'au', 'aux', 'en', 'par', 'pour', 'sur', 'dans',
  'avec', 'sans', 'sous', 'vers', 'entre',
  // Conjonctions
  'et', 'ou', 'mais', 'donc', 'car', 'or', 'ni', 'si',
  // Négation & adverbes
  'ne', 'pas', 'plus', 'très', 'aussi', 'bien',
  'tout', 'tous', 'toute', 'toutes',
  // Verbes courants
  'est', 'sont', 'a', 'ont', 'fait',
  'être', 'avoir', 'faire', 'dire', 'aller', 'voir',
])

/**
 * Génère toutes les troncations progressives du keyword (de N-1 mots jusqu'à 2 mots min,
 * avec au moins 2 mots significatifs non-stopwords).
 *
 * Algorithme linéaire (FR-CAP-RELEVANCE-LINEAR-ROOTS) :
 *   - Retourne [] si keyword < 3 mots
 *   - Troncations de plus longue à plus courte, max 5 racines
 *   - Stopwords ignorés pour le test de significativité (≥2 mots significatifs requis)
 */
export function extractRoots(keyword: string): string[] {
  const words = keyword.trim().split(/\s+/)
  if (words.length < 3) return []
  const roots: string[] = []
  for (let len = words.length - 1; len >= 2; len--) {
    const significant = words.slice(0, len).filter(w => !FRENCH_STOPWORDS.has(w.toLowerCase()))
    if (significant.length >= 2) roots.push(words.slice(0, len).join(' '))
  }
  return roots.slice(0, 5)
}
