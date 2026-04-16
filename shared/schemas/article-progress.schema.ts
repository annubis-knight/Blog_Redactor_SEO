import { z } from 'zod/v4'
import { articlePhaseSchema } from './shared-enums.schema.js'

export const articleProgressSchema = z.object({
  phase: articlePhaseSchema,
  completedChecks: z.array(z.string()).default([]),
})

export type ArticleProgressInput = z.infer<typeof articleProgressSchema>

export const semanticTermSchema = z.object({
  term: z.string().min(1),
  source: z.enum(['competitor', 'dataforseo', 'autocomplete', 'paa', 'manual']),
  occurrences: z.number().int().min(0).default(0),
  targetCount: z.number().int().min(0).default(1),
})

export const addCheckSchema = z.object({
  check: z.string().min(1),
})

export const addSemanticTermsSchema = z.object({
  terms: z.array(semanticTermSchema).min(1),
})

export const saveSemanticFieldSchema = z.object({
  terms: z.array(semanticTermSchema),
})
