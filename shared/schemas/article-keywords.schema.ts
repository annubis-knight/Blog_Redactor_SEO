import { z } from 'zod/v4'

export const articleKeywordsSchema = z.object({
  articleSlug: z.string().min(1),
  capitaine: z.string(),
  lieutenants: z.array(z.string()),
  lexique: z.array(z.string()),
  rootKeywords: z.array(z.string()).optional().default([]),
  hnStructure: z.array(z.object({
    level: z.number(),
    text: z.string(),
    children: z.array(z.object({ level: z.number(), text: z.string() })).optional(),
  })).optional().default([]),
})

export const rawArticleKeywordsDbSchema = z.object({
  keywords_par_article: z.array(articleKeywordsSchema),
})
