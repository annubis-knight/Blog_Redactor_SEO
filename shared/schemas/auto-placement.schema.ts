import { z } from 'zod/v4'
import { articleTypeSchema } from './shared-enums.schema.js'

/**
 * Contrat de la proposition d'emplacement (POST /api/generate/placement-suggest).
 *
 * Le CLI `auto:article` présélectionne 2-3 cocons candidats par heuristique,
 * l'IA tranche et justifie. Voir epic §7.5bis et audit P-arbre.
 */

const candidateSchema = z.object({
  siloName: z.string().min(1),
  cocoonName: z.string().min(1),
  counts: z.object({
    pilier: z.number().int().min(0),
    intermediaire: z.number().int().min(0),
    specifique: z.number().int().min(0),
  }),
  missing: z.array(articleTypeSchema).default([]),
  suggestedLevel: articleTypeSchema,
  sampleTitles: z.array(z.string()).default([]),
  /** Cocon prévu mais encore sans article — candidat naturel pour un Pilier. */
  isEmpty: z.boolean().default(false),
  /** Proximité thématique 0-1 mesurée par l'heuristique — transmise à l'IA. */
  affinity: z.number().min(0).max(1).default(0),
})

export const placementSuggestRequestSchema = z.object({
  idea: z.string().min(1),
  businessContext: z.string().default(''),
  articleTitle: z.string().default(''),
  pilierKeyword: z.string().default(''),
  painPoint: z.string().default(''),
  candidates: z.array(candidateSchema).min(1),
})

export type PlacementSuggestRequest = z.infer<typeof placementSuggestRequestSchema>

export const placementSuggestResponseSchema = z.object({
  siloName: z.string().min(1),
  cocoonName: z.string().min(1),
  level: articleTypeSchema,
  rationale: z.string().min(1),
  /** true si le cocon proposé n'existe pas encore et doit être créé dans le silo. */
  createCocoon: z.boolean().default(false),
  /**
   * true quand le sujet est étranger à l'activité et n'a sa place nulle part.
   * L'IA propose quand même le moins mauvais emplacement, mais le CLI alerte
   * au Gate 1 plutôt que de ranger silencieusement un contenu hors-champ.
   */
  outOfScope: z.boolean().default(false),
})

export type PlacementSuggestion = z.infer<typeof placementSuggestResponseSchema>
