import { z } from 'zod/v4'

export const generateOutlineRequestSchema = z.object({
  slug: z.string().min(1),
  keyword: z.string().min(1),
  keywords: z.array(z.string()),
  paa: z.array(z.object({
    question: z.string(),
    answer: z.string().nullable(),
  })),
  articleType: z.enum(['Pilier', 'Intermédiaire', 'Spécialisé']),
  articleTitle: z.string().min(1),
  cocoonName: z.string().min(1),
  topic: z.string().nullable(),
})

export type GenerateOutlineRequest = z.infer<typeof generateOutlineRequestSchema>

export const generateArticleRequestSchema = z.object({
  slug: z.string().min(1),
  outline: z.string().min(1), // JSON stringified Outline
  keyword: z.string().min(1),
  keywords: z.array(z.string()),
  paa: z.array(z.object({
    question: z.string(),
    answer: z.string().nullable(),
  })),
  articleType: z.enum(['Pilier', 'Intermédiaire', 'Spécialisé']),
  articleTitle: z.string().min(1),
  cocoonName: z.string().min(1),
  topic: z.string().nullable(),
})

export type GenerateArticleRequest = z.infer<typeof generateArticleRequestSchema>

export const generateMetaRequestSchema = z.object({
  slug: z.string().min(1),
  keyword: z.string().min(1),
  articleTitle: z.string().min(1),
  articleContent: z.string().min(1),
})

export type GenerateMetaRequest = z.infer<typeof generateMetaRequestSchema>

export const generateActionRequestSchema = z.object({
  actionType: z.enum([
    'reformulate', 'simplify', 'convert-list',
    'pme-example', 'keyword-optimize', 'add-statistic',
    'answer-capsule', 'question-heading', 'internal-link',
  ]),
  selectedText: z.string().min(1),
  articleSlug: z.string().min(1),
  keyword: z.string().optional(),
  keywords: z.array(z.string()).optional(),
})

export type GenerateActionRequest = z.infer<typeof generateActionRequestSchema>
