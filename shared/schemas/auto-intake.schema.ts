import { z } from 'zod/v4'
import { articleTypeSchema } from './shared-enums.schema.js'

/**
 * Contrat de l'intake auto (POST /api/generate/auto-intake).
 *
 * Entrée : une description vague de sujet + contexte business. Sortie : un brief
 * éditorial structuré qui alimente la création d'article + la stratégie Cerveau
 * du pipeline CLI `auto:article`. Voir epic-auto-article-pipeline.md §7.5.
 */

export const autoIntakeRequestSchema = z.object({
  topic: z.string().min(1),
  businessContext: z.string().optional().default(''),
  cocoonName: z.string().optional().default(''),
  articleType: articleTypeSchema.optional(),
})

export type AutoIntakeRequest = z.infer<typeof autoIntakeRequestSchema>

export const autoIntakeResponseSchema = z.object({
  articleTitle: z.string().min(1),
  pilierKeyword: z.string().min(1),
  painPoint: z.string().min(1),
  cible: z.string().min(1),
  douleur: z.string().min(1),
  angle: z.string().min(1),
  promesse: z.string().min(1),
  cta: z.string().min(1),
})

export type AutoIntake = z.infer<typeof autoIntakeResponseSchema>
