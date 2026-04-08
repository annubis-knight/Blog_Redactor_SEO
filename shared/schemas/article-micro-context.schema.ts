import { z } from 'zod/v4'

export const articleMicroContextSchema = z.object({
  slug: z.string().min(1),
  angle: z.string(),
  tone: z.string().optional().default(''),
  directives: z.string().optional().default(''),
  targetWordCount: z.number().min(500).max(10000).optional(),
  updatedAt: z.string(),
})

export const microContextDbSchema = z.object({
  micro_contexts: z.array(articleMicroContextSchema),
})

/** Zod schema for PUT /api/articles/:slug/micro-context request body */
export const updateMicroContextSchema = z.object({
  angle: z.string().max(2000),
  tone: z.string().max(500).optional().default(''),
  directives: z.string().max(5000).optional().default(''),
  targetWordCount: z.number().min(500).max(10000).optional(),
})
