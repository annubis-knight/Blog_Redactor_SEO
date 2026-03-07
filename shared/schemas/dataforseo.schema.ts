import { z } from 'zod/v4'

export const briefRequestSchema = z.object({
  keyword: z.string().min(1),
  forceRefresh: z.boolean().optional(),
})

export type BriefRequest = z.infer<typeof briefRequestSchema>
