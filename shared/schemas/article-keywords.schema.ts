import { z } from 'zod/v4'
import { articleLevelSchema } from './shared-enums.schema.js'

// ---- KPI summary (lightweight: name + rawValue only) ----

const kpiSummarySchema = z.object({
  name: z.string(),
  rawValue: z.number(),
})

// ---- PAA question ----

const paaQuestionValidateSchema = z.object({
  question: z.string(),
  answer: z.string().nullable(),
  match: z.enum(['none', 'partial', 'total']).optional(),
  matchQuality: z.enum(['exact', 'stem']).optional(),
})

// ---- Rich captain schemas ----

const captainValidationEntrySchema = z.object({
  keyword: z.string().min(1),
  kpis: z.array(kpiSummarySchema),
  articleLevel: articleLevelSchema,
  rootKeywords: z.array(z.string()),
  paaQuestions: z.array(paaQuestionValidateSchema).optional(),
  aiPanelMarkdown: z.string().nullable().optional(),
})

const richCaptainSchema = z.object({
  keyword: z.string(),
  status: z.enum(['suggested', 'locked']),
  validationHistory: z.array(captainValidationEntrySchema),
  aiPanelMarkdown: z.string().nullable(),
  lockedAt: z.string().nullable(),
})

// ---- Rich root keyword schema ----

const richRootKeywordSchema = z.object({
  keyword: z.string().min(1),
  parentKeyword: z.string().min(1),
  kpis: z.array(kpiSummarySchema),
  articleLevel: articleLevelSchema,
  timestamp: z.string(),
})

// ---- Rich lieutenant schema ----

const richLieutenantSchema = z.object({
  keyword: z.string().min(1),
  status: z.enum(['suggested', 'locked', 'eliminated']),
  reasoning: z.string(),
  sources: z.array(z.enum(['paa', 'serp', 'group', 'root', 'content-gap'])),
  suggestedHnLevel: z.union([z.literal(2), z.literal(3)]),
  score: z.number(),
  kpis: z.array(kpiSummarySchema).nullable(),
  lockedAt: z.string().nullable(),
})

// ---- Main article keywords schema ----

const articleKeywordsSchema = z.object({
  articleId: z.number().int().positive(),
  capitaine: z.string(),
  lieutenants: z.array(z.string()),
  lexique: z.array(z.string()),
  rootKeywords: z.array(z.string()).optional().default([]),
  hnStructure: z.array(z.object({
    level: z.number(),
    text: z.string(),
    children: z.array(z.object({ level: z.number(), text: z.string() })).optional(),
  })).optional().default([]),
  richCaptain: richCaptainSchema.optional(),
  richRootKeywords: z.array(richRootKeywordSchema).optional(),
  richLieutenants: z.array(richLieutenantSchema).optional(),
})

export const rawArticleKeywordsDbSchema = z.object({
  _schemaVersion: z.number().optional(),
  keywords_par_article: z.array(articleKeywordsSchema),
})
