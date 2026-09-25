import { z } from 'zod/v4'
import { articleTypeSchema } from './shared-enums.schema.js'

export const generateOutlineRequestSchema = z.object({
  articleId: z.number().int().positive(),
  keyword: z.string().min(1),
  keywords: z.array(z.string()),
  paa: z.array(z.object({
    question: z.string(),
    answer: z.string().nullable(),
  })),
  articleType: articleTypeSchema,
  articleTitle: z.string().min(1),
  cocoonName: z.string().min(1),
  topic: z.string().nullable(),
  /**
   * Chapitres récurrents des concurrents SERP, déjà formatés (markdown).
   * Optionnel : le flux manuel ne l'envoie pas et son prompt reste inchangé.
   * Alimenté par le CLI `auto:article`, qui dispose de l'analyse SERP.
   */
  competitorStructure: z.string().optional().default(''),
})

export type GenerateOutlineRequest = z.infer<typeof generateOutlineRequestSchema>

/**
 * Premier jet en un appel (FR-RED-DRAFT-SINGLE-PASS). Ni PAA ni recherche web :
 * les sources viennent à la passe d'enrichissement.
 */
export const generateArticleDraftRequestSchema = z.object({
  articleId: z.number().int().positive(),
  outline: z.union([z.string().min(1), z.record(z.string(), z.unknown())]), // Outline object or JSON string
  keyword: z.string().min(1),
  keywords: z.array(z.string()),
  articleType: articleTypeSchema,
  articleTitle: z.string().min(1),
  cocoonName: z.string().min(1),
  targetWordCount: z.number().int().positive().optional(),
})

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
