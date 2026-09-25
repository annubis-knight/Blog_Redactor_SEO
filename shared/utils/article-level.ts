/**
 * Article level — mapper entre la valeur DB et le type canonique côté code.
 *
 * **Source de vérité** : la base de données impose le format PascalCase français
 * pour `articles.type` (CHECK constraint dans `server/db/schema.sql`) :
 *   - `'Pilier'`, `'Intermédiaire'`, `'Spécialisé'`
 *
 * **Canonique côté code** : le code TypeScript utilise uniformément `ArticleLevel`
 * (kebab-case ASCII), qui est aussi le format stocké côté tables liées au
 * pipeline mots-clés (`keywords_seo.article_level`) :
 *   - `'pilier'`, `'intermediaire'`, `'specifique'`
 *
 * **Frontières de conversion** : ce module est appelé exclusivement aux
 * frontières I/O — `rowToArticle()` côté lecture, `insertCocoonArticle()` /
 * écritures côté insert. Tout le reste du code manipule `ArticleLevel`.
 *
 * Cf. TD-DRIFT-004 (drift-code-vs-doc.md) — décision 2026-05-13 :
 * unification vers `ArticleLevel`, `ArticleType` (PascalCase) supprimé du code.
 */
import type { ArticleLevel } from '../types/keyword-validate.types.js'

export const ARTICLE_LEVELS = ['pilier', 'intermediaire', 'specifique'] as const

/** Convertit la valeur DB `articles.type` (PascalCase français) vers le canonique code. */
export function articleTypeDbToLevel(dbValue: string): ArticleLevel {
  switch (dbValue) {
    case 'Pilier': return 'pilier'
    case 'Intermédiaire': return 'intermediaire'
    case 'Spécialisé': return 'specifique'
    default:
      throw new Error(
        `articleTypeDbToLevel: valeur DB inattendue "${dbValue}" — attendues : ` +
        `'Pilier' | 'Intermédiaire' | 'Spécialisé' (cf. server/db/schema.sql articles_type_check)`,
      )
  }
}

/** Convertit le canonique code vers la valeur DB attendue par `articles.type` (CHECK constraint). */
export function articleLevelToDbType(level: ArticleLevel): 'Pilier' | 'Intermédiaire' | 'Spécialisé' {
  switch (level) {
    case 'pilier': return 'Pilier'
    case 'intermediaire': return 'Intermédiaire'
    case 'specifique': return 'Spécialisé'
  }
}

/** Affichage humain (UI, prompts IA) : équivalent du PascalCase mais explicite côté UI. */
export function articleLevelToDisplayLabel(level: ArticleLevel): 'Pilier' | 'Intermédiaire' | 'Spécialisé' {
  return articleLevelToDbType(level)
}

/**
 * Lit un niveau d'article tel qu'une IA le rend, sans exiger un format exact.
 *
 * Les prompts du Cerveau demandent le format de la base (`"type": "Pilier"`),
 * alors que le code attend le canonique (`'pilier'`). Le parseur des
 * propositions comparait à la liste canonique : aucun type renvoyé par l'IA
 * n'était donc jamais reconnu et tous les articles retombaient sur le niveau
 * par défaut. Un passage réel du 2026-09-23 a produit 17 articles tous
 * « Spécialisé », sans pilier ni intermédiaire — un cocon sans tête.
 *
 * On accepte donc les deux formats, la casse libre et les accents optionnels.
 * `null` si la valeur ne correspond à rien de connu, pour que l'appelant
 * choisisse son propre repli plutôt que d'en hériter silencieusement.
 */
export function parseArticleLevel(raw: unknown): ArticleLevel | null {
  if (typeof raw !== 'string') return null
  const normalise = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!normalise) return null
  if (normalise.startsWith('pilier') || normalise.startsWith('pillar')) return 'pilier'
  if (normalise.startsWith('interm')) return 'intermediaire'
  if (normalise.startsWith('spec')) return 'specifique'
  return null
}
