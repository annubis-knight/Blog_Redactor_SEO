import { z } from 'zod/v4'

const internalLinkSchema = z.object({
  sourceId: z.number().int().positive(),
  targetId: z.number().int().positive(),
  anchorText: z.string().min(1),
  position: z.string().min(1),
})

export const suggestLinksRequestSchema = z.object({
  articleId: z.number().int().positive(),
  content: z.string().min(1),
})

export const saveLinksRequestSchema = z.object({
  links: z.array(internalLinkSchema).min(1),
})

export type SuggestLinksRequest = z.infer<typeof suggestLinksRequestSchema>
export type SaveLinksRequest = z.infer<typeof saveLinksRequestSchema>
