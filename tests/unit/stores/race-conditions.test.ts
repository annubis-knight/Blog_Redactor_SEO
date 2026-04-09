import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// --- Mock api.service ---
vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}))

import { apiGet, apiPost } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)

// --- Mock logger ---
vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
  mockApiPost.mockReset()
})

// ============================================================
// strategy.store — flags séparés
// ============================================================

describe('strategy.store — separated flags', () => {
  // Dynamic import to use fresh module per test
  async function getStore() {
    const { useStrategyStore } = await import('../../../src/stores/strategy.store')
    return useStrategyStore()
  }

  it('each flag is independent — requestSuggestion sets isSuggesting only', async () => {
    let resolveSuggest!: (v: unknown) => void
    mockApiPost.mockImplementation(() => new Promise(r => { resolveSuggest = r }))

    const store = await getStore()
    const promise = store.requestSuggestion('slug', { step: 'cible', currentInput: '', previousAnswers: {} })

    expect(store.isSuggesting).toBe(true)
    expect(store.isConsolidating).toBe(false)
    expect(store.isEnriching).toBe(false)
    expect(store.isProcessing).toBe(true)

    resolveSuggest({ suggestion: 'test' })
    await promise

    expect(store.isSuggesting).toBe(false)
    expect(store.isProcessing).toBe(false)
  })

  it('isProcessing stays true while any operation is in progress', async () => {
    let resolveSuggest!: (v: unknown) => void
    let resolveConsolidate!: (v: unknown) => void

    mockApiPost.mockImplementation(
      (path: string) =>
        new Promise(r => {
          if (path.includes('suggest')) resolveSuggest = r
          else if (path.includes('consolidate')) resolveConsolidate = r
        }),
    )

    const store = await getStore()

    // Launch both in parallel
    const suggestPromise = store.requestSuggestion('slug', { step: 'cible', currentInput: '', previousAnswers: {} })
    const consolidatePromise = store.requestConsolidate('slug', { step: 'cible', currentInput: '', subAnswers: [] })

    expect(store.isSuggesting).toBe(true)
    expect(store.isConsolidating).toBe(true)
    expect(store.isProcessing).toBe(true)

    // Finish suggest — isProcessing should remain true because consolidate is still running
    resolveSuggest({ suggestion: 'test' })
    await suggestPromise

    expect(store.isSuggesting).toBe(false)
    expect(store.isConsolidating).toBe(true)
    expect(store.isProcessing).toBe(true)

    // Finish consolidate
    resolveConsolidate({ consolidated: 'done' })
    await consolidatePromise

    expect(store.isConsolidating).toBe(false)
    expect(store.isProcessing).toBe(false)
  })
})

// ============================================================
// gsc.store — flags séparés
// ============================================================

describe('gsc.store — separated flags', () => {
  async function getStore() {
    const { useGscStore } = await import('../../../src/stores/gsc.store')
    return useGscStore()
  }

  it('isLoadingPerformance and isLoadingKeywordGap are independent', async () => {
    let resolvePerf!: (v: unknown) => void
    let resolveGap!: (v: unknown) => void

    mockApiPost.mockImplementation(
      (path: string) =>
        new Promise(r => {
          if (path.includes('performance')) resolvePerf = r
          else if (path.includes('keyword-gap')) resolveGap = r
        }),
    )

    const store = await getStore()

    const perfPromise = store.fetchPerformance('site', '2026-01-01', '2026-01-31')
    const gapPromise = store.fetchKeywordGap('url', ['kw'], 'site')

    expect(store.isLoadingPerformance).toBe(true)
    expect(store.isLoadingKeywordGap).toBe(true)
    expect(store.isLoading).toBe(true)

    resolvePerf({ rows: [] })
    await perfPromise

    expect(store.isLoadingPerformance).toBe(false)
    expect(store.isLoadingKeywordGap).toBe(true)
    expect(store.isLoading).toBe(true) // still true

    resolveGap({ matched: [] })
    await gapPromise

    expect(store.isLoadingKeywordGap).toBe(false)
    expect(store.isLoading).toBe(false)
  })
})

// ============================================================
// keyword-discovery.store — AbortController
// ============================================================

describe('keyword-discovery.store — AbortController', () => {
  async function getStore() {
    const { useKeywordDiscoveryStore } = await import('../../../src/stores/keyword-discovery.store')
    return useKeywordDiscoveryStore()
  }

  it('aborts previous request when new discovery is launched', async () => {
    const abortedSignals: boolean[] = []

    // Mock fetch to capture the signal
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            abortedSignals.push(true)
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }
        // Never resolve (simulates slow request) unless not aborted
        setTimeout(() => {
          resolve(new Response(JSON.stringify({
            data: { keywords: [], apiCost: 0, totalBeforeDedup: 0, totalAfterDedup: 0, total: 0 },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        }, 100)
      })
    })

    try {
      const store = await getStore()

      // Launch seed discovery
      const seedPromise = store.discoverFromSeed('keyword1')

      // Immediately launch domain discovery — should abort the seed
      const domainPromise = store.discoverFromDomain('example.com')

      await Promise.allSettled([seedPromise, domainPromise])

      // First request should have been aborted
      expect(abortedSignals.length).toBeGreaterThanOrEqual(1)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ============================================================
// brief.store — AbortController + stale slug protection
// ============================================================

describe('brief.store — AbortController', () => {
  async function getStore() {
    const { useBriefStore } = await import('../../../src/stores/brief.store')
    return useBriefStore()
  }

  it('does not update briefData if slug changed during fetch', async () => {
    // Simulate: fetch slug-A (slow), then fetch slug-B (fast)
    // slug-A's response should NOT overwrite briefData

    let callCount = 0
    mockApiGet.mockImplementation((path: string) => {
      callCount++
      if (callCount === 1) {
        // First call for slug-A: slow, resolve after slug-B is started
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ article: { slug: 'slug-a', type: 'Pilier' }, cocoonName: 'cocoon-a' })
          }, 50)
        })
      }
      if (path.includes('slug-b')) {
        return Promise.resolve({ article: { slug: 'slug-b', type: 'Pilier' }, cocoonName: 'cocoon-b' })
      }
      // Keywords calls
      return Promise.resolve([])
    })

    const store = await getStore()

    // Start fetch for slug-A
    const fetchA = store.fetchBrief('slug-a')
    // Immediately start fetch for slug-B — this aborts slug-A
    const fetchB = store.fetchBrief('slug-b')

    await Promise.allSettled([fetchA, fetchB])

    // briefData should contain slug-B, not slug-A
    expect(store.briefData?.article?.slug).toBe('slug-b')
  })
})
