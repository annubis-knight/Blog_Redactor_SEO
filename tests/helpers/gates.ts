/**
 * Portes de qualité, côté tests API (FR-INFRA-GATE-WAIVER).
 *
 * Une étape gardée (capitaine, lieutenants) n'est accordée que si sa porte
 * passe. Un test dont le sujet n'est PAS la porte joue l'utilisateur qui
 * assume : il lit les 🟠, motive les 🔴 avec une vraie raison. Un ⛔ n'a pas
 * de réponse : le test échoue, et c'est voulu.
 */
import { apiGet, apiPost, type ApiResponse } from './api-client.js'
import { CHECK_GATES } from '../../server/services/gates/gate.service.js'
import type { GateEvaluation, GateId } from '../../shared/verifiers/gate.js'

/** Raison assez longue (≥ 20 caractères) pour être acceptée. */
export const TEST_WAIVER_REASON = 'Choix assumé pour ce test : données simulées, sans volume réel'

/**
 * Répond à la porte comme un utilisateur qui assume ; échoue sur un ⛔.
 * Si les données bougent entre la lecture et l'envoi (une mesure arrive en
 * tâche de fond), de nouvelles alertes apparaissent : on relit et on répond
 * encore, comme l'utilisateur qui voit l'alarme revenir (3 essais).
 */
export async function assumeGate(articleId: number, gateId: GateId): Promise<void> {
  let dernier: unknown = null
  for (let essai = 1; essai <= 3; essai++) {
    const res = await apiGet<GateEvaluation>(`/articles/${articleId}/gates/${gateId}`)
    const evaluation = res.data
    if (!evaluation) throw new Error(`Porte ${gateId} : évaluation illisible (HTTP ${res.status})`)
    if (evaluation.passed) return
    const technique = evaluation.blocking.filter(i => i.level === 'technique').map(i => i.rule)
    if (technique.length > 0) throw new Error(`Porte ${gateId} : défaut ⛔ sans dérogation possible (${technique.join(', ')})`)
    const waivers = evaluation.blocking.map(i => (
      i.level === 'risque' ? { rule: i.rule, category: 'autre', reason: TEST_WAIVER_REASON } : { rule: i.rule }
    ))
    const saved = await apiPost<{ evaluation: GateEvaluation; refused: Array<{ rule: string; problem: string }> }>(
      `/articles/${articleId}/gates/${gateId}/waivers`, { waivers },
    )
    if (saved.data?.evaluation.passed) return
    dernier = saved.data ?? saved.error
  }
  throw new Error(`Porte ${gateId} : toujours refusée après 3 essais (${JSON.stringify(dernier)})`)
}

/** Accorde une étape du Moteur ; si elle est gardée, passe d'abord sa porte. */
export async function grantCheck<T = unknown>(articleId: number, check: string): Promise<ApiResponse<T>> {
  const gateId = CHECK_GATES[check]
  if (gateId) await assumeGate(articleId, gateId)
  return apiPost<T>(`/articles/${articleId}/progress/check`, { check })
}
