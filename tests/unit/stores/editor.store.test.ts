import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '../../../src/stores/article/editor.store'
import type { BriefData, Outline } from '../../../shared/types/index'

const mockStartStream = vi.fn()

vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: vi.fn(() => ({
    chunks: { value: '' },
    isStreaming: { value: false },
    error: { value: null },
    result: { value: null },
    startStream: mockStartStream,
    abort: vi.fn(),
  })),
}))

const mockApiPost = vi.fn()
const mockApiPut = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
}))

const mockBriefData: BriefData = {
  article: {
    id: 1,
    title: 'Test Article',
    type: 'Pilier',
    slug: 'test-article',
    topic: 'Test Theme',
    status: 'à rédiger',
    cocoonName: 'Test Cocoon',
  },
  keywords: [
    { keyword: 'pilier keyword', cocoonName: 'Test Cocoon', type: 'Pilier' },
    { keyword: 'secondary keyword', cocoonName: 'Test Cocoon', type: 'Moyenne traine' },
  ],
  dataForSeo: {
    keyword: 'pilier keyword',
    serp: [],
    paa: [{ question: 'What is this?', answer: 'An answer' }],
    relatedKeywords: [],
    keywordData: { searchVolume: 100, difficulty: 30, cpc: 1.5, competition: 0.4, monthlySearches: [] },
    cachedAt: '2026-03-06T12:00:00.000Z',
  },
  contentLengthRecommendation: 2500,
}

const mockOutline: Outline = {
  sections: [
    { id: 'h1-test', level: 1, title: 'Test Article', annotation: 'sommaire-cliquable', status: 'accepted' },
    { id: 'h2-intro', level: 2, title: 'Introduction', annotation: 'content-valeur', status: 'accepted' },
  ],
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockStartStream.mockResolvedValue(undefined)
  mockApiPost.mockResolvedValue({ metaTitle: 'Mock Title', metaDescription: 'Mock description.' })
  mockApiPut.mockResolvedValue({})
})

describe('editor.store — generateArticle', () => {
  it('calls startStream with correct body and callbacks', async () => {
    const store = useEditorStore()
    await store.generateArticle(mockBriefData, mockOutline)

    expect(mockStartStream).toHaveBeenCalledWith(
      '/api/generate/article',
      expect.objectContaining({
        articleId: 1,
        outline: mockOutline,
        keyword: 'pilier keyword',
        keywords: ['pilier keyword', 'secondary keyword'],
        articleType: 'Pilier',
        articleTitle: 'Test Article',
        cocoonName: 'Test Cocoon',
        topic: 'Test Theme',
      }),
      expect.objectContaining({
        onChunk: expect.any(Function),
        onDone: expect.any(Function),
        onError: expect.any(Function),
      }),
    )
  })

  it('sets isGenerating during generation', async () => {
    const store = useEditorStore()
    expect(store.isGenerating).toBe(false)

    let resolve: () => void
    mockStartStream.mockReturnValueOnce(new Promise<void>((r) => { resolve = r }))

    const promise = store.generateArticle(mockBriefData, mockOutline)
    expect(store.isGenerating).toBe(true)

    resolve!()
    await promise

    expect(store.isGenerating).toBe(false)
  })

  it('picks up content from streaming callbacks', async () => {
    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: any) => {
      callbacks.onChunk('<h2>Intro</h2><p>Content')
      callbacks.onDone({ content: '<h2>Intro</h2><p>Content</p>' })
    })

    const store = useEditorStore()
    await store.generateArticle(mockBriefData, mockOutline)

    expect(store.content).toBe('<h2>Intro</h2><p>Content</p>')
    expect(store.streamedText).toBe('<h2>Intro</h2><p>Content')
  })

  it('picks up error from streaming callbacks', async () => {
    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: any) => {
      callbacks.onError('Claude API error')
    })

    const store = useEditorStore()
    await store.generateArticle(mockBriefData, mockOutline)

    expect(store.error).toBe('Claude API error')
  })

  it('uses article title as fallback when no pilier keyword', async () => {
    const briefNoPilier: BriefData = {
      ...mockBriefData,
      keywords: [{ keyword: 'secondary', cocoonName: 'Test Cocoon', type: 'Moyenne traine' }],
    }

    const store = useEditorStore()
    await store.generateArticle(briefNoPilier, mockOutline)

    expect(mockStartStream).toHaveBeenCalledWith(
      '/api/generate/article',
      expect.objectContaining({ keyword: 'Test Article' }),
      expect.any(Object),
    )
  })
})

