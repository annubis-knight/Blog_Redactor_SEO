/** Mapping type d'article affiché (français) → type canonique attendu par l'API. */

import type { ArticleType, CanonicalArticleType } from './types.js'

export function toCanonicalType(t: ArticleType): CanonicalArticleType {
  switch (t) {
    case 'Pilier':
      return 'pilier'
    case 'Spécialisé':
      return 'specifique'
    default:
      return 'intermediaire'
  }
}

/** Inverse : type canonique DB → type affiché (pour la reprise `--resume`). */
export function fromCanonicalType(t: string): ArticleType {
  switch (t) {
    case 'pilier':
      return 'Pilier'
    case 'specifique':
      return 'Spécialisé'
    default:
      return 'Intermédiaire'
  }
}
