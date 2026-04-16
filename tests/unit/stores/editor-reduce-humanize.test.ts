import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '../../../src/stores/editor.store'

// --- Mocks ---

const mockStartStreamOnce = vi.fn()

vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: vi.fn(() => ({
    chunks: { value: '' },
    isStreaming: { value: false },
    error: { value: null },
    result: { value: null },
    usage: { value: null },
    startStream: vi.fn(),
    abort: vi.fn(),
  })),
  startStreamOnce: (...args: unknown[]) => mockStartStreamOnce(...args),
}))

vi.mock('../../../src/services/api.service', () => ({
  apiPost: vi.fn(),
  apiPut: vi.fn().mockResolvedValue({}),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('editor.store — reduceArticle (section-by-section)', () => {
  const articleHtml = '<p>Intro text here</p><h2>Section 1</h2><p>Body one with many words that need reduction.</p><h2>Section 2</h2><p>Body two with content.</p>'

  it('calls /api/generate/reduce-section for each unit', async () => {
    // intro + 2 sections = 3 calls
    mockStartStreamOnce
      .mockResolvedValueOnce({
        result: { html: '<p>Intro shorter</p>', usage: { inputTokens: 10, outputTokens: 10, model: 'test', estimatedCost: 0.01 }, sectionIndex: 0 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })
      .mockResolvedValueOnce({
        result: { html: '<h2>Section 1</h2><p>Body one reduced.</p>', usage: { inputTokens: 10, outputTokens: 10, model: 'test', estimatedCost: 0.01 }, sectionIndex: 0 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })
      .mockResolvedValueOnce({
        result: { html: '<h2>Section 2</h2><p>Body two reduced.</p>', usage: { inputTokens: 10, outputTokens: 10, model: 'test', estimatedCost: 0.01 }, sectionIndex: 1 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })

    const store = useEditorStore()
    store.$patch({ content: articleHtml })

    await store.reduceArticle(1, 500, 'seo', ['seo', 'web'])

    expect(mockStartStreamOnce).toHaveBeenCalledTimes(3)
    // First call should target /api/generate/reduce-section
    expect(mockStartStreamOnce).toHaveBeenCalledWith(
      '/api/generate/reduce-section',
      expect.objectContaining({
        articleId: 1,
        keyword: 'seo',
        keywords: ['seo', 'web'],
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(store.isDirty).toBe(true)
    expect(store.isReducing).toBe(false)
    expect(store.reduceProgress).toBeNull()
  })

  it('keeps original section on error (graceful degradation)', async () => {
    mockStartStreamOnce
      .mockResolvedValueOnce({
        result: { html: '<p>Intro shorter</p>', usage: null, sectionIndex: 0 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })
      .mockResolvedValueOnce({
        result: null,
        usage: null,
        errorMessage: 'API error on section',
        aborted: false,
      })
      .mockResolvedValueOnce({
        result: { html: '<h2>Section 2</h2><p>Body two reduced.</p>', usage: null, sectionIndex: 1 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })

    const store = useEditorStore()
    store.$patch({ content: articleHtml })

    await store.reduceArticle(1, 500, 'seo', ['seo'])

    // Content should contain reduced intro, original section 1, reduced section 2
    expect(store.content).toContain('<p>Intro shorter</p>')
    expect(store.content).toContain('<h2>Section 1</h2><p>Body one with many words that need reduction.</p>')
    expect(store.content).toContain('<h2>Section 2</h2><p>Body two reduced.</p>')
    expect(store.isReducing).toBe(false)
  })

  it('rolls back on abort (F31)', async () => {
    mockStartStreamOnce
      .mockResolvedValueOnce({
        result: { html: '<p>Intro shorter</p>', usage: null, sectionIndex: 0 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })
      .mockResolvedValueOnce({
        result: null,
        usage: null,
        errorMessage: null,
        aborted: true,
      })

    const store = useEditorStore()
    store.$patch({ content: articleHtml })

    await store.reduceArticle(1, 500, 'seo', ['seo'])

    expect(store.content).toBe(articleHtml) // rolled back
    expect(store.isReducing).toBe(false)
  })

  it('does nothing if no content', async () => {
    const store = useEditorStore()
    await store.reduceArticle(1, 500, 'seo', ['seo'])
    expect(mockStartStreamOnce).not.toHaveBeenCalled()
  })

  it('does nothing if another pipeline is running', async () => {
    const store = useEditorStore()
    store.$patch({ content: articleHtml, isHumanizing: true })

    await store.reduceArticle(1, 500, 'seo', ['seo'])
    expect(mockStartStreamOnce).not.toHaveBeenCalled()
  })
})

describe('editor.store — humanizeArticle', () => {
  const articleHtml = '<p>Intro text</p><h2>Section 1</h2><p>Body one</p><h2>Section 2</h2><p>Body two</p>'

  it('calls /api/generate/humanize-section for each unit', async () => {
    // intro + 2 sections = 3 calls
    mockStartStreamOnce
      .mockResolvedValueOnce({
        result: { html: '<p>Intro humanized</p>', usage: { inputTokens: 10, outputTokens: 10, model: 'test', estimatedCost: 0.01 }, structurePreserved: true, fallback: false, sectionIndex: 0 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })
      .mockResolvedValueOnce({
        result: { html: '<h2>Section 1</h2><p>Body one humanized</p>', usage: { inputTokens: 10, outputTokens: 10, model: 'test', estimatedCost: 0.01 }, structurePreserved: true, fallback: false, sectionIndex: 0 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })
      .mockResolvedValueOnce({
        result: { html: '<h2>Section 2</h2><p>Body two humanized</p>', usage: { inputTokens: 10, outputTokens: 10, model: 'test', estimatedCost: 0.01 }, structurePreserved: true, fallback: false, sectionIndex: 1 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })

    const store = useEditorStore()
    store.$patch({ content: articleHtml })

    await store.humanizeArticle('test-slug', 'seo', ['seo'])

    expect(mockStartStreamOnce).toHaveBeenCalledTimes(3)
    expect(store.isDirty).toBe(true)
    expect(store.isHumanizing).toBe(false)
    expect(store.humanizeProgress).toBeNull()
  })

  it('keeps original section on server fallback', async () => {
    mockStartStreamOnce
      .mockResolvedValueOnce({
        result: { html: '<p>Intro humanized</p>', usage: null, structurePreserved: true, fallback: false, sectionIndex: 0 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })
      .mockResolvedValueOnce({
        result: { html: '<h2>Section 1</h2><p>Body one</p>', usage: null, structurePreserved: false, fallback: true, sectionIndex: 0 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })
      .mockResolvedValueOnce({
        result: { html: '<h2>Section 2</h2><p>Body two humanized</p>', usage: null, structurePreserved: true, fallback: false, sectionIndex: 1 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })

    const store = useEditorStore()
    store.$patch({ content: articleHtml })

    await store.humanizeArticle('test-slug', 'seo', ['seo'])

    expect(store.humanizeFallbackCount).toBe(1)
  })

  it('rolls back on abort (F31)', async () => {
    // First call succeeds, second triggers abort
    mockStartStreamOnce
      .mockResolvedValueOnce({
        result: { html: '<p>Intro humanized</p>', usage: null, structurePreserved: true, fallback: false, sectionIndex: 0 },
        usage: null,
        errorMessage: null,
        aborted: false,
      })
      .mockImplementationOnce(() => {
        return Promise.resolve({
          result: null,
          usage: null,
          errorMessage: null,
          aborted: true,
        })
      })

    const store = useEditorStore()
    store.$patch({ content: articleHtml })

    // Start humanize and abort shortly after first call
    const promise = store.humanizeArticle('test-slug', 'seo', ['seo'])
    await promise

    expect(store.content).toBe(articleHtml) // rolled back
    expect(store.isHumanizing).toBe(false)
  })

  it('does nothing if another pipeline is running', async () => {
    const store = useEditorStore()
    store.$patch({ content: articleHtml, isReducing: true })

    await store.humanizeArticle('test-slug', 'seo', ['seo'])
    expect(mockStartStreamOnce).not.toHaveBeenCalled()
  })
})

describe('editor.store — wordCount SSOT (G5)', () => {
  it('wordCount returns 0 when no content', () => {
    const store = useEditorStore()
    expect(store.wordCount).toBe(0)
  })

  it('wordCount counts words from HTML content', () => {
    const store = useEditorStore()
    store.$patch({ content: '<p>Hello world this is a test</p>' })
    expect(store.wordCount).toBe(6)
  })

  it('wordCountDelta returns null when no target', () => {
    const store = useEditorStore()
    store.$patch({ content: '<p>Hello</p>' })
    expect(store.wordCountDelta(null)).toBeNull()
  })

  it('wordCountDelta returns positive when over target', () => {
    const store = useEditorStore()
    store.$patch({ content: '<p>Hello world this is a test</p>' })
    expect(store.wordCountDelta(3)).toBe(3)
  })
})

describe('editor.store — abortReduce', () => {
  it('abortReduce is safe to call when not reducing', () => {
    const store = useEditorStore()
    expect(() => store.abortReduce()).not.toThrow()
  })
})

describe('editor.store — abortHumanize (G6)', () => {
  it('abortHumanize is safe to call when not humanizing', () => {
    const store = useEditorStore()
    expect(() => store.abortHumanize()).not.toThrow()
  })
})

describe('editor.store — markDirty', () => {
  it('markDirty sets isDirty to true', () => {
    const store = useEditorStore()
    store.$patch({ isDirty: false })
    store.markDirty()
    expect(store.isDirty).toBe(true)
  })
})
