/**
 * FR-INFRA-GATE-WAIVER — l'alarme graduée côté écran.
 *
 * Le serveur est le seul évaluateur : le store demande le verdict, ouvre
 * l'alarme quand la porte refuse, envoie les dérogations et ne rend la main
 * (true) que lorsque le serveur dit que la porte passe. Annuler rend false.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { GateEvaluation } from '@shared/verifiers/gate.js'

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()

vi.mock('@/services/api.service', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { useGateAlarmStore, isGateBlocked } = await import('@/stores/ui/gate-alarm.store')

const risque = { rule: 'captain-volume-unknown', level: 'risque' as const, message: 'Volume inconnu' }

function evaluation(passed: boolean, extra: Partial<GateEvaluation> = {}): GateEvaluation {
  return {
    gateId: 'captain-lock',
    passed,
    inputHash: 'abcd1234',
    issues: passed ? [] : [risque],
    blocking: passed ? [] : [risque],
    waived: [],
    ...extra,
  }
}

describe('gate-alarm store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('une porte qui passe ne montre aucune alarme', async () => {
    mockApiGet.mockResolvedValueOnce(evaluation(true))
    const store = useGateAlarmStore()
    await expect(store.ensure(12, 'captain-lock', { keyword: 'Plombier Toulouse' })).resolves.toBe(true)
    expect(mockApiGet).toHaveBeenCalledWith('/articles/12/gates/captain-lock?keyword=Plombier%20Toulouse')
    expect(store.current).toBeNull()
  })

  it('une porte refusée ouvre l’alarme ; annuler rend false', async () => {
    mockApiGet.mockResolvedValueOnce(evaluation(false))
    const store = useGateAlarmStore()
    const decision = store.ensure(12, 'captain-lock')
    await vi.waitFor(() => expect(store.current).not.toBeNull())
    expect(store.current!.evaluation.blocking).toEqual([risque])
    store.cancel()
    await expect(decision).resolves.toBe(false)
    expect(store.current).toBeNull()
  })

  it('les dérogations acceptées par le serveur rendent true, avec le mot-clé examiné', async () => {
    mockApiGet.mockResolvedValueOnce(evaluation(false))
    mockApiPost.mockResolvedValueOnce({ evaluation: evaluation(true), refused: [] })
    const store = useGateAlarmStore()
    const decision = store.ensure(12, 'captain-lock', { keyword: 'plombier' })
    await vi.waitFor(() => expect(store.current).not.toBeNull())
    const drafts = [{ rule: risque.rule, category: 'longue-traine' as const, reason: 'Demandes réelles reçues au téléphone' }]
    await store.submit(drafts)
    expect(mockApiPost).toHaveBeenCalledWith('/articles/12/gates/captain-lock/waivers', { keyword: 'plombier', waivers: drafts })
    await expect(decision).resolves.toBe(true)
  })

  it('un refus du serveur garde l’alarme ouverte et affiche le motif', async () => {
    mockApiGet.mockResolvedValueOnce(evaluation(false))
    mockApiPost.mockResolvedValueOnce({
      evaluation: evaluation(false),
      refused: [{ rule: risque.rule, problem: 'Expliquez votre choix en au moins 20 caractères (9 pour l’instant).' }],
    })
    const store = useGateAlarmStore()
    const decision = store.ensure(12, 'captain-lock')
    await vi.waitFor(() => expect(store.current).not.toBeNull())
    await store.submit([{ rule: risque.rule, category: 'autre', reason: 'trop court' }])
    expect(store.current).not.toBeNull()
    expect(store.refused[0]?.problem).toMatch(/20 caractères/)
    store.cancel()
    await expect(decision).resolves.toBe(false)
  })

  it('runThroughGate : un 422 GATE_BLOCKED ouvre l’alarme, puis l’action est rejouée une fois', async () => {
    const blocked = Object.assign(new Error('Étape non validée'), { status: 422, code: 'GATE_BLOCKED', details: evaluation(false) })
    const action = vi.fn()
      .mockRejectedValueOnce(blocked)
      .mockResolvedValueOnce('ok')
    mockApiPost.mockResolvedValueOnce({ evaluation: evaluation(true), refused: [] })
    const store = useGateAlarmStore()
    const run = store.runThroughGate(12, action)
    await vi.waitFor(() => expect(store.current).not.toBeNull())
    await store.submit([{ rule: risque.rule, category: 'autre', reason: 'Une raison vraiment explicite' }])
    await expect(run).resolves.toEqual({ ok: true, value: 'ok' })
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('runThroughGate laisse passer les autres erreurs', async () => {
    const store = useGateAlarmStore()
    await expect(store.runThroughGate(12, () => Promise.reject(new Error('réseau')))).rejects.toThrow('réseau')
  })

  it('isGateBlocked reconnaît un refus de porte à sa forme, pas à sa classe', () => {
    expect(isGateBlocked({ code: 'GATE_BLOCKED', details: evaluation(false) })).toBe(true)
    expect(isGateBlocked({ code: 'GATE_BLOCKED' })).toBe(false)
    expect(isGateBlocked(new Error('x'))).toBe(false)
  })

  it('une nouvelle alarme annule la précédente', async () => {
    mockApiGet.mockResolvedValue(evaluation(false))
    const store = useGateAlarmStore()
    const first = store.ensure(12, 'captain-lock')
    await vi.waitFor(() => expect(store.current).not.toBeNull())
    const second = store.ensure(12, 'publish')
    await expect(first).resolves.toBe(false)
    await vi.waitFor(() => expect(store.current?.gateId).toBe('publish'))
    store.cancel()
    await expect(second).resolves.toBe(false)
  })
})
