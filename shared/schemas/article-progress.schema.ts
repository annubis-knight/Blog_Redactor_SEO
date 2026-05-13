import { z } from 'zod/v4'
import { articlePhaseSchema } from './shared-enums.schema.js'

/**
 * Format strict checks : `moteur:<snake_case>`. Rejette legacy sans préfixe
 * (causait doublons DB + dots non-rendus) ainsi que les anciens préfixes
 * `cerveau:*` / `redaction:*` retirés 2026-05-13 (cf. DRIFT-002).
 * Utiliser constantes `shared/constants/workflow-checks.constants.ts`.
 */
const writeCheckRegex = /^moteur:[a-z]+(_[a-z]+)*$/

/**
 * Format tolérant côté lecture : accepte également `cerveau:*` / `redaction:*`
 * pour ne pas casser sur des lignes legacy persistées avant 2026-05-13. Le
 * consommateur d'affichage (`ProgressDots.vue`) filtre lui-même sur le préfixe
 * `moteur:` — les valeurs autres sont silencieusement ignorées.
 */
const readCheckRegex = /^(moteur|cerveau|redaction):[a-z]+(_[a-z]+)*$/

export const articleProgressSchema = z.object({
  phase: articlePhaseSchema,
  completedChecks: z.array(z.string().regex(readCheckRegex)).default([]),
})

export type ArticleProgressInput = z.infer<typeof articleProgressSchema>

export const addCheckSchema = z.object({
  check: z.string().regex(writeCheckRegex, {
    message: 'check must be prefixed `moteur:<snake_case_action>`',
  }),
})
