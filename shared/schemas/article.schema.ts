import { z } from 'zod/v4'

export const rawArticleSchema = z.object({
  titre: z.string().min(1),
  type: z.enum(['Pilier', 'Intermédiaire', 'Spécialisé']),
  slug: z.string().min(1),
  theme: z.string().nullable(),
})

export const rawCocoonSchema = z.object({
  nom: z.string().min(1),
  articles: z.array(rawArticleSchema).min(1),
})

export const rawArticlesDbSchema = z.object({
  cocons_semantiques: z.array(rawCocoonSchema).min(1),
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
