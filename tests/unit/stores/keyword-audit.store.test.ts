import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useKeywordAuditStore } from '../../../src/stores/keyword-audit.store'

describe('useKeywordAuditStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('initializes with empty state', () => {
    const store = useKeywordAuditStore()
    expect(store.results).toEqual([])
    expect(store.redundancies).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.currentCocoon).toBe('')
  })

  it('computes type scores correctly', () => {
    const store = useKeywordAuditStore()
    store.results = [
      {
        keyword: 'kw1', type: 'Pilier', cocoonName: 'Test',
        searchVolume: 500, difficulty: 30, cpc: 1, competition: 0.3,
        compositeScore: { volume: 50, difficultyInverse: 70, cpc: 40, competitionInverse: 70, total: 60 },
        relatedKeywords: [], fromCache: true, cachedAt: null, alerts: [],
      },
      {
        keyword: 'kw2', type: 'Pilier', cocoonName: 'Test',
        searchVolume: 1000, difficulty: 20, cpc: 2, competition: 0.2,
        compositeScore: { volume: 70, difficultyInverse: 80, cpc: 50, competitionInverse: 80, total: 80 },
        relatedKeywords: [], fromCache: true, cachedAt: null, alerts: [],
      },
      {
        keyword: 'kw3', type: 'Longue traine', cocoonName: 'Test',
        searchVolume: 20, difficulty: 10, cpc: 0.5, competition: 0.1,
        compositeScore: { volume: 20, difficultyInverse: 90, cpc: 30, competitionInverse: 90, total: 50 },
        relatedKeywords: [], fromCache: true, cachedAt: null, alerts: [{ level: 'warning', type: 'low_volume', message: 'test' }],
      },
    ]

    expect(store.typeScores).toHaveLength(5)

    const pilier = store.typeScores.find(ts => ts.type === 'Pilier')
    expect(pilier?.averageScore).toBe(70)
    expect(pilier?.keywordCount).toBe(2)
    expect(pilier?.alertCount).toBe(0)

    const longue = store.typeScores.find(ts => ts.type === 'Longue traine')
    expect(longue?.averageScore).toBe(50)
    expect(longue?.keywordCount).toBe(1)
    expect(longue?.alertCount).toBe(1)
  })

  it('computes totalAlerts correctly', () => {
    const store = useKeywordAuditStore()
    store.results = [
      {
        keyword: 'kw1', type: 'Pilier', cocoonName: 'Test',
        searchVolume: 0, difficulty: 0, cpc: 0, competition: 0,
        compositeScore: { volume: 0, difficultyInverse: 100, cpc: 0, competitionInverse: 100, total: 25 },
        relatedKeywords: [], fromCache: true, cachedAt: null,
        alerts: [
          { level: 'danger', type: 'zero_volume', message: 'No volume' },
          { level: 'warning', type: 'redundant', message: 'Redundant' },
        ],
      },
    ]
    expect(store.totalAlerts).toBe(2)
  })

  it('fetches audit and updates state', async () => {
    const store = useKeywordAuditStore()
    const mockData = {
      results: [
        {
          keyword: 'test', type: 'Pilier', cocoonName: 'Test',
          searchVolume: 100, difficulty: 30, cpc: 1, competition: 0.3,
          compositeScore: { volume: 50, difficultyInverse: 70, cpc: 40, competitionInverse: 70, total: 60 },
          relatedKeywords: [], fromCache: false, cachedAt: '2026-03-10', alerts: [],
        },
      ],
      redundancies: [],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockData }),
    })

    await store.fetchAudit('Test Cocoon')
    expect(store.results).toHaveLength(1)
    expect(store.results[0].keyword).toBe('test')
    expect(store.redundancies).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.currentCocoon).toBe('Test Cocoon')
  })

  it('handles fetch error', async () => {
    const store = useKeywordAuditStore()

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Not found' } }),
    })

    await store.fetchAudit('Unknown')
    expect(store.error).toBe('Not found')
    expect(store.results).toEqual([])
  })

  it('resets state', () => {
    const store = useKeywordAuditStore()
    store.results = [{ keyword: 'test' } as any]
    store.loading = true
    store.error = 'error'
    store.currentCocoon = 'Test'

    store.$reset()
    expect(store.results).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.currentCocoon).toBe('')
  })
})
