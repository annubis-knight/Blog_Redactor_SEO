import { z } from 'zod/v4'

/**
 * Shared Zod enums used across multiple schemas.
 * Single source of truth — modify values here only.
 */

/** Article type (3 levels of strategic depth) */
export const articleTypeSchema = z.enum(['Pilier', 'Intermédiaire', 'Spécialisé'])

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
