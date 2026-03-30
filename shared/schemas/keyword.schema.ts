import { z } from 'zod/v4'

export const rawKeywordSchema = z.object({
  mot_clef: z.string().min(1),
  cocon_seo: z.string().min(1),
  type_mot_clef: z.enum(['Pilier', 'Moyenne traine', 'Longue traine', 'Intermédiaire', 'Spécialisé']),
  statut: z.enum(['suggested', 'validated', 'rejected']).optional(),
})

export const rawKeywordsDbSchema = z.object({
  seo_data: z.array(rawKeywordSchema).min(1),
})
