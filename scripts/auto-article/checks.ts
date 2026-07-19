/**
 * Émission d'un check de progression Moteur.
 * La string du check vient TOUJOURS des constantes `MOTEUR_*`
 * (shared/constants/workflow-checks.constants.ts) — jamais hardcodée (CLAUDE.md §3).
 */

import type { HttpClient } from './http-client.js'

export async function emitCheck(client: HttpClient, articleId: number, check: string): Promise<void> {
  await client.apiPost(`/articles/${articleId}/progress/check`, { check })
}
