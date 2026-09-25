import { z } from 'zod/v4'
import { articleLevelSchema } from './shared-enums.schema.js'

export const serpAnalyzeBodySchema = z.object({
  keyword: z.string().min(1, 'keyword is required'),
  topN: z.number().int().min(3).max(10).default(10),
  articleLevel: articleLevelSchema.default('intermediaire'),
  /**
   * Relire l'analyse en base, même périmée, sans jamais appeler DataForSEO :
   * `{ data: null }` s'il n'y en a pas. Pour un affichage à l'ouverture d'un
   * onglet, qui ne doit rien payer sans clic (FR-MOT-NO-AUTO-ACTION, M18).
   */
  cacheOnly: z.boolean().optional(),
})

export type SerpAnalyzeBody = z.infer<typeof serpAnalyzeBodySchema>
