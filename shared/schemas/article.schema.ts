import { z } from 'zod/v4'

export const rawArticleSchema = z.object({
  id: z.number().int().positive(),
  titre: z.string().min(1),
  type: z.enum(['Pilier', 'Intermédiaire', 'Spécialisé']),
  slug: z.string().min(1),
  topic: z.string().nullable(),
  status: z.enum(['à rédiger', 'brouillon', 'publié']).optional(),
  phase: z.enum(['proposed', 'moteur', 'redaction', 'published']).optional(),
  completedChecks: z.array(z.string()).optional(),
  checkTimestamps: z.record(z.string(), z.string()).optional(),
  /** Keyword suggéré (copié depuis strategies/*.json proposedArticles[].suggestedKeyword à la création) */
  suggestedKeyword: z.string().nullable().optional(),
  /** Keyword Capitaine locké (miroir de richCaptain.keyword quand richCaptain.status='locked') */
  captainKeywordLocked: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const rawCocoonSchema = z.object({
  nom: z.string().min(1),
  articles: z.array(rawArticleSchema),
})

export const rawSiloSchema = z.object({
  nom: z.string().min(1),
  description: z.string(),
  cocons: z.array(rawCocoonSchema).min(1),
})

export const rawThemeSchema = z.object({
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
  status: z.enum(['à rédiger', 'brouillon', 'publié']),
})

export type UpdateArticleStatusRequest = z.infer<typeof updateArticleStatusSchema>

export const batchCreateArticlesSchema = z.object({
  cocoonName: z.string().min(1),
  articles: z.array(z.object({
    title: z.string().min(1),
    type: z.enum(['Pilier', 'Intermédiaire', 'Spécialisé']),
    slug: z.string().optional(),
    suggestedKeyword: z.string().nullable().optional(),
  })).min(1),
})

export const patchArticleSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
})

export type PatchArticleRequest = z.infer<typeof patchArticleSchema>
