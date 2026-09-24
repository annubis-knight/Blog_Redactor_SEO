/**
 * Type d'un mot-clé du pool (`keywords_seo.type_mot_clef`).
 *
 * Deux vocabulaires cohabitent dans le projet :
 *   - le `KeywordType` du pool : `'Pilier'`, `'Intermédiaire'`, `'Spécialisé'`,
 *     `'Moyenne traine'`, `'Longue traine'` — c'est ce que lisent la brief, la
 *     rédaction et le score SEO ;
 *   - le niveau d'article canonique `ArticleLevel` (`'pilier'`…), que le Cerveau
 *     écrivait par erreur dans le pool.
 *
 * Tolérant en lecture (on comprend les deux, casse et accents libres), strict
 * en écriture : la route n'enregistre qu'un `KeywordType`.
 */
import type { KeywordType } from '../types/keyword.types.js'
import { parseArticleLevel, articleLevelToDbType } from './article-level.js'

/** `null` si la valeur ne correspond à aucun type connu : à l'appelant de décider. */
export function parseKeywordType(raw: unknown): KeywordType | null {
  if (typeof raw !== 'string') return null
  const normalise = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
  if (!normalise) return null
  if (normalise === 'moyenne traine') return 'Moyenne traine'
  if (normalise === 'longue traine') return 'Longue traine'
  const level = parseArticleLevel(normalise)
  return level ? articleLevelToDbType(level) : null
}
