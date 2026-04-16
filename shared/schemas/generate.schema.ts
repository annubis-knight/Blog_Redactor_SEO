import { z } from 'zod/v4'

export const generateOutlineRequestSchema = z.object({
  articleId: z.number().int().positive(),
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
  articleId: z.number().int().positive(),
  outline: z.union([z.string().min(1), z.record(z.string(), z.unknown())]), // Outline object or JSON string
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
  targetWordCount: z.number().int().positive().optional(),
  webSearchEnabled: z.boolean().optional().default(true),
})

export type GenerateArticleRequest = z.infer<typeof generateArticleRequestSchema>

export const generateMetaRequestSchema = z.object({
  articleId: z.number().int().positive(),
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
    'sources-chiffrees', 'exemples-reels', 'ce-quil-faut-retenir',
  ]),
  selectedText: z.string().min(1),
  articleId: z.number().int().positive(),
  keyword: z.string().optional(),
  keywords: z.array(z.string()).optional(),
})

export type GenerateActionRequest = z.infer<typeof generateActionRequestSchema>

export const generateReduceSectionRequestSchema = z.object({
  articleId: z.number().int().positive(),
  sectionHtml: z.string().min(1),
  sectionIndex: z.number().int().nonnegative(),
  sectionTitle: z.string(),
  targetWordCount: z.number().int().positive(),
  currentWordCount: z.number().int().positive(),
  keyword: z.string().min(1),
  keywords: z.array(z.string()),
})

export type GenerateReduceSectionRequest = z.infer<typeof generateReduceSectionRequestSchema>

export const generateHumanizeSectionRequestSchema = z.object({
  articleId: z.number().int().positive(),
  sectionHtml: z.string().min(1),
  sectionIndex: z.number().int().nonnegative(),
  sectionTitle: z.string(),
  keyword: z.string().min(1),
  keywords: z.array(z.string()),
})

export type GenerateHumanizeSectionRequest = z.infer<typeof generateHumanizeSectionRequestSchema>
