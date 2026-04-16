import { z } from 'zod/v4'

const articleMicroContextSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1),
  angle: z.string(),
  tone: z.string().optional().default(''),
  directives: z.string().optional().default(''),
  targetWordCount: z.number().min(500).max(10000).optional(),
  updatedAt: z.string(),
})

export const microContextDbSchema = z.object({
  _schemaVersion: z.number().optional(),
  micro_contexts: z.array(articleMicroContextSchema),
})

/** Zod schema for PUT /api/articles/:id/micro-context request body */
export const updateMicroContextSchema = z.object({
  angle: z.string().max(2000),
  tone: z.string().max(500).optional().default(''),
  directives: z.string().max(5000).optional().default(''),
  targetWordCount: z.number().min(500).max(10000).optional(),
})
