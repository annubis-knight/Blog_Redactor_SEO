import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBriefStore, calculateContentLength } from '../../../src/stores/strategy/brief.store'
import type { ArticleType } from '../../../shared/types/index'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiGet, apiPost } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)

const mockArticleResponse = {
  article: { title: 'Test Article', type: 'Pilier' as const, slug: 'test-article', topic: 'Test', status: 'à rédiger' as const },
  cocoonName: 'Test Cocoon',
}

const mockKeywords = [
  { keyword: 'mot clé pilier', cocoonName: 'Test Cocoon', type: 'Pilier' as const },
  { keyword: 'mot clé secondaire', cocoonName: 'Test Cocoon', type: 'Moyenne traine' as const },
  { keyword: 'mot clé longue', cocoonName: 'Test Cocoon', type: 'Longue traine' as const },
]

const mockDataForSeo = {
  keyword: 'mot clé pilier',
  serp: [{ position: 1, title: 'Result 1', url: 'https://example.com', description: 'Desc', domain: 'example.com' }],
  paa: [{ question: 'What is this?', answer: 'This is a test' }],
  relatedKeywords: [{ keyword: 'related', searchVolume: 100, competition: 0.5, cpc: 1.2 }],
  keywordData: { searchVolume: 500, difficulty: 40, cpc: 2.0, competition: 0.3, monthlySearches: [400, 500, 600] },
  cachedAt: '2026-03-06T12:00:00.000Z',
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
  mockApiPost.mockReset()
})

describe('brief.store — fetchBrief', () => {
  it('loads brief data from API and assembles BriefData', async () => {
    mockApiGet.mockResolvedValueOnce(mockArticleResponse)
    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    expect(store.briefData).not.toBeNull()
    expect(store.briefData!.article.title).toBe('Test Article')
    expect(store.briefData!.article.cocoonName).toBe('Test Cocoon')
    expect(store.briefData!.keywords).toHaveLength(3)
    expect(store.briefData!.dataForSeo).toEqual(mockDataForSeo)
    expect(store.briefData!.contentLengthRecommendation).toBe(2650) // Pilier midpoint (1800-3500)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('calls apiGet with correct paths', async () => {
    mockApiGet.mockResolvedValueOnce(mockArticleResponse)
    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    expect(mockApiGet).toHaveBeenCalledWith('/articles/test-article', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(mockApiGet).toHaveBeenCalledWith('/keywords/Test%20Cocoon', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('calls apiPost for DataForSEO with pilier keyword', async () => {
    mockApiGet.mockResolvedValueOnce(mockArticleResponse)
    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    expect(mockApiPost).toHaveBeenCalledWith('/dataforseo/brief', { keyword: 'mot clé pilier' }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('skips DataForSEO call when no pilier keyword exists', async () => {
    const keywordsNoPilier = [
      { keyword: 'secondaire', cocoonName: 'Test Cocoon', type: 'Moyenne traine' as const },
    ]
    mockApiGet.mockResolvedValueOnce(mockArticleResponse)
    mockApiGet.mockResolvedValueOnce(keywordsNoPilier)

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    // DataForSEO skip confirmé (dataForSeo = null). Note : /recommend-word-count
    // peut être appelé en parallèle mais ne concerne pas DataForSEO.
    const dataForSeoCalls = mockApiPost.mock.calls.filter(
      ([path]) => typeof path === 'string' && path.startsWith('/dataforseo/'),
    )
    expect(dataForSeoCalls.length).toBe(0)
    expect(store.briefData!.dataForSeo).toBeNull()
  })

  it('sets error on API failure', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network error'))

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    expect(store.error).toBe('Network error')
    expect(store.briefData).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('sets isLoading during fetch', async () => {
    let resolveArticle: (value: unknown) => void
    mockApiGet.mockReturnValueOnce(new Promise((resolve) => { resolveArticle = resolve }))

    const store = useBriefStore()
    const promise = store.fetchBrief('test-article')
    expect(store.isLoading).toBe(true)

    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)
    resolveArticle!(mockArticleResponse)
    await promise

    expect(store.isLoading).toBe(false)
  })
})

describe('brief.store — pilierKeyword', () => {
  it('returns the pilier keyword from briefData', async () => {
    mockApiGet.mockResolvedValueOnce(mockArticleResponse)
    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    expect(store.pilierKeyword).toEqual({ keyword: 'mot clé pilier', cocoonName: 'Test Cocoon', type: 'Pilier' })
  })

  it('returns null when no briefData loaded', () => {
    const store = useBriefStore()
    expect(store.pilierKeyword).toBeNull()
  })
})

describe('brief.store — refreshDataForSeo', () => {
  it('calls apiPost with forceRefresh: true', async () => {
    mockApiGet.mockResolvedValueOnce(mockArticleResponse)
    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    const updatedData = { ...mockDataForSeo, cachedAt: '2026-03-06T13:00:00.000Z' }
    mockApiPost.mockResolvedValueOnce(updatedData)

    await store.refreshDataForSeo()

    expect(mockApiPost).toHaveBeenCalledWith('/dataforseo/brief', { keyword: 'mot clé pilier', forceRefresh: true })
    expect(store.briefData!.dataForSeo!.cachedAt).toBe('2026-03-06T13:00:00.000Z')
    expect(store.isRefreshing).toBe(false)
  })

  it('does nothing when no briefData', async () => {
    const store = useBriefStore()
    await store.refreshDataForSeo()

    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('sets error on refresh failure', async () => {
    mockApiGet.mockResolvedValueOnce(mockArticleResponse)
    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    mockApiPost.mockRejectedValueOnce(new Error('Refresh failed'))
    await store.refreshDataForSeo()

    expect(store.error).toBe('Refresh failed')
    expect(store.isRefreshing).toBe(false)
  })
})

describe('calculateContentLength (fallback heuristique)', () => {
  // Ces valeurs sont les midpoints des bornes TYPE_BASE définies dans
  // target-word-count.service.ts. Elles servent de fallback synchrone tant
  // que la recommandation IA serveur n'a pas répondu.
  it('returns 2650 for Pilier (midpoint 1800-3500)', () => {
    expect(calculateContentLength('Pilier')).toBe(2650)
  })

  it('returns 1850 for Intermédiaire (midpoint 1200-2500)', () => {
    expect(calculateContentLength('Intermédiaire')).toBe(1850)
  })

  it('returns 1150 for Spécialisé (midpoint 800-1500)', () => {
    expect(calculateContentLength('Spécialisé')).toBe(1150)
  })

  it('returns 1500 for unknown type', () => {
    expect(calculateContentLength('unknown' as ArticleType)).toBe(1500)
  })
})
