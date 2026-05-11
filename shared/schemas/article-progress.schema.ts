import { z } from 'zod/v4'
import { articlePhaseSchema } from './shared-enums.schema.js'

/**
 * Format strict checks : `<prefix>:<snake_case>` (moteur|cerveau|redaction).
 * Rejette legacy sans préfixe (causait doublons DB + dots non-rendus).
 * Utiliser constantes `shared/constants/workflow-checks.constants.ts`.
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
