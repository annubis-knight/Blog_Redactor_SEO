import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'
import type { ArticleKeywords } from '../../../shared/types/index.js'

// Mock the API service
vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}))

import { apiGet, apiPut, apiPost } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)
const mockApiPut = vi.mocked(apiPut)
const mockApiPost = vi.mocked(apiPost)

const mockKeywords: ArticleKeywords = {
  articleSlug: 'design-emotionnel',
  capitaine: 'design émotionnel',
  lieutenants: ['UX émotionnelle', 'design affectif'],
  lexique: ['micro-interactions', 'affordance', 'empathie utilisateur'],
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
  mockApiPut.mockReset()
  mockApiPost.mockReset()
})

describe('article-keywords.store — initial state', () => {
  it('has correct default values', () => {
    const store = useArticleKeywordsStore()

    expect(store.keywords).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.isSaving).toBe(false)
    expect(store.isSuggestingLexique).toBe(false)
    expect(store.error).toBeNull()
    expect(store.hasKeywords).toBe(false)
  })
})

describe('article-keywords.store — fetchKeywords', () => {
  it('loads existing keywords from API', async () => {
    mockApiGet.mockResolvedValue(mockKeywords)
    const store = useArticleKeywordsStore()

    await store.fetchKeywords('design-emotionnel')

    expect(mockApiGet).toHaveBeenCalledWith('/articles/design-emotionnel/keywords')
    expect(store.keywords).toEqual(mockKeywords)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('stays null when API returns null', async () => {
    mockApiGet.mockResolvedValue(null)
    const store = useArticleKeywordsStore()

    await store.fetchKeywords('new-article')

    expect(store.keywords).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets error on API failure', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'))
    const store = useArticleKeywordsStore()

    await store.fetchKeywords('design-emotionnel')

    expect(store.error).toBe('Network error')
    expect(store.keywords).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('sets generic error message for non-Error throws', async () => {
    mockApiGet.mockRejectedValue('something went wrong')
    const store = useArticleKeywordsStore()

    await store.fetchKeywords('design-emotionnel')

    expect(store.error).toBe('Erreur inconnue')
  })

  it('sets isLoading true during fetch', async () => {
    let resolve: (value: ArticleKeywords) => void
    mockApiGet.mockImplementation(() => new Promise((r) => { resolve = r as (value: ArticleKeywords) => void }))
    const store = useArticleKeywordsStore()

    const promise = store.fetchKeywords('design-emotionnel')
    expect(store.isLoading).toBe(true)

    resolve!(mockKeywords)
    await promise

    expect(store.isLoading).toBe(false)
  })

  it('clears previous error on retry', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('fail'))
    const store = useArticleKeywordsStore()
    await store.fetchKeywords('design-emotionnel')
    expect(store.error).toBe('fail')

    mockApiGet.mockResolvedValue(mockKeywords)
    await store.fetchKeywords('design-emotionnel')
    expect(store.error).toBeNull()
    expect(store.keywords).toEqual(mockKeywords)
  })
})

describe('article-keywords.store — initEmpty', () => {
  it('creates empty keywords for a given article id', () => {
    const store = useArticleKeywordsStore()

    store.initEmpty(1)

    expect(store.keywords).toEqual({
      articleId: 1,
      capitaine: '',
      lieutenants: [],
      lexique: [],
      rootKeywords: [],
      richCaptain: undefined,
      richRootKeywords: [],
      richLieutenants: [],
    })
  })
})

describe('article-keywords.store — setCapitaine', () => {
  it('updates capitaine value on existing keywords', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty('my-article')

    store.setCapitaine('nouveau capitaine')

    expect(store.keywords!.capitaine).toBe('nouveau capitaine')
  })

  it('creates keywords object if null', () => {
    const store = useArticleKeywordsStore()
    expect(store.keywords).toBeNull()

    store.setCapitaine('capitaine from scratch')

    expect(store.keywords).not.toBeNull()
    expect(store.keywords!.capitaine).toBe('capitaine from scratch')
    expect(store.keywords!.lieutenants).toEqual([])
    expect(store.keywords!.lexique).toEqual([])
  })
})

