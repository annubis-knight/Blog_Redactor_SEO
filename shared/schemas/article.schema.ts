import { z } from 'zod/v4'
import {
  articleTypeSchema,
  articleStatusSchema,
  articlePhaseSchema,
} from './shared-enums.schema.js'
import { painIntentExpectedSchema } from './strategy.schema.js'

const rawArticleSchema = z.object({
  id: z.number().int().positive(),
  titre: z.string().min(1),
  type: articleTypeSchema,
  slug: z.string().min(1),
  topic: z.string().nullable(),
  status: articleStatusSchema.optional(),
  phase: articlePhaseSchema.optional(),
  completedChecks: z.array(z.string()).optional(),
  checkTimestamps: z.record(z.string(), z.string()).optional(),
  /** Keyword suggéré (copié depuis strategies/*.json proposedArticles[].suggestedKeyword à la création) */
  suggestedKeyword: z.string().nullable().optional(),
  /** Keyword Capitaine locké (miroir de richCaptain.keyword quand richCaptain.status='locked') */
  captainKeywordLocked: z.string().nullable().optional(),
  /** Pain point issu de la stratégie */
  painPoint: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

const rawCocoonSchema = z.object({
  nom: z.string().min(1),
  articles: z.array(rawArticleSchema),
})

const rawSiloSchema = z.object({
  nom: z.string().min(1),
  description: z.string(),
  cocons: z.array(rawCocoonSchema).min(1),
})

const rawThemeSchema = z.object({
  nom: z.string().min(1),
  description: z.string(),
})

export const rawArticlesDbSchema = z.object({
  _schemaVersion: z.number().optional(),
  theme: rawThemeSchema,
  silos: z.array(rawSiloSchema).min(1),
})

export const updateArticleContentSchema = z.object({
  outline: z.union([z.string(), z.record(z.string(), z.unknown())]).nullable().optional(),
  content: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  seoScore: z.number().nullable().optional(),
  geoScore: z.number().nullable().optional(),
})

export type UpdateArticleContentRequest = z.infer<typeof updateArticleContentSchema>

export const updateArticleStatusSchema = z.object({
  status: articleStatusSchema,
})

export type UpdateArticleStatusRequest = z.infer<typeof updateArticleStatusSchema>

/**
 * Création d'UN article dans un cocon (FR-CER-COCOON-PROGRESSIVE) : pilier
 * d'abord, puis chaque enfant depuis une section (`parentSection`, un H2) de son
 * parent. Remplace la création en lot (K6).
 */
export const createCocoonArticleSchema = z.object({
  title: z.string().trim().min(3).max(200),
  type: articleTypeSchema,
  parentId: z.number().int().positive().nullable().optional(),
  parentSection: z.string().trim().min(1).max(300).nullable().optional(),
  slug: z.string().trim().min(1).max(200).optional(),
  suggestedKeyword: z.string().trim().min(1).max(200).nullable().optional(),
  painPoint: z.string().trim().max(2000).nullable().optional(),
  painIntentExpected: painIntentExpectedSchema.nullable().optional(),
})

export type CreateCocoonArticleRequest = z.infer<typeof createCocoonArticleSchema>

export const patchArticleSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  painIntentExpected: painIntentExpectedSchema.optional(),
})

export type PatchArticleRequest = z.infer<typeof patchArticleSchema>
