import { z } from 'zod/v4'
import { keywordTypeSchema, keywordStatusSchema } from './shared-enums.schema.js'

const rawKeywordSchema = z.object({
  mot_clef: z.string().min(1),
  cocon_seo: z.string().min(1),
  type_mot_clef: keywordTypeSchema,
  statut: keywordStatusSchema.optional(),
})

export const rawKeywordsDbSchema = z.object({
  _schemaVersion: z.number().optional(),
  seo_data: z.array(rawKeywordSchema).min(1),
})
