import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBriefStore, calculateContentLength } from '../../../src/stores/strategy/brief.store'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiGet, apiPost } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)

const mockArticleResponse = {
  article: { title: 'Test Article', type: 'pilier' as const, slug: 'test-article', topic: 'Test', status: 'à rédiger' as const, captainKeywordLocked: 'mot clé capitaine' },
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
    expect(store.briefData!.contentLengthRecommendation).toBe(2500) // longueur visée du Pilier (source unique)
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

  // R13 : les données SERP (questions PAA comprises) portaient sur le mot-clé
  // pilier du cocon : un intermédiaire était rédigé avec les questions du pilier.
  it('DataForSEO porte sur le capitaine de l’article, pas sur le pilier du cocon (R13)', async () => {
    mockApiGet.mockResolvedValueOnce(mockArticleResponse)
    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    expect(mockApiPost).toHaveBeenCalledWith('/dataforseo/brief', { keyword: 'mot clé capitaine' }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('capitaine pas encore verrouillé : le mot-clé suggéré de l’article', async () => {
    mockApiGet.mockResolvedValueOnce({ ...mockArticleResponse, article: { ...mockArticleResponse.article, captainKeywordLocked: null, suggestedKeyword: 'mot clé suggéré' } })
    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    expect(mockApiPost).toHaveBeenCalledWith('/dataforseo/brief', { keyword: 'mot clé suggéré' }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('sans mot-clé d’article : aucun appel, jamais le pilier en repli', async () => {
    mockApiGet.mockResolvedValueOnce({ ...mockArticleResponse, article: { ...mockArticleResponse.article, captainKeywordLocked: null } })
    mockApiGet.mockResolvedValueOnce(mockKeywords)

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

// R16 — l'écran affichait la recommandation du brief même quand l'utilisateur
// avait choisi une autre longueur : la barre de mots, l'écart et la réduction
// ne visaient pas la cible que la rédaction et sa porte suivent.
describe('brief.store — longueur visée', () => {
  async function loaded(micro: unknown) {
    mockApiGet.mockResolvedValueOnce(mockArticleResponse)
    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiGet.mockResolvedValueOnce(micro)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)
    const store = useBriefStore()
    await store.fetchBrief(7)
    await new Promise(resolve => setTimeout(resolve, 0))
    return store
  }

  it('la cible choisie pour l’article l’emporte sur la recommandation', async () => {
    const store = await loaded({ targetWordCount: 3100 })
    expect(mockApiGet).toHaveBeenCalledWith('/articles/7/micro-context')
    expect(store.targetWordCount).toBe(3100)
  })

  it('sans cible choisie, la recommandation fait foi', async () => {
    const store = await loaded(null)
    expect(store.targetWordCount).toBe(store.briefData!.contentLengthRecommendation)
  })

  it('un nouveau choix est suivi aussitôt', async () => {
    const store = await loaded(null)
    store.setRetainedWordCount(1900)
    expect(store.targetWordCount).toBe(1900)
  })
})

describe('brief.store — serpKeyword', () => {
  it('le mot-clé de l’article, celui des données SERP', async () => {
    mockApiGet.mockResolvedValueOnce(mockArticleResponse)
    mockApiGet.mockResolvedValueOnce(mockKeywords)
    mockApiPost.mockResolvedValueOnce(mockDataForSeo)

    const store = useBriefStore()
    await store.fetchBrief('test-article')

    expect(store.serpKeyword).toBe('mot clé capitaine')
  })

  it('returns null when no briefData loaded', () => {
    const store = useBriefStore()
    expect(store.serpKeyword).toBeNull()
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

    expect(mockApiPost).toHaveBeenCalledWith('/dataforseo/brief', { keyword: 'mot clé capitaine', forceRefresh: true })
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
  // FR-INFRA-TYPE-RULES-SSOT — la longueur visée du type, la même que la
  // rédaction (l'écran affichait 2 650 quand la rédaction visait 2 500).
  it('returns 2500 for Pilier', () => {
    expect(calculateContentLength('pilier')).toBe(2500)
  })

  it('returns 1800 for Intermédiaire', () => {
    expect(calculateContentLength('intermediaire')).toBe(1800)
  })

  it('returns 1200 for Spécialisé', () => {
    expect(calculateContentLength('specifique')).toBe(1200)
  })

  it('returns the single default (2000) for unknown type', () => {
    expect(calculateContentLength('unknown' as ArticleLevel)).toBe(2000)
  })
})
