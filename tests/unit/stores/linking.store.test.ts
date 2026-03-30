import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLinkingStore } from '../../../src/stores/linking.store'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}))

import { apiGet, apiPost, apiPut } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)
const mockApiPut = vi.mocked(apiPut)

describe('linking.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with null matrix', () => {
    const store = useLinkingStore()
    expect(store.matrix).toBeNull()
    expect(store.suggestions).toEqual([])
    expect(store.totalLinks).toBe(0)
    expect(store.orphanCount).toBe(0)
  })

  it('fetchMatrix populates all data', async () => {
    const mockData = {
      matrix: { links: [{ sourceSlug: 'a', targetSlug: 'b', anchorText: 'test', position: 'p-1' }], updatedAt: null },
      orphans: [{ slug: 'c', title: 'Orphan', cocoonName: 'Test', type: 'Pilier' as const }],
      anchorAlerts: [],
      crossCocoonOpportunities: [],
    }
    mockApiGet.mockResolvedValue(mockData)

    const store = useLinkingStore()
    await store.fetchMatrix()

    expect(store.matrix).toEqual(mockData.matrix)
    expect(store.orphans).toEqual(mockData.orphans)
    expect(store.totalLinks).toBe(1)
    expect(store.orphanCount).toBe(1)
  })

  it('fetchSuggestions populates suggestions', async () => {
    const mockSuggestions = [
      { targetSlug: 'b', targetTitle: 'Article B', targetType: 'Pilier' as const, suggestedAnchor: 'test', reason: 'Même cocon' },
    ]
    mockApiPost.mockResolvedValue(mockSuggestions)

    const store = useLinkingStore()
    await store.fetchSuggestions('a', '<p>content</p>')

    expect(store.suggestions).toEqual(mockSuggestions)
    expect(store.isSuggesting).toBe(false)
  })

  it('saveLinks updates matrix', async () => {
    const mockMatrix = { links: [{ sourceSlug: 'a', targetSlug: 'b', anchorText: 'test', position: 'p-1' }], updatedAt: '2026-03-08' }
    mockApiPut.mockResolvedValue(mockMatrix)

    const store = useLinkingStore()
    await store.saveLinks([{ sourceSlug: 'a', targetSlug: 'b', anchorText: 'test', position: 'p-1' }])

    expect(store.matrix).toEqual(mockMatrix)
  })

  it('clearSuggestions empties the list', () => {
    const store = useLinkingStore()
    store.suggestions = [{ targetSlug: 'b', targetTitle: 'B', targetType: 'Pilier', suggestedAnchor: 'test', reason: 'r' }]
    store.clearSuggestions()
    expect(store.suggestions).toEqual([])
  })

  it('reset clears all state', () => {
    const store = useLinkingStore()
    store.matrix = { links: [], updatedAt: 'x' }
    store.orphans = [{ slug: 'a', title: 'A', cocoonName: 'C', type: 'Pilier' }]
    store.reset()
    expect(store.matrix).toBeNull()
    expect(store.orphans).toEqual([])
    expect(store.suggestions).toEqual([])
  })

  it('handles fetchMatrix error', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'))

    const store = useLinkingStore()
    await store.fetchMatrix()

    expect(store.error).toBe('Network error')
    expect(store.isLoading).toBe(false)
  })
})
