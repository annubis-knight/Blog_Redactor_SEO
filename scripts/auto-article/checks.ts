/**
 * Émission d'un check de progression Moteur.
 * La string du check vient TOUJOURS des constantes `MOTEUR_*`
 * (shared/constants/workflow-checks.constants.ts) — jamais hardcodée (CLAUDE.md §3).
 *
 * Un check gardé par une porte de qualité (FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE)
 * peut être refusé en 422 `GATE_BLOCKED`. Le script ne déroge JAMAIS à la place
 * d'un humain : il s'arrête et liste les points, pour que l'utilisateur décide
 * dans le Moteur (alarme graduée), puis relance.
 *
 * Une seule exception, décidée par l'utilisateur lui-même (FR-INFRA-VERIFIER-SHARED,
 * recette du 2026-09-30, PU-06) : quand TOUS les points sont 🟠 et qu'un humain
 * est là (run interactif), le script montre les points et demande « J'ai lu,
 * continuer ? [o/N] ». Sur « o », il envoie la même reconnaissance que la case
 * « J'ai lu » de l'alarme (`waiverDraftsFrom`), puis redemande l'étape une fois.
 * Un 🔴 ou un ⛔ garde l'arrêt : ils se décident à l'écran.
 */

import { ApiError, type HttpClient } from './http-client.js'
import { waiverDraftsFrom, type GateEvaluation, type GateIssue } from '../../shared/verifiers/gate.js'

const LEVEL_ICONS: Record<string, string> = { technique: '⛔', risque: '🔴', attention: '🟠' }

interface GateRefusal {
  gateId?: string
  blocking?: Array<{ level?: string; message?: string; rule?: string }>
}

/**
 * L'humain devant le terminal, quand il y en a un (run interactif). Sans lui
 * (`--config`, `--resume`), une porte refusée arrête toujours le run.
 */
export interface GateReader {
  /** Affiche un texte (les points de la porte). */
  show: (text: string) => void
  /** Pose une question fermée ; `true` si l'utilisateur répond oui. */
  confirm: (question: string) => Promise<boolean>
}

export const ACKNOWLEDGE_QUESTION = 'J’ai lu, continuer ? [o/N] › '

/** Vrai si la porte ne lève que des 🟠 : une lecture suffit, comme à l'écran. */
export function isAttentionOnly(details: unknown): details is GateEvaluation {
  const blocking = (details as GateRefusal | undefined)?.blocking
  return Array.isArray(blocking) && blocking.length > 0 && blocking.every(issue => issue.level === 'attention')
}

/** Réponse oui/non du terminal : « o », « oui » (ou « y », « yes ») valent oui. */
export function isYes(answer: string): boolean {
  return /^(o|oui|y|yes)$/i.test(answer.trim())
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

function asRefusal(check: string, err: ApiError): ApiError {
  return new ApiError(describeGateRefusal(check, err.details), err.code, err.status, err.details)
}

/**
 * Porte toute 🟠 : montre les points, demande si l'utilisateur les a lus et,
 * sur « oui », envoie la reconnaissance que l'écran envoie à la case « J'ai lu »
 * (une dérogation `{ rule }` par point, sans catégorie ni raison). Renvoie la
 * nouvelle évaluation de la porte, ou `null` si l'utilisateur ne confirme pas.
 */
async function acknowledgeAttention(
  client: HttpClient,
  articleId: number,
  check: string,
  evaluation: GateEvaluation,
  reader: GateReader,
): Promise<GateEvaluation | null> {
  // Les points, sans la dernière ligne (« Décidez dans le Moteur… relancez le run ») :
  // la décision se prend ici.
  reader.show(describeGateRefusal(check, evaluation).split('\n').slice(0, -1).join('\n'))
  if (!await reader.confirm(ACKNOWLEDGE_QUESTION)) return null
  const answers = Object.fromEntries(evaluation.blocking.map((issue: GateIssue) => [issue.rule, { acknowledged: true }]))
  const { drafts } = waiverDraftsFrom(evaluation.blocking, answers)
  const res = await client.apiPost<{ evaluation: GateEvaluation }>(
    `/articles/${articleId}/gates/${evaluation.gateId}/waivers`,
    { waivers: drafts },
  )
  return res.evaluation
}

export async function emitCheck(client: HttpClient, articleId: number, check: string, reader?: GateReader): Promise<void> {
  const post = () => client.apiPost(`/articles/${articleId}/progress/check`, { check })
  try {
    await post()
  } catch (err) {
    if (!(err instanceof ApiError && err.code === 'GATE_BLOCKED')) throw err
    if (!reader || !isAttentionOnly(err.details)) throw asRefusal(check, err)
    const after = await acknowledgeAttention(client, articleId, check, err.details, reader)
    if (!after) throw asRefusal(check, err)
    // La porte a changé d'avis entre-temps (nouveau point, données modifiées) : on s'arrête.
    if (!after.passed) throw new ApiError(describeGateRefusal(check, after), err.code, err.status, after)
    // Reconnaissance enregistrée : l'étape est redemandée une fois, comme à l'écran.
    try {
      await post()
    } catch (again) {
      if (again instanceof ApiError && again.code === 'GATE_BLOCKED') throw asRefusal(check, again)
      throw again
    }
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
  reader?: GateReader,
): Promise<void> {
  await client.apiPut(`/articles/${articleId}/keywords`, decisions)
  await emitCheck(client, articleId, check, reader)
}
