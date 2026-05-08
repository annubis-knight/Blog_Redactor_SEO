import { z } from 'zod/v4'
import { articlePhaseSchema } from './shared-enums.schema.js'

/**
 * 2026-05-08 — Format strict des checks workflow : `<prefix>:<snake_case>`.
 * Préfixes autorisés : `moteur`, `cerveau`, `redaction`. Rejette tout legacy
 * sans préfixe (`capitaine_locked`, `brief-validated`, etc.) qui causait des
 * doublons en DB et des dots ProgressDots non-rendus.
 *
 * Cf. FR-MOT-CHECKS-CONSTANTS dans le PRD : utiliser uniquement les constantes
 * exportées par `shared/constants/workflow-checks.constants.ts`.
 */
const workflowCheckRegex = /^(moteur|cerveau|redaction):[a-z]+(_[a-z]+)*$/

export const articleProgressSchema = z.object({
  phase: articlePhaseSchema,
  completedChecks: z.array(z.string().regex(workflowCheckRegex)).default([]),
})

export type ArticleProgressInput = z.infer<typeof articleProgressSchema>

export const addCheckSchema = z.object({
  check: z.string().regex(workflowCheckRegex, {
    message: 'check must be prefixed: <moteur|cerveau|redaction>:<snake_case_action>',
  }),
})
