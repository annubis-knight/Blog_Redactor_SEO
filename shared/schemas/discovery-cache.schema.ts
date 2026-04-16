import { z } from 'zod/v4'
import { articleTypeSchema, keywordTypeSchema } from './shared-enums.schema.js'

const discoverySourceSchema = z.enum([
  'autocomplete', 'ai', 'dataforseo',
  'suggest-alphabet', 'suggest-questions',
  'suggest-intents', 'suggest-prepositions',
])

const discoveredKeywordSchema = z.object({
  keyword: z.string().min(1),
  source: discoverySourceSchema,
  reasoning: z.string().optional(),
  sourceDetail: z.string().optional(),
  searchVolume: z.number().optional(),
  difficulty: z.number().optional(),
  cpc: z.number().optional(),
  intent: z.string().optional(),
  type: keywordTypeSchema.optional(),
})

const wordGroupSchema = z.object({
  word: z.string(),
  count: z.number(),
  normalized: z.string(),
})

const analyzedKeywordSchema = z.object({
  keyword: z.string().min(1),
  reasoning: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
})

const discoveryContextSchema = z.object({
  cocoonName: z.string(),
  cocoonTheme: z.string().optional(),
  articleTitle: z.string().optional(),
  articleKeyword: z.string().optional(),
  articleType: articleTypeSchema.optional(),
  painPoint: z.string().optional(),
  seedKeyword: z.string().min(1),
})

export const saveDiscoveryCacheSchema = z.object({
  seed: z.string().min(1),
  context: discoveryContextSchema,
  suggestAlphabet: z.array(discoveredKeywordSchema),
  suggestQuestions: z.array(discoveredKeywordSchema),
  suggestIntents: z.array(discoveredKeywordSchema),
  suggestPrepositions: z.array(discoveredKeywordSchema),
  aiKeywords: z.array(discoveredKeywordSchema),
  dataforseoKeywords: z.array(discoveredKeywordSchema),
  relevanceScores: z.record(z.string(), z.number()),
  wordGroups: z.array(wordGroupSchema),
  analysisResult: z.object({
    keywords: z.array(analyzedKeywordSchema),
    summary: z.string(),
  }).nullable(),
})
