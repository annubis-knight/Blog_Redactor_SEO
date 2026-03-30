import { z } from 'zod/v4'

export const internalLinkSchema = z.object({
  sourceSlug: z.string().min(1),
  targetSlug: z.string().min(1),
  anchorText: z.string().min(1),
  position: z.string().min(1),
})

export const linkingMatrixSchema = z.object({
  links: z.array(internalLinkSchema),
  updatedAt: z.string().nullable(),
})

export const suggestLinksRequestSchema = z.object({
  articleSlug: z.string().min(1),
  content: z.string().min(1),
})

export const saveLinksRequestSchema = z.object({
  links: z.array(internalLinkSchema).min(1),
})

export type SuggestLinksRequest = z.infer<typeof suggestLinksRequestSchema>
export type SaveLinksRequest = z.infer<typeof saveLinksRequestSchema>
