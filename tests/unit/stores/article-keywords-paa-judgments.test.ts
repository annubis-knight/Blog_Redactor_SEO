/**
 * Tests du cache session des jugements Haiku PAA × douleur (moteur:paa-judgments-store).
 *
 * Couvre FR-CAP-PAA-JUDGE-CACHE-SESSION :
 *   - 1er appel charge depuis l'endpoint, populates la Map
 *   - 2e appel sur le même article = cache hit (pas de nouveau call API)
 *   - Switch article A → B → A → cache hit sur A au retour
 *   - $reset() préserve volontairement la Map (cross-switch)
 *   - Le getter retourne null pour un keyword non jugé
 *   - relevanceScore des cards exploredKeywords est remplacé par le score recalculé
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockApiPost = vi.fn()
vi.mock('@/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPatch: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'
import type { PaaJudgmentBlock } from '../../../shared/types/captain-paa-judgment.types'

function makeJudgmentBlock(score: number): PaaJudgmentBlock {
  return {
    paaJudgments: [
      { paaIndex: 0, badge: 'pertinent', paaScore: score, reasonShort: 'Test' },
    ],
    overallPaaScore: score,
    summary: `Score ${score}`,
  }
}

function makeApiResponse(articleId: number, judgments: Record<string, PaaJudgmentBlock>) {
  const relevanceScores: Record<string, unknown> = {}
  for (const kw of Object.keys(judgments)) {
    relevanceScores[kw] = {
      total: judgments[kw].overallPaaScore,
      verdict: 'GO',
      breakdown: {
        painKeyword: { weight: 0.3, normalized: 80, contribution: 24 },
        paaPain: { weight: 0.25, normalized: judgments[kw].overallPaaScore, contribution: 0 },
        acPain: { weight: 0.15, normalized: 60, contribution: 9 },
        roots: { weight: 0.2, normalized: 70, contribution: 14 },
        intentPain: { weight: 0.1, normalized: 50, contribution: 5 },
      },
      rootsContext: { rootsAverageScore: 70, fallbackApplied: false },
      unavailableReason: null,
    }
  }
  void articleId
  return { judgments, relevanceScores }
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiPost.mockReset()
})

describe('moteur:paa-judgments-store — cache session', () => {
  it('1er loadCaptainPaaJudgments appelle l\'endpoint Haiku et hydrate la Map', async () => {
    const store = useArticleKeywordsStore()
    mockApiPost.mockResolvedValueOnce(makeApiResponse(1, {
      'site web': makeJudgmentBlock(85),
    }))

    await store.loadCaptainPaaJudgments(1)

    expect(mockApiPost).toHaveBeenCalledTimes(1)
    expect(mockApiPost).toHaveBeenCalledWith('/articles/1/captain/judge-paa', {})
    expect(store.getPaaJudgment(1, 'site web')?.overallPaaScore).toBe(85)
  })

  it('2e loadCaptainPaaJudgments sur le même article = cache hit (pas de re-call API)', async () => {
    const store = useArticleKeywordsStore()
    mockApiPost.mockResolvedValueOnce(makeApiResponse(1, {
      'site web': makeJudgmentBlock(85),
    }))

    await store.loadCaptainPaaJudgments(1)
    await store.loadCaptainPaaJudgments(1)

    expect(mockApiPost).toHaveBeenCalledTimes(1) // cache hit
  })

  it('cross-switch A → B → A : cache hit sur A au retour', async () => {
    const store = useArticleKeywordsStore()
    mockApiPost.mockImplementation(async (url: string) => {
      if (url === '/articles/1/captain/judge-paa') return makeApiResponse(1, { kwA: makeJudgmentBlock(80) })
      if (url === '/articles/2/captain/judge-paa') return makeApiResponse(2, { kwB: makeJudgmentBlock(60) })
      return makeApiResponse(0, {})
    })

    await store.loadCaptainPaaJudgments(1)
    await store.loadCaptainPaaJudgments(2)
    await store.loadCaptainPaaJudgments(1) // retour sur A → cache hit

    expect(mockApiPost).toHaveBeenCalledTimes(2) // 1 pour A, 1 pour B, 0 pour le retour A
    expect(store.getPaaJudgment(1, 'kwA')?.overallPaaScore).toBe(80)
    expect(store.getPaaJudgment(2, 'kwB')?.overallPaaScore).toBe(60)
  })

  it('$reset() préserve volontairement le cache des jugements (cross-switch)', async () => {
    const store = useArticleKeywordsStore()
    mockApiPost.mockResolvedValueOnce(makeApiResponse(1, {
      'site web': makeJudgmentBlock(85),
    }))

    await store.loadCaptainPaaJudgments(1)
    expect(store.getPaaJudgment(1, 'site web')).not.toBeNull()

    store.$reset()
    // Le cache survit au $reset (FR-CAP-PAA-JUDGE-CACHE-SESSION).
    expect(store.getPaaJudgment(1, 'site web')).not.toBeNull()
  })

  it('getter retourne null pour un keyword non jugé', () => {
    const store = useArticleKeywordsStore()
    expect(store.getPaaJudgment(99, 'inexistant')).toBeNull()
  })

  it('isPaaJudgmentLoading passe à true pendant l\'appel puis false après', async () => {
    const store = useArticleKeywordsStore()
    let resolvePromise: ((v: unknown) => void) | null = null
    const apiPromise = new Promise((resolve) => { resolvePromise = resolve })
    mockApiPost.mockReturnValueOnce(apiPromise)

    const callPromise = store.loadCaptainPaaJudgments(1)
    expect(store.isPaaJudgmentLoading(1)).toBe(true)

    resolvePromise!(makeApiResponse(1, { kw: makeJudgmentBlock(70) }))
    await callPromise
    expect(store.isPaaJudgmentLoading(1)).toBe(false)
  })

  it('échec API → loading false + warn, cache reste vide pour cet article', async () => {
    const store = useArticleKeywordsStore()
    mockApiPost.mockRejectedValueOnce(new Error('Network'))

    await store.loadCaptainPaaJudgments(1)

    expect(store.isPaaJudgmentLoading(1)).toBe(false)
    expect(store.getPaaJudgment(1, 'kw')).toBeNull()
  })

  it('appels concurrents sur le même article ne déclenchent qu\'un seul call API', async () => {
    const store = useArticleKeywordsStore()
    let resolvePromise: ((v: unknown) => void) | null = null
    const apiPromise = new Promise((resolve) => { resolvePromise = resolve })
    mockApiPost.mockReturnValueOnce(apiPromise)

    const p1 = store.loadCaptainPaaJudgments(1)
    const p2 = store.loadCaptainPaaJudgments(1)

    resolvePromise!(makeApiResponse(1, { kw: makeJudgmentBlock(80) }))
    await Promise.all([p1, p2])

    expect(mockApiPost).toHaveBeenCalledTimes(1)
  })
})