describe('editor.store — generateMeta', () => {
  it('calls apiPost and stores meta values', async () => {
    const store = useEditorStore()
    await store.generateMeta(1, 'keyword', 'Title', '<p>Content</p>')

    expect(mockApiPost).toHaveBeenCalledWith('/generate/meta', {
      articleId: 1,
      keyword: 'keyword',
      articleTitle: 'Title',
      articleContent: '<p>Content</p>',
    })
    expect(store.metaTitle).toBe('Mock Title')
    expect(store.metaDescription).toBe('Mock description.')
    expect(store.isGeneratingMeta).toBe(false)
  })

  it('sets error on apiPost failure', async () => {
    mockApiPost.mockRejectedValueOnce(new Error('API failed'))

    const store = useEditorStore()
    await store.generateMeta(1, 'keyword', 'Title', '<p>Content</p>')

    expect(store.error).toBe('API failed')
    expect(store.isGeneratingMeta).toBe(false)
  })
})

describe('editor.store — saveArticle', () => {
  it('calls apiPut with content and metas', async () => {
    const store = useEditorStore()
    // Simulate content and metas set
    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: any) => {
      callbacks.onDone({ content: '<h2>Article</h2>' })
    })
    await store.generateArticle(mockBriefData, mockOutline)
    await store.generateMeta(1, 'keyword', 'Title', '<h2>Article</h2>')

    await store.saveArticle(1)

    expect(mockApiPut).toHaveBeenCalledWith('/articles/1', {
      content: '<h2>Article</h2>',
      metaTitle: 'Mock Title',
      metaDescription: 'Mock description.',
    })
  })

  it('sets error on apiPut failure', async () => {
    mockApiPut.mockRejectedValueOnce(new Error('Save failed'))

    const store = useEditorStore()
    await store.saveArticle(1)

    expect(store.error).toBe('Save failed')
  })

  it('updates isSaving, lastSavedAt, and markClean on success', async () => {
    const store = useEditorStore()
    store.setContent('<p>Changed</p>')
    expect(store.isDirty).toBe(true)
    expect(store.isSaving).toBe(false)
    expect(store.lastSavedAt).toBeNull()

    await store.saveArticle(1)

    expect(store.isSaving).toBe(false)
    expect(store.isDirty).toBe(false)
    expect(store.lastSavedAt).not.toBeNull()
  })

  it('handles error without crash and resets isSaving', async () => {
    mockApiPut.mockRejectedValueOnce(new Error('Network error'))

    const store = useEditorStore()
    store.setContent('<p>Changed</p>')

    await store.saveArticle(1)

    expect(store.isSaving).toBe(false)
    expect(store.error).toBe('Network error')
    expect(store.isDirty).toBe(true) // dirty not cleared on error
    expect(store.lastSavedAt).toBeNull() // not updated on error
  })
})

describe('editor.store — setContent & isDirty', () => {
  it('setContent updates content and sets isDirty', () => {
    const store = useEditorStore()
    expect(store.isDirty).toBe(false)
    expect(store.content).toBeNull()

    store.setContent('<h2>New content</h2>')

    expect(store.content).toBe('<h2>New content</h2>')
    expect(store.isDirty).toBe(true)
  })

  it('markClean resets isDirty to false', () => {
    const store = useEditorStore()
    store.setContent('<p>Content</p>')
    expect(store.isDirty).toBe(true)

    store.markClean()
    expect(store.isDirty).toBe(false)
  })

  it('resetEditor also resets isDirty', () => {
    const store = useEditorStore()
    store.setContent('<p>Content</p>')
    expect(store.isDirty).toBe(true)

    store.resetEditor()
    expect(store.isDirty).toBe(false)
    expect(store.content).toBeNull()
  })
})

describe('editor.store — resetEditor', () => {
  it('clears all state including isGeneratingMeta', async () => {
    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: any) => {
      callbacks.onChunk('<h2>Test</h2>')
      callbacks.onDone({ content: '<h2>Test</h2>' })
    })

    const store = useEditorStore()
    await store.generateArticle(mockBriefData, mockOutline)

    expect(store.content).not.toBeNull()

    store.resetEditor()

    expect(store.content).toBeNull()
    expect(store.streamedText).toBe('')
    expect(store.error).toBeNull()
    expect(store.metaTitle).toBeNull()
    expect(store.metaDescription).toBeNull()
    expect(store.isGenerating).toBe(false)
    expect(store.isGeneratingMeta).toBe(false)
    expect(store.isDirty).toBe(false)
    expect(store.isSaving).toBe(false)
    expect(store.lastSavedAt).toBeNull()
  })
})
