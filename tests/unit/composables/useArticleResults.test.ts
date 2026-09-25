import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock api.service
vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}))

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { apiGet } from '../../../src/services/api.service'
import { useArticleResults } from '../../../src/composables/editor/useArticleResults'
import { useIntentStore } from '../../../src/stores/keyword/intent.store'
import { useLocalStore } from '../../../src/stores/external/local.store'
import { useKeywordDiscoveryStore } from '../../../src/stores/keyword/keyword-discovery.store'

const mockApiGet = vi.mocked(apiGet)

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
})

describe('useArticleResults', () => {
  describe('clearResults', () => {
    it('resets intent, local, and discovery stores', () => {
      const intentStore = useIntentStore()
      const localStore = useLocalStore()
      const _discoveryStore = useKeywordDiscoveryStore()

      // Populate stores with some data
      intentStore.comparisonData = { alert: 'some alert' } as any
      intentStore.autocompleteData = { suggestions: ['a'] } as any
      localStore.mapsData = { hasLocalPack: true } as any

      const { clearResults, currentArticleId } = useArticleResults()
      clearResults()

      expect(intentStore.comparisonData).toBeNull()
      expect(intentStore.autocompleteData).toBeNull()
      expect(localStore.mapsData).toBeNull()
      expect(currentArticleId.value).toBeNull()
    })
  })

  describe('loadCachedResults (Sprint 14 — split endpoints)', () => {
    // Helper that answers /articles/:id/explorations and /articles/:id/external-cache
    // with the provided payloads. The composable issues both requests in parallel.
    function mockSplit(explorations: any, external: any = { autocomplete: null }) {
      mockApiGet.mockImplementation((path: string) => {
        if (path.endsWith('/explorations')) return Promise.resolve(explorations)
        if (path.endsWith('/external-cache')) return Promise.resolve(external)
        return Promise.resolve(null)
      })
    }

    it('calls both split endpoints and populates stores', async () => {
      const intentStore = useIntentStore()
      const localStore = useLocalStore()

      const explorations = {
        local: {
          capitaine: {
            hasLocalPack: true,
            listings: [],
            reviewGap: null,
            comparison: { localVolume: 100, nationalVolume: 500 },
          },
          all: [],
        },
        contentGap: { capitaine: null, all: [] },
        radar: null,
      }
      const external = { autocomplete: { suggestions: ['a', 'b'] } }
      mockSplit(explorations, external)

      const { loadCachedResults, isLoading } = useArticleResults()
      const promise = loadCachedResults(1)
      expect(isLoading.value).toBe(true)
      await promise
      expect(isLoading.value).toBe(false)

      expect(mockApiGet).toHaveBeenCalledWith('/articles/1/explorations', { contract: expect.objectContaining({ name: 'explorations' }) })
      expect(mockApiGet).toHaveBeenCalledWith('/articles/1/external-cache')

      expect(intentStore.comparisonData).toEqual(explorations.local.capitaine.comparison)
      expect(intentStore.autocompleteData).toEqual(external.autocomplete)
      expect(localStore.mapsData?.hasLocalPack).toBe(true)
    })

    it('M3 — un ancien groupe `intent` encore servi n’hydrate plus rien', async () => {
      // `keyword_intent_analyses` n'a plus de producteur : ses lignes figées ne
      // sont plus relues. Même si un serveur en retard renvoyait encore le
      // groupe, le store d'intention ne le reprend pas.
      const intentStore = useIntentStore()
      mockSplit({
        intent: { capitaine: { dominantIntent: 'informational', modules: [] }, all: [] },
        local: { capitaine: null, all: [] },
        contentGap: { capitaine: null, all: [] },
        radar: null,
      })

      const { loadCachedResults } = useArticleResults()
      await loadCachedResults(5)

      expect('intentData' in intentStore).toBe(false)
      expect(intentStore.comparisonData).toBeNull()
      expect(intentStore.autocompleteData).toBeNull()
    })

    it('calls correct URL with numeric id', async () => {
      mockSplit({ local: { capitaine: null, all: [] }, contentGap: { capitaine: null, all: [] }, radar: null })

      const { loadCachedResults } = useArticleResults()
      await loadCachedResults(42)

      expect(mockApiGet).toHaveBeenCalledWith('/articles/42/explorations', { contract: expect.objectContaining({ name: 'explorations' }) })
      expect(mockApiGet).toHaveBeenCalledWith('/articles/42/external-cache')
    })

    it('does not populate stores when all values are null', async () => {
      const intentStore = useIntentStore()
      const localStore = useLocalStore()

      mockSplit({ local: { capitaine: null, all: [] }, contentGap: { capitaine: null, all: [] }, radar: null })

      const { loadCachedResults } = useArticleResults()
      await loadCachedResults(99)

      expect(intentStore.comparisonData).toBeNull()
      expect(intentStore.autocompleteData).toBeNull()
      expect(localStore.mapsData).toBeNull()
    })

    it('handles API errors gracefully (stores stay empty)', async () => {
      const intentStore = useIntentStore()

      mockApiGet.mockRejectedValue(new Error('Network error'))

      const { loadCachedResults, isLoading } = useArticleResults()
      await loadCachedResults(7)

      expect(isLoading.value).toBe(false)
      expect(intentStore.comparisonData).toBeNull()
    })

    it('guards against race condition — discards stale results', async () => {
      const intentStore = useIntentStore()

      // First /explorations resolves slowly; external-cache resolves immediately.
      let resolveFirst!: (value: any) => void
      mockApiGet.mockImplementation((path: string) => {
        if (path === '/articles/1/explorations') return new Promise(resolve => { resolveFirst = resolve })
        if (path === '/articles/2/explorations') return Promise.resolve({
          local: { capitaine: { hasLocalPack: false, comparison: { localVolume: 20 } }, all: [] },
          contentGap: { capitaine: null, all: [] },
          radar: null,
        })
        return Promise.resolve({ autocomplete: null })
      })

      const { loadCachedResults, currentArticleId } = useArticleResults()

      const p1 = loadCachedResults(1)
      const p2 = loadCachedResults(2)
      await p2

      expect(currentArticleId.value).toBe(2)
      expect(intentStore.comparisonData).toEqual({ localVolume: 20 })

      resolveFirst({
        local: { capitaine: { hasLocalPack: true, comparison: { localVolume: 999 } }, all: [] },
        contentGap: { capitaine: null, all: [] },
        radar: null,
      })
      await p1

      // Store should still have the second article's data (guard dropped the stale write).
      expect(intentStore.comparisonData).toEqual({ localVolume: 20 })
    })
  })
})
