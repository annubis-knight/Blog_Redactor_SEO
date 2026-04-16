import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArticlesStore } from '../../../src/stores/article/articles.store'
import type { Article } from '../../../shared/types/index.js'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
}))

import { apiGet } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)

const mockArticles: Article[] = [
  { title: 'Article Pilier', type: 'Pilier', slug: 'article-pilier', topic: null, status: 'à rédiger' },
  { title: 'Article Inter', type: 'Intermédiaire', slug: 'article-inter', topic: 'Theme', status: 'brouillon' },
  { title: 'Article Spéc', type: 'Spécialisé', slug: 'article-spec', topic: 'Theme', status: 'publié' },
]

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
})

describe('articles.store — fetchArticlesByCocoon', () => {
  it('loads articles from API and updates state', async () => {
    mockApiGet.mockResolvedValue(mockArticles)
    const store = useArticlesStore()

    await store.fetchArticlesByCocoon(0)

    expect(store.articles).toEqual(mockArticles)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.cocoonId).toBe(0)
  })

  it('sets isLoading true during fetch', async () => {
    let resolvePromise: (value: Article[]) => void
    mockApiGet.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve }))
    const store = useArticlesStore()

    const promise = store.fetchArticlesByCocoon(2)
    expect(store.isLoading).toBe(true)

    resolvePromise!(mockArticles)
    await promise

    expect(store.isLoading).toBe(false)
  })

  it('sets error on API failure', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'))
    const store = useArticlesStore()

    await store.fetchArticlesByCocoon(0)

    expect(store.error).toBe('Network error')
    expect(store.articles).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('calls apiGet with correct URL', async () => {
    mockApiGet.mockResolvedValue([])
    const store = useArticlesStore()

    await store.fetchArticlesByCocoon(3)

    expect(mockApiGet).toHaveBeenCalledWith('/cocoons/3/articles')
  })

  it('clears previous error on retry', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('fail'))
    const store = useArticlesStore()
    await store.fetchArticlesByCocoon(0)
    expect(store.error).toBe('fail')

    mockApiGet.mockResolvedValueOnce(mockArticles)
    await store.fetchArticlesByCocoon(0)
    expect(store.error).toBeNull()
    expect(store.articles).toEqual(mockArticles)
  })
})
