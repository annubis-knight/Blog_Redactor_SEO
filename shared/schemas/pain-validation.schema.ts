import { z } from 'zod/v4'

export const topDiscussionSchema = z.object({
  title: z.string(),
  domain: z.string(),
  url: z.string(),
  timestamp: z.string(),
  votesCount: z.number(),
})

export const communitySignalSchema = z.object({
  discussionsCount: z.number(),
  uniqueDomains: z.array(z.string()),
  domainDiversity: z.number(),
  avgVotesCount: z.number(),
  freshness: z.enum(['recent', 'moderate', 'old']),
  serpPosition: z.number().nullable(),
  topDiscussions: z.array(topDiscussionSchema),
})

export const autocompleteSignalSchema = z.object({
  suggestionsCount: z.number(),
  suggestions: z.array(z.string()),
  hasKeyword: z.boolean(),
  position: z.number().nullable(),
})

export const painVerdictCategorySchema = z.enum([
  'brulante',
  'confirmee',
  'emergente',
  'latente',
  'froide',
  'incertaine',
])

export const perSourceBreakdownSchema = z.record(
  z.string(),
  z.object({
    score: z.number(),
    weight: z.number(),
    available: z.boolean(),
  }),
)

export const multiSourceVerdictSchema = z.object({
  category: painVerdictCategorySchema,
  confidence: z.number(),
  consensusAgreement: z.number(),
  sourcesAvailable: z.number(),
  sourcesTotal: z.number(),
  perSourceBreakdown: perSourceBreakdownSchema,
})

export const validatePainResultSchema = z.object({
  keyword: z.string(),
  dataforseo: z.object({
    searchVolume: z.number(),
    difficulty: z.number(),
    cpc: z.number(),
    competition: z.number(),
    relatedCount: z.number(),
  }).nullable(),
  community: communitySignalSchema.nullable(),
  autocomplete: autocompleteSignalSchema.nullable(),
  verdict: z.object({
    category: painVerdictCategorySchema,
    confidence: z.number(),
    sourcesAvailable: z.number(),
  }),
})

export const validatePainRequestSchema = z.object({
  keywords: z.array(z.string()).min(1),
})

export const validatePainResponseSchema = z.object({
  results: z.array(validatePainResultSchema),
})
