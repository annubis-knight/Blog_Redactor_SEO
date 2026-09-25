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

/** Un titre de la structure Hn : niveau 1 à 6 (nombre), texte. */
const hnNodeSchema = z.object({
  level: z.number().int().min(1).max(6),
  text: z.string(),
})

/**
 * Structure Hn d'un article (onglet Structure, FR-HN-TAB), telle que la lisent
 * la porte `hn-lock` et le sommaire de la rédaction. Un titre vide reste admis :
 * c'est la porte qui le refuse (⛔), pas l'enregistrement d'une saisie en cours.
 */
export const hnStructureSchema = z.array(hnNodeSchema.extend({
  children: z.array(hnNodeSchema).optional(),
}))
