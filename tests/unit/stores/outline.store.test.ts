import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOutlineStore } from '../../../src/stores/outline.store'
import type { BriefData, Outline } from '../../../shared/types/index'

// Mock useStreaming
const mockStartStream = vi.fn()
const mockAbort = vi.fn()
const mockStreamingState = {
  chunks: { value: '' },
  isStreaming: { value: false },
  error: { value: null as string | null },
  result: { value: null as Outline | null },
  startStream: mockStartStream,
  abort: mockAbort,
}

vi.mock('../../../src/composables/useStreaming', () => ({
  useStreaming: vi.fn(() => ({ ...mockStreamingState })),
}))

const mockBriefData: BriefData = {
  article: {
    title: 'Test Article',
    type: 'Pilier',
    slug: 'test-article',
    theme: 'Test Theme',
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
    { id: 'h1-test', level: 1, title: 'Test Article', annotation: 'sommaire-cliquable' },
    { id: 'h2-intro', level: 2, title: 'Introduction', annotation: 'content-valeur' },
  ],
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockStreamingState.chunks.value = ''
  mockStreamingState.isStreaming.value = false
  mockStreamingState.error.value = null
  mockStreamingState.result.value = null
  mockStartStream.mockResolvedValue(undefined)
})

describe('outline.store — generateOutline', () => {
  it('calls startStream with correct body and callbacks', async () => {
    const store = useOutlineStore()
    await store.generateOutline(mockBriefData)

    expect(mockStartStream).toHaveBeenCalledWith(
      '/api/generate/outline',
      expect.objectContaining({
        slug: 'test-article',
        keyword: 'pilier keyword',
        keywords: ['pilier keyword', 'secondary keyword'],
        articleType: 'Pilier',
        articleTitle: 'Test Article',
        cocoonName: 'Test Cocoon',
        theme: 'Test Theme',
      }),
      expect.objectContaining({
        onChunk: expect.any(Function),
        onDone: expect.any(Function),
        onError: expect.any(Function),
      }),
    )
  })

  it('sets isGenerating during generation', async () => {
    const store = useOutlineStore()
    expect(store.isGenerating).toBe(false)

    // Make startStream block
    let resolve: () => void
    mockStartStream.mockReturnValueOnce(new Promise<void>((r) => { resolve = r }))

    const promise = store.generateOutline(mockBriefData)
    expect(store.isGenerating).toBe(true)

    resolve!()
    await promise

    expect(store.isGenerating).toBe(false)
  })

  it('picks up outline from streaming callbacks', async () => {
    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: any) => {
      callbacks.onChunk('some text')
      callbacks.onDone(mockOutline)
    })

    const store = useOutlineStore()
    await store.generateOutline(mockBriefData)

    expect(store.outline).toEqual(mockOutline)
    expect(store.streamedText).toBe('some text')
  })

  it('picks up error from streaming callbacks', async () => {
    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: any) => {
      callbacks.onError('Claude error')
    })

    const store = useOutlineStore()
    await store.generateOutline(mockBriefData)

    expect(store.error).toBe('Claude error')
  })

  it('resets isValidated when regenerating', async () => {
    const store = useOutlineStore()
    store.isValidated = true

    await store.generateOutline(mockBriefData)

    expect(store.isValidated).toBe(false)
  })

  it('uses article title as fallback when no pilier keyword', async () => {
    const briefNoPilier: BriefData = {
      ...mockBriefData,
      keywords: [{ keyword: 'secondary', cocoonName: 'Test Cocoon', type: 'Moyenne traine' }],
    }

    const store = useOutlineStore()
    await store.generateOutline(briefNoPilier)

    expect(mockStartStream).toHaveBeenCalledWith(
      '/api/generate/outline',
      expect.objectContaining({ keyword: 'Test Article' }),
      expect.any(Object),
    )
  })
})

describe('outline.store — resetOutline', () => {
  it('clears all state', async () => {
    mockStartStream.mockImplementationOnce(async (_url: string, _body: unknown, callbacks: any) => {
      callbacks.onChunk('text')
      callbacks.onDone(mockOutline)
    })

    const store = useOutlineStore()
    await store.generateOutline(mockBriefData)

    expect(store.outline).not.toBeNull()

    store.resetOutline()

    expect(store.outline).toBeNull()
    expect(store.streamedText).toBe('')
    expect(store.error).toBeNull()
  })
})