describe('article-keywords.store — addLieutenant / removeLieutenant', () => {
  it('adds a lieutenant', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty('my-article')

    store.addLieutenant('variante SEO')

    expect(store.keywords!.lieutenants).toEqual(['variante SEO'])
  })

  it('does not add duplicate lieutenant', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty('my-article')

    store.addLieutenant('variante SEO')
    store.addLieutenant('variante SEO')

    expect(store.keywords!.lieutenants).toEqual(['variante SEO'])
  })

  it('removes a lieutenant', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty('my-article')
    store.addLieutenant('variante A')
    store.addLieutenant('variante B')

    store.removeLieutenant('variante A')

    expect(store.keywords!.lieutenants).toEqual(['variante B'])
  })

  it('does nothing if keywords is null', () => {
    const store = useArticleKeywordsStore()

    store.addLieutenant('orphan')
    store.removeLieutenant('orphan')

    expect(store.keywords).toBeNull()
  })
})

describe('article-keywords.store — addLexiqueTerm / removeLexiqueTerm', () => {
  it('adds a lexique term', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty('my-article')

    store.addLexiqueTerm('affordance')

    expect(store.keywords!.lexique).toEqual(['affordance'])
  })

  it('does not add duplicate lexique term', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty('my-article')

    store.addLexiqueTerm('affordance')
    store.addLexiqueTerm('affordance')

    expect(store.keywords!.lexique).toEqual(['affordance'])
  })

  it('removes a lexique term', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty('my-article')
    store.addLexiqueTerm('affordance')
    store.addLexiqueTerm('empathie')

    store.removeLexiqueTerm('affordance')

    expect(store.keywords!.lexique).toEqual(['empathie'])
  })

  it('does nothing if keywords is null', () => {
    const store = useArticleKeywordsStore()

    store.addLexiqueTerm('orphan')
    store.removeLexiqueTerm('orphan')

    expect(store.keywords).toBeNull()
  })
})

describe('article-keywords.store — saveKeywords', () => {
  it('saves keywords via API and updates state', async () => {
    const savedKeywords: ArticleKeywords = { ...mockKeywords, capitaine: 'updated capitaine' }
    mockApiPut.mockResolvedValue(savedKeywords)
    const store = useArticleKeywordsStore()
    store.initEmpty('design-emotionnel')
    store.setCapitaine('updated capitaine')

    await store.saveKeywords('design-emotionnel')

    expect(mockApiPut).toHaveBeenCalledWith('/articles/design-emotionnel/keywords', {
      capitaine: 'updated capitaine',
      lieutenants: [],
      lexique: [],
      rootKeywords: [],
      hnStructure: [],
    })
    expect(store.keywords).toEqual(savedKeywords)
    expect(store.isSaving).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets error on save failure', async () => {
    mockApiPut.mockRejectedValue(new Error('Save failed'))
    const store = useArticleKeywordsStore()
    store.initEmpty('design-emotionnel')
    store.setCapitaine('test')

    await store.saveKeywords('design-emotionnel')

    expect(store.error).toBe('Save failed')
    expect(store.isSaving).toBe(false)
  })

  it('sets generic error message for non-Error throws on save', async () => {
    mockApiPut.mockRejectedValue('unknown save error')
    const store = useArticleKeywordsStore()
    store.initEmpty('design-emotionnel')
    store.setCapitaine('test')

    await store.saveKeywords('design-emotionnel')

    expect(store.error).toBe('Erreur de sauvegarde')
  })

  it('auto-initializes and saves when keywords is null', async () => {
    const store = useArticleKeywordsStore()
    mockApiPut.mockResolvedValueOnce({
      articleSlug: 'design-emotionnel', capitaine: '', lieutenants: [], lexique: [],
      rootKeywords: [], richRootKeywords: [], richLieutenants: [],
    })

    await store.saveKeywords('design-emotionnel')

    expect(mockApiPut).toHaveBeenCalled()
    expect(store.keywords).not.toBeNull()
  })

  it('sets isSaving true during save', async () => {
    let resolve: (value: ArticleKeywords) => void
    mockApiPut.mockImplementation(() => new Promise((r) => { resolve = r as (value: ArticleKeywords) => void }))
    const store = useArticleKeywordsStore()
    store.initEmpty('design-emotionnel')
    store.setCapitaine('test')

    const promise = store.saveKeywords('design-emotionnel')
    expect(store.isSaving).toBe(true)

    resolve!(mockKeywords)
    await promise

    expect(store.isSaving).toBe(false)
  })
})

