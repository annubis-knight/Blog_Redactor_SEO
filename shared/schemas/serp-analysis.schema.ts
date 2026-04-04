import { z } from 'zod'

export const serpAnalyzeBodySchema = z.object({
  keyword: z.string().min(1, 'keyword is required'),
  topN: z.number().int().min(3).max(10).default(10),
  articleLevel: z.enum(['pilier', 'intermediaire', 'specifique']).default('intermediaire'),
})

export type SerpAnalyzeBody = z.infer<typeof serpAnalyzeBodySchema>
