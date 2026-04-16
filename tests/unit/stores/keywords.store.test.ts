import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useKeywordsStore } from '../../../src/stores/keyword/keywords.store'
import type { Keyword } from '../../../shared/types/index.js'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
}))

import { apiGet } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)

const mockKeywords: Keyword[] = [
  { keyword: 'refonte site web pme', cocoonName: 'Refonte de site web pour PME', type: 'Pilier' },
  { keyword: 'agence web refonte', cocoonName: 'Refonte de site web pour PME', type: 'Moyenne traine' },
  { keyword: 'devis refonte site internet', cocoonName: 'Refonte de site web pour PME', type: 'Longue traine' },
]

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
})

describe('keywords.store — fetchKeywordsByCocoon', () => {
  it('loads keywords from API and updates state', async () => {
    mockApiGet.mockResolvedValue(mockKeywords)
    const store = useKeywordsStore()

    await store.fetchKeywordsByCocoon('Refonte de site web pour PME')

    expect(store.keywords).toEqual(mockKeywords)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('calls apiGet with URL-encoded cocoon name', async () => {
    mockApiGet.mockResolvedValue([])
    const store = useKeywordsStore()

    await store.fetchKeywordsByCocoon('Refonte de site web pour PME')

    expect(mockApiGet).toHaveBeenCalledWith('/keywords/Refonte%20de%20site%20web%20pour%20PME')
  })

  it('sets error on API failure', async () => {
    mockApiGet.mockRejectedValue(new Error('Server error'))
    const store = useKeywordsStore()

    await store.fetchKeywordsByCocoon('Test')

    expect(store.error).toBe('Server error')
    expect(store.keywords).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('sets isLoading true during fetch', async () => {
    let resolvePromise: (value: Keyword[]) => void
    mockApiGet.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve }))
    const store = useKeywordsStore()

    const promise = store.fetchKeywordsByCocoon('Test')
    expect(store.isLoading).toBe(true)

    resolvePromise!(mockKeywords)
    await promise

    expect(store.isLoading).toBe(false)
  })
})