describe('article-keywords.store — suggestLexique', () => {
  it('calls API and sets lexique on success', async () => {
    const suggestedLexique = ['terme1', 'terme2', 'terme3']
    mockApiPost.mockResolvedValue({ lexique: suggestedLexique })
    const store = useArticleKeywordsStore()
    store.initEmpty('design-emotionnel')
    store.setCapitaine('design émotionnel')

    await store.suggestLexique('design-emotionnel', 'Design émotionnel en web', 'UX Design')

    expect(mockApiPost).toHaveBeenCalledWith('/keywords/lexique-suggest', {
      capitaine: 'design émotionnel',
      articleTitle: 'Design émotionnel en web',
      cocoonName: 'UX Design',
    })
    expect(store.keywords!.lexique).toEqual(suggestedLexique)
    expect(store.isSuggestingLexique).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets error on suggest failure', async () => {
    mockApiPost.mockRejectedValue(new Error('Claude error'))
    const store = useArticleKeywordsStore()
    store.initEmpty('design-emotionnel')
    store.setCapitaine('design émotionnel')

    await store.suggestLexique('design-emotionnel', 'Title', 'Cocoon')

    expect(store.error).toBe('Claude error')
    expect(store.isSuggestingLexique).toBe(false)
  })

  it('sets generic error message for non-Error throws on suggest', async () => {
    mockApiPost.mockRejectedValue('unknown suggest error')
    const store = useArticleKeywordsStore()
    store.initEmpty('design-emotionnel')
    store.setCapitaine('design émotionnel')

    await store.suggestLexique('design-emotionnel', 'Title', 'Cocoon')

    expect(store.error).toBe('Erreur de suggestion')
  })

  it('does nothing if capitaine is empty', async () => {
    const store = useArticleKeywordsStore()
    store.initEmpty('design-emotionnel')

    await store.suggestLexique('design-emotionnel', 'Title', 'Cocoon')

    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('does nothing if keywords is null', async () => {
    const store = useArticleKeywordsStore()

    await store.suggestLexique('design-emotionnel', 'Title', 'Cocoon')

    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('sets isSuggestingLexique true during suggest', async () => {
    let resolve: (value: { lexique: string[] }) => void
    mockApiPost.mockImplementation(() => new Promise((r) => { resolve = r as (value: { lexique: string[] }) => void }))
    const store = useArticleKeywordsStore()
    store.initEmpty('design-emotionnel')
    store.setCapitaine('design émotionnel')

    const promise = store.suggestLexique('design-emotionnel', 'Title', 'Cocoon')
    expect(store.isSuggestingLexique).toBe(true)

    resolve!({ lexique: ['a', 'b'] })
    await promise

    expect(store.isSuggestingLexique).toBe(false)
  })
})

describe('article-keywords.store — hasKeywords computed', () => {
  it('returns false when keywords is null', () => {
    const store = useArticleKeywordsStore()
    expect(store.hasKeywords).toBe(false)
  })

  it('returns false when capitaine is empty', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty('my-article')
    expect(store.hasKeywords).toBe(false)
  })

  it('returns true when capitaine is set', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty('my-article')
    store.setCapitaine('mon capitaine')
    expect(store.hasKeywords).toBe(true)
  })
})

describe('article-keywords.store — $reset', () => {
  it('resets all state to defaults', async () => {
    mockApiGet.mockResolvedValue(mockKeywords)
    const store = useArticleKeywordsStore()
    await store.fetchKeywords('design-emotionnel')
    expect(store.keywords).not.toBeNull()

    store.$reset()

    expect(store.keywords).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.isSaving).toBe(false)
    expect(store.isSuggestingLexique).toBe(false)
    expect(store.error).toBeNull()
  })
})
