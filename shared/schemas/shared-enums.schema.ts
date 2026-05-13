import { z } from 'zod/v4'

/**
 * Shared Zod enums used across multiple schemas.
 * Single source of truth — modify values here only.
 */

/**
 * Article type (3 levels of strategic depth) — canonique kebab-case côté code
 * (cf. TD-DRIFT-004). Pour le format DB PascalCase français de `articles.type`,
 * utiliser `articleTypeDbToLevel` / `articleLevelToDbType` (shared/utils/article-level.ts).
 *
 * Note : alias `articleTypeSchema` conservé pour retrocompat — c'est le même
 * enum que `articleLevelSchema` ci-dessous.
 */
export const articleTypeSchema = z.enum(['pilier', 'intermediaire', 'specifique'])

/** Article publication status */
export const articleStatusSchema = z.enum(['à rédiger', 'brouillon', 'publié'])

/** Article workflow phase */
export const articlePhaseSchema = z.enum(['proposed', 'moteur', 'redaction', 'published'])

/** Keyword type (5 SEO depth levels) */
export const keywordTypeSchema = z.enum([
  'Pilier',
  'Moyenne traine',
  'Longue traine',
  'Intermédiaire',
  'Spécialisé',
])

/** Keyword validation status in moteur workflow */
export const keywordStatusSchema = z.enum(['suggested', 'validated', 'rejected'])

/** Article level (lowercase, used for SERP analysis tiers) */
export const articleLevelSchema = z.enum(['pilier', 'intermediaire', 'specifique'])
