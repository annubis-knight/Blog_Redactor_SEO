import { z } from 'zod/v4'

export const rawArticleSchema = z.object({
  titre: z.string().min(1),
  type: z.enum(['Pilier', 'Intermédiaire', 'Spécialisé']),
  slug: z.string().min(1),
  topic: z.string().nullable(),
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
  theme: rawThemeSchema,
  silos: z.array(rawSiloSchema).min(1),
})

export const updateArticleContentSchema = z.object({
  outline: z.string().nullable().optional(),
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
  })).min(1),
})
