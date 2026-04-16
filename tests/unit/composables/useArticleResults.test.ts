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
import { useIntentStore } from '../../../src/stores/intent.store'
import { useLocalStore } from '../../../src/stores/local.store'
import { useKeywordDiscoveryStore } from '../../../src/stores/keyword-discovery.store'

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
      const discoveryStore = useKeywordDiscoveryStore()

      // Populate stores with some data
      intentStore.intentData = { dominantIntent: 'informational' } as any
      intentStore.comparisonData = { alert: 'some alert' } as any
      localStore.mapsData = { hasLocalPack: true } as any

      const { clearResults, currentArticleId } = useArticleResults()
      clearResults()

      expect(intentStore.intentData).toBeNull()
      expect(intentStore.comparisonData).toBeNull()
      expect(intentStore.autocompleteData).toBeNull()
      expect(localStore.mapsData).toBeNull()
      expect(currentArticleId.value).toBeNull()
    })
  })

  describe('loadCachedResults', () => {
    it('calls apiGet with correct URL and populates stores', async () => {
      const intentStore = useIntentStore()
      const localStore = useLocalStore()

      const cachedData = {
        intent: { dominantIntent: 'informational', modules: [] },
        local: { hasLocalPack: true, listings: [] },
        contentGap: null,
        autocomplete: { suggestions: ['a', 'b'] },
        comparison: { localVolume: 100, nationalVolume: 500 },
      }

      mockApiGet.mockResolvedValue(cachedData)

      const { loadCachedResults, isLoading } = useArticleResults()

      const promise = loadCachedResults(1)

      // isLoading should be true during fetch
      expect(isLoading.value).toBe(true)

      await promise

      expect(isLoading.value).toBe(false)
      expect(mockApiGet).toHaveBeenCalledWith('/articles/1/cached-results')

      // Stores should be populated
      expect(intentStore.intentData).toEqual(cachedData.intent)
      expect(intentStore.comparisonData).toEqual(cachedData.comparison)
      expect(intentStore.autocompleteData).toEqual(cachedData.autocomplete)
      expect(localStore.mapsData).toEqual(cachedData.local)
    })

    it('calls correct URL with numeric id', async () => {
      mockApiGet.mockResolvedValue({
        intent: null, local: null, contentGap: null, autocomplete: null, comparison: null,
      })

      const { loadCachedResults } = useArticleResults()
      await loadCachedResults(42)

      expect(mockApiGet).toHaveBeenCalledWith('/articles/42/cached-results')
    })

    it('does not populate stores when all values are null', async () => {
      const intentStore = useIntentStore()
      const localStore = useLocalStore()

      mockApiGet.mockResolvedValue({
        intent: null, local: null, contentGap: null, autocomplete: null, comparison: null,
      })

      const { loadCachedResults } = useArticleResults()
      await loadCachedResults(99)

      expect(intentStore.intentData).toBeNull()
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
      expect(intentStore.intentData).toBeNull()
    })

    it('guards against race condition — discards stale results', async () => {
      const intentStore = useIntentStore()

      // First call will resolve slowly
      let resolveFirst!: (value: any) => void
      const firstPromise = new Promise(resolve => { resolveFirst = resolve })
      mockApiGet.mockReturnValueOnce(firstPromise as any)

      // Second call resolves immediately
      const secondData = {
        intent: { dominantIntent: 'navigational' },
        local: null, contentGap: null, autocomplete: null, comparison: null,
      }
      mockApiGet.mockResolvedValueOnce(secondData)

      const { loadCachedResults, currentArticleId } = useArticleResults()

      // Start first load
      const p1 = loadCachedResults(1)

      // Immediately start second load (simulating user switching articles)
      const p2 = loadCachedResults(2)

      // Second load completes first
      await p2

      expect(currentArticleId.value).toBe(2)
      expect(intentStore.intentData).toEqual(secondData.intent)

      // Now resolve the first call — its results should be discarded
      resolveFirst({
        intent: { dominantIntent: 'informational' },
        local: null, contentGap: null, autocomplete: null, comparison: null,
      })
      await p1

      // Store should still have the second article's data
      expect(intentStore.intentData).toEqual(secondData.intent)
    })
  })
})
