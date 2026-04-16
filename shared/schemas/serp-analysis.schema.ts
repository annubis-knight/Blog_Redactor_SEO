import { z } from 'zod/v4'
import { articleLevelSchema } from './shared-enums.schema.js'

export const serpAnalyzeBodySchema = z.object({
  keyword: z.string().min(1, 'keyword is required'),
  topN: z.number().int().min(3).max(10).default(10),
  articleLevel: articleLevelSchema.default('intermediaire'),
})

export type SerpAnalyzeBody = z.infer<typeof serpAnalyzeBodySchema>
