import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGscStore } from '../../../src/stores/external/gsc.store'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiGet, apiPost } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)

describe('gsc.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with isConnected=false and null data', () => {
    const store = useGscStore()
    expect(store.isConnected).toBe(false)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.performance).toBeNull()
    expect(store.keywordGap).toBeNull()
    expect(store.hasData).toBe(false)
  })

  it('checkConnection calls API and sets isConnected', async () => {
    mockApiGet.mockResolvedValue({ connected: true })

    const store = useGscStore()
    await store.checkConnection()

    expect(mockApiGet).toHaveBeenCalledWith('/gsc/status')
    expect(store.isConnected).toBe(true)
  })

  it('checkConnection sets isConnected=false on error', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'))

    const store = useGscStore()
    await store.checkConnection()

    expect(store.isConnected).toBe(false)
  })

  it('fetchPerformance stores performance data', async () => {
    const mockPerf = {
      siteUrl: 'https://example.com',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      rows: [
        { keys: ['plombier lyon'], clicks: 150, impressions: 3200, ctr: 0.047, position: 8.2 },
        { keys: ['plombier urgence lyon'], clicks: 45, impressions: 800, ctr: 0.056, position: 12.1 },
      ],
      cachedAt: '2026-03-10',
    }
    mockApiPost.mockResolvedValue(mockPerf)

    const store = useGscStore()
    await store.fetchPerformance('https://example.com', '2026-01-01', '2026-03-01')

    expect(mockApiPost).toHaveBeenCalledWith('/gsc/performance', {
      siteUrl: 'https://example.com',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
    })
    expect(store.performance).toEqual(mockPerf)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('hasData returns true when performance has rows', async () => {
    const store = useGscStore()
    expect(store.hasData).toBe(false)

    store.performance = {
      siteUrl: 'https://example.com',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      rows: [{ keys: ['test'], clicks: 10, impressions: 100, ctr: 0.1, position: 5 }],
      cachedAt: '2026-03-10',
    }
    expect(store.hasData).toBe(true)
  })

  it('fetchKeywordGap stores keyword gap data', async () => {
    const mockGap = {
      articleUrl: '/plombier-lyon',
      targetedNotIndexed: [
        { keyword: 'plombier urgence', targeted: true, inGsc: false, position: null, clicks: 0, impressions: 0 },
      ],
      discoveredOpportunities: [
        { keyword: 'depannage plomberie', targeted: false, inGsc: true, position: 15, clicks: 5, impressions: 200 },
      ],
      matched: [
        { keyword: 'plombier lyon', targeted: true, inGsc: true, position: 8, clicks: 150, impressions: 3200 },
      ],
    }
    mockApiPost.mockResolvedValue(mockGap)

    const store = useGscStore()
    await store.fetchKeywordGap('/plombier-lyon', ['plombier lyon', 'plombier urgence'], 'https://example.com')

    expect(mockApiPost).toHaveBeenCalledWith('/gsc/keyword-gap', {
      articleUrl: '/plombier-lyon',
      targetKeywords: ['plombier lyon', 'plombier urgence'],
      siteUrl: 'https://example.com',
    })
    expect(store.keywordGap).toEqual(mockGap)
    expect(store.isLoading).toBe(false)
  })

  it('reset clears all state', () => {
    const store = useGscStore()

    // Populate state
    store.performance = {
      siteUrl: 'https://example.com', startDate: '2026-01-01', endDate: '2026-03-01',
      rows: [{ keys: ['test'], clicks: 10, impressions: 100, ctr: 0.1, position: 5 }],
      cachedAt: '2026-03-10',
    }
    store.keywordGap = {
      articleUrl: '/test',
      targetedNotIndexed: [],
      discoveredOpportunities: [],
      matched: [],
    }
    store.error = 'some error'

    store.reset()

    expect(store.performance).toBeNull()
    expect(store.keywordGap).toBeNull()
    expect(store.error).toBeNull()
  })
})
