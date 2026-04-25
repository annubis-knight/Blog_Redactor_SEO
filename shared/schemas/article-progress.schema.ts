import { z } from 'zod/v4'
import { articlePhaseSchema } from './shared-enums.schema.js'

export const articleProgressSchema = z.object({
  phase: articlePhaseSchema,
  completedChecks: z.array(z.string()).default([]),
})

export type ArticleProgressInput = z.infer<typeof articleProgressSchema>

export const addCheckSchema = z.object({
  check: z.string().min(1),
})
