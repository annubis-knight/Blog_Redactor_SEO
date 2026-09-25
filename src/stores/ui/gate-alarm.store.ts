/**
 * AUTHORITY: serveur (GET/POST /articles/:id/gates/:gateId…) — seul évaluateur
 *            des portes ; les dérogations vivent en PostgreSQL `gate_waivers`.
 * READS FROM: GET /articles/:id/gates/:gateId?keyword= (verdict de la porte)
 * WRITES TO: POST /articles/:id/gates/:gateId/waivers (dérogations 🟠/🔴)
 * CONSUMERS: GateAlarm.vue (alarme globale, montée dans App.vue),
 *            CaptainPanel (verrou du capitaine), LieutenantsPanel (validation),
 *            useMoteurArticleSync (check refusé en 422), ArticlePreviewView (publication)
 * RELATED FR: FR-INFRA-GATE-WAIVER, FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE, FR-RED-PUBLISH-GATE
 *
 * Une seule alarme à la fois, partagée par toute l'application : le clic a lieu
 * dans un panneau, l'alarme s'affiche au-dessus de tout. `ensure`/`open`
 * renvoient une promesse qui se résout à `true` quand la porte passe (d'emblée
 * ou après dérogation), à `false` quand l'utilisateur revient corriger.
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { GateEvaluation, GateId, WaiverDraft, WaiverRefusal } from '@shared/verifiers/gate.js'

export interface GateAlarmRequest {
  articleId: number
  gateId: GateId
  /** Capitaine examiné avant d'être enregistré (porte `captain-lock`). */
  keyword?: string
  evaluation: GateEvaluation
}

interface GateOptions {
  keyword?: string
}

/**
 * Refus d'une porte renvoyé par le serveur (422 `GATE_BLOCKED`). Reconnu à sa
 * forme plutôt qu'à sa classe : l'erreur peut venir du wrapper d'API ou d'un
 * appel simulé dans un test.
 */
export function isGateBlocked(err: unknown): err is { code: 'GATE_BLOCKED'; details: GateEvaluation } {
  if (!err || typeof err !== 'object') return false
  const { code, details } = err as { code?: unknown; details?: unknown }
  if (code !== 'GATE_BLOCKED' || !details || typeof details !== 'object') return false
  const d = details as Partial<GateEvaluation>
  return typeof d.gateId === 'string' && Array.isArray(d.blocking)
}

export const useGateAlarmStore = defineStore('gate-alarm', () => {
  const current = ref<GateAlarmRequest | null>(null)
  const refused = ref<WaiverRefusal[]>([])
  const isSubmitting = ref(false)
  const submitError = ref<string | null>(null)
  let resolver: ((passed: boolean) => void) | null = null

  function settle(passed: boolean): void {
    const resolve = resolver
    resolver = null
    current.value = null
    refused.value = []
    submitError.value = null
    resolve?.(passed)
  }

  function gatePath(articleId: number, gateId: GateId): string {
    return `/articles/${articleId}/gates/${gateId}`
  }

  /** Verdict de la porte, sans rien afficher. */
  async function evaluate(articleId: number, gateId: GateId, opts: GateOptions = {}): Promise<GateEvaluation> {
    const query = opts.keyword ? `?keyword=${encodeURIComponent(opts.keyword)}` : ''
    return apiGet<GateEvaluation>(`${gatePath(articleId, gateId)}${query}`)
  }

  /** Montre l'alarme pour ce verdict ; se résout quand l'utilisateur a tranché. */
  function open(articleId: number, gateId: GateId, evaluation: GateEvaluation, opts: GateOptions = {}): Promise<boolean> {
    if (evaluation.passed) return Promise.resolve(true)
    if (resolver) settle(false)
    current.value = { articleId, gateId, keyword: opts.keyword, evaluation }
    log.info('[gate-alarm] alarme ouverte', {
      articleId, gateId, blocking: evaluation.blocking.map(i => `${i.level}:${i.rule}`),
    })
    return new Promise<boolean>(resolve => { resolver = resolve })
  }

  /** Vérifie la porte et, si elle refuse, ouvre l'alarme. */
  async function ensure(articleId: number, gateId: GateId, opts: GateOptions = {}): Promise<boolean> {
    return open(articleId, gateId, await evaluate(articleId, gateId, opts), opts)
  }

  /** Envoie les dérogations ; ferme l'alarme dès que le serveur dit que la porte passe. */
  async function submit(drafts: WaiverDraft[]): Promise<void> {
    const request = current.value
    if (!request || drafts.length === 0) return
    isSubmitting.value = true
    submitError.value = null
    try {
      const res = await apiPost<{ evaluation: GateEvaluation; refused: WaiverRefusal[] }>(
        `${gatePath(request.articleId, request.gateId)}/waivers`,
        { keyword: request.keyword, waivers: drafts },
      )
      if (current.value !== request) return
      if (res.evaluation.passed) {
        log.info('[gate-alarm] porte franchie avec dérogation', { articleId: request.articleId, gateId: request.gateId })
        settle(true)
        return
      }
      refused.value = res.refused
      current.value = { ...request, evaluation: res.evaluation }
    } catch (err) {
      submitError.value = err instanceof Error ? err.message : 'Enregistrement impossible'
    } finally {
      isSubmitting.value = false
    }
  }

  function cancel(): void {
    if (current.value) log.info('[gate-alarm] retour à la correction', { gateId: current.value.gateId })
    settle(false)
  }

  /**
   * Joue une action gardée par le serveur (check du Moteur, publication). Si elle
   * est refusée en 422 `GATE_BLOCKED`, montre l'alarme ; après dérogation, la
   * rejoue une fois. Les autres erreurs remontent telles quelles.
   */
  async function runThroughGate<T>(
    articleId: number,
    action: () => Promise<T>,
    opts: GateOptions = {},
  ): Promise<{ ok: true; value: T } | { ok: false }> {
    try {
      return { ok: true, value: await action() }
    } catch (err) {
      if (!isGateBlocked(err)) throw err
      const passed = await open(articleId, err.details.gateId, err.details, opts)
      if (!passed) return { ok: false }
      return { ok: true, value: await action() }
    }
  }

  return { current, refused, isSubmitting, submitError, evaluate, open, ensure, submit, cancel, runThroughGate }
})
