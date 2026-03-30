import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLocalStore } from '../../../src/stores/local.store'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiGet, apiPost } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)

describe('local.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with null data', () => {
    const store = useLocalStore()
    expect(store.mapsData).toBeNull()
    expect(store.anchorageScore).toBeNull()
    expect(store.entities).toEqual([])
    expect(store.isAnalyzingMaps).toBe(false)
    expect(store.isScoring).toBe(false)
    expect(store.mapsError).toBeNull()
    expect(store.scoreError).toBeNull()
  })

  it('analyzeMaps sets loading, calls API and stores result', async () => {
    const mockMaps = {
      keyword: 'plombier lyon',
      locationCode: 2250,
      hasLocalPack: true,
      listings: [
        { position: 1, title: 'Plombier Express', category: 'Plombier', isClaimed: true, rating: 4.5, votesCount: 120, address: '1 rue de Lyon', snippet: null, url: null, phone: null },
      ],
      reviewGap: { averageCompetitorReviews: 85, myReviews: 12, gap: 73, objective: 'Atteindre 85 avis' },
      cachedAt: '2026-03-10',
    }
    mockApiPost.mockResolvedValue(mockMaps)

    const store = useLocalStore()
    const promise = store.analyzeMaps('plombier lyon')

    expect(store.isAnalyzingMaps).toBe(true)
    await promise

    expect(mockApiPost).toHaveBeenCalledWith('/local/maps', { keyword: 'plombier lyon', locationCode: undefined })
    expect(store.mapsData).toEqual(mockMaps)
    expect(store.isAnalyzingMaps).toBe(false)
    expect(store.mapsError).toBeNull()
  })

  it('hasLocalPack returns true when mapsData.hasLocalPack is true', () => {
    const store = useLocalStore()
    expect(store.hasLocalPack).toBe(false)

    store.mapsData = {
      keyword: 'plombier lyon',
      locationCode: 2250,
      hasLocalPack: true,
      listings: [],
      reviewGap: { averageCompetitorReviews: 50, myReviews: 10, gap: 40, objective: 'Atteindre 50 avis' },
      cachedAt: '2026-03-10',
    }
    expect(store.hasLocalPack).toBe(true)
  })

  it('reviewGap returns mapsData.reviewGap', () => {
    const store = useLocalStore()
    expect(store.reviewGap).toBeNull()

    const gap = { averageCompetitorReviews: 100, myReviews: 20, gap: 80, objective: 'Atteindre 100 avis' }
    store.mapsData = {
      keyword: 'plombier lyon',
      locationCode: 2250,
      hasLocalPack: false,
      listings: [],
      reviewGap: gap,
      cachedAt: '2026-03-10',
    }
    expect(store.reviewGap).toEqual(gap)
  })

  it('scoreContent stores anchorage score', async () => {
    const mockScore = {
      score: 72,
      maxScore: 100,
      matches: [
        { entity: { name: 'Bellecour', type: 'quartier' as const }, count: 3, positions: [10, 55, 120] },
      ],
      typesCovered: ['quartier' as const],
      suggestions: [
        { entity: { name: 'Part-Dieu', type: 'quartier' as const }, reason: 'Quartier principal non mentionne' },
      ],
    }
    mockApiPost.mockResolvedValue(mockScore)

    const store = useLocalStore()
    await store.scoreContent('<p>Le quartier Bellecour est bien desservi</p>')

    expect(mockApiPost).toHaveBeenCalledWith('/local/score', { content: '<p>Le quartier Bellecour est bien desservi</p>' })
    expect(store.anchorageScore).toEqual(mockScore)
    expect(store.isScoring).toBe(false)
  })

  it('localScore returns score from anchorageScore', () => {
    const store = useLocalStore()
    expect(store.localScore).toBe(0)

    store.anchorageScore = {
      score: 65,
      maxScore: 100,
      matches: [],
      typesCovered: [],
      suggestions: [],
    }
    expect(store.localScore).toBe(65)
  })

  it('hasSuggestions returns true when suggestions exist', () => {
    const store = useLocalStore()
    expect(store.hasSuggestions).toBe(false)

    store.anchorageScore = {
      score: 40,
      maxScore: 100,
      matches: [],
      typesCovered: [],
      suggestions: [
        { entity: { name: 'Croix-Rousse', type: 'quartier' as const }, reason: 'Non mentionne' },
      ],
    }
    expect(store.hasSuggestions).toBe(true)
  })

  it('loadEntities fetches entities from API', async () => {
    const mockEntities = [
      { name: 'Bellecour', type: 'quartier' as const },
      { name: 'Part-Dieu', type: 'quartier' as const },
    ]
    mockApiGet.mockResolvedValue(mockEntities)

    const store = useLocalStore()
    await store.loadEntities()

    expect(mockApiGet).toHaveBeenCalledWith('/local/entities')
    expect(store.entities).toEqual(mockEntities)
  })

  it('reset clears all state', async () => {
    const store = useLocalStore()

    // Populate state
    store.mapsData = {
      keyword: 'test', locationCode: 2250, hasLocalPack: true, listings: [],
      reviewGap: { averageCompetitorReviews: 50, myReviews: 10, gap: 40, objective: '' },
      cachedAt: '2026-03-10',
    }
    store.anchorageScore = { score: 50, maxScore: 100, matches: [], typesCovered: [], suggestions: [] }

    store.reset()

    expect(store.mapsData).toBeNull()
    expect(store.anchorageScore).toBeNull()
    expect(store.mapsError).toBeNull()
    expect(store.scoreError).toBeNull()
  })
})
