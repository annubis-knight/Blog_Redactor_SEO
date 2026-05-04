import { z } from 'zod/v4'

/**
 * Une suggestion longue-traîne produite par l'IA à partir des mots-clés
 * Radar racines. Score de PRÉFÉRENCE sur 10 — n'a aucun lien avec
 * marketScore (Radar) ou relevanceScore (Capitaine), c'est un critère IA
 * isolé pour aider l'utilisateur à choisir.
 */
export const longTailSuggestionSchema = z.object({
  keyword: z.string().min(2).max(120),
  rationale: z.string().min(10).max(500),
  preferenceScore: z.number().int().min(1).max(10),
  derivedFromRoots: z.array(z.string()).min(1).max(5),
})

export const longTailSuggestionsResponseSchema = z.object({
  suggestions: z.array(longTailSuggestionSchema).max(10),
})

/** Body POST /articles/:id/radar-exploration/long-tail */
export const longTailSuggestRequestSchema = z.object({
  radarKeywords: z
    .array(
      z.object({
        keyword: z.string().min(1),
      }),
    )
    .min(2),
  articleTitle: z.string().default(''),
  articlePainPoint: z.string().default(''),
  strategyContext: z.string().default(''),
})

/** Body PATCH /articles/:id/radar-exploration/long-tail/selection */
export const longTailSelectionPatchSchema = z.object({
  selectedKeywords: z.array(z.string()),
})

export type LongTailSuggestion = z.infer<typeof longTailSuggestionSchema>
export type LongTailSuggestionsResponse = z.infer<typeof longTailSuggestionsResponseSchema>
export type LongTailSuggestRequest = z.infer<typeof longTailSuggestRequestSchema>
export type LongTailSelectionPatch = z.infer<typeof longTailSelectionPatchSchema>
