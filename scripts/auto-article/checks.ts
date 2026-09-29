/**
 * Émission d'un check de progression Moteur.
 * La string du check vient TOUJOURS des constantes `MOTEUR_*`
 * (shared/constants/workflow-checks.constants.ts) — jamais hardcodée (CLAUDE.md §3).
 *
 * Un check gardé par une porte de qualité (FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE)
 * peut être refusé en 422 `GATE_BLOCKED`. Le script ne déroge JAMAIS à la place
 * d'un humain : il s'arrête et liste les points, pour que l'utilisateur décide
 * dans le Moteur (alarme graduée), puis relance.
 */

import { ApiError, type HttpClient } from './http-client.js'

const LEVEL_ICONS: Record<string, string> = { technique: '⛔', risque: '🔴', attention: '🟠' }

interface GateRefusal {
  gateId?: string
  blocking?: Array<{ level?: string; message?: string; rule?: string }>
}

/** Texte lisible d'un refus de porte, une ligne par point. */
export function describeGateRefusal(check: string, details: unknown): string {
  const refusal = (details ?? {}) as GateRefusal
  const lines = (refusal.blocking ?? []).map(issue =>
    `  ${LEVEL_ICONS[issue.level ?? ''] ?? '•'} ${issue.message ?? issue.rule ?? 'point non décrit'}`,
  )
  // L'étape « premier jet accepté » (C7) se décide dans la Rédaction, les autres au Moteur.
  const where = check.startsWith('redaction:') ? 'la Rédaction' : 'le Moteur'
  return [
    `Étape « ${check} » refusée par la porte${refusal.gateId ? ` ${refusal.gateId}` : ''} :`,
    ...lines,
    `Décidez dans ${where} (corriger, ou déroger en expliquant pourquoi), puis relancez le run.`,
  ].join('\n')
}

export async function emitCheck(client: HttpClient, articleId: number, check: string): Promise<void> {
  try {
    await client.apiPost(`/articles/${articleId}/progress/check`, { check })
  } catch (err) {
    if (err instanceof ApiError && err.code === 'GATE_BLOCKED') {
      throw new ApiError(describeGateRefusal(check, err.details), err.code, err.status, err.details)
    }
    throw err
  }
}

/** Décisions du Moteur telles que `PUT /articles/:id/keywords` les enregistre. */
export interface MoteurDecisions {
  capitaine: string
  lieutenants: string[]
  lexique: string[]
  /** Structure H1/H2/H3 de l'article (pas la récurrence des concurrents). */
  hnStructure: Array<{ level: number; text: string; children?: Array<{ level: number; text: string }> }>
}

/**
 * Enregistre les décisions, PUIS demande l'étape : la porte qui garde l'étape
 * juge ce qui est en base, pas ce que le script a en mémoire. Émettre avant
 * d'enregistrer faisait juger un capitaine absent (⛔) ou des lieutenants vides.
 */
export async function saveThenEmit(
  client: HttpClient,
  articleId: number,
  decisions: MoteurDecisions,
  check: string,
): Promise<void> {
  await client.apiPut(`/articles/${articleId}/keywords`, decisions)
  await emitCheck(client, articleId, check)
}
