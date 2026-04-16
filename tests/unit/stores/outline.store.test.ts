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

vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: vi.fn(() => ({ ...mockStreamingState })),
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
        articleId: 1,
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

describe('outline.store — undo/redo', () => {
  it('undo restaure l etat precedent apres addSection', () => {
    const store = useOutlineStore()
    store.outline = { sections: [{ id: 'h1-1', level: 1, title: 'Title', annotation: null, status: 'accepted' }] }

    expect(store.outline.sections).toHaveLength(1)

    store.addSection(null, 2)
    expect(store.outline!.sections).toHaveLength(2)

    store.undo()
    expect(store.outline!.sections).toHaveLength(1)
  })

  it('redo refait l operation annulee', () => {
    const store = useOutlineStore()
    store.outline = { sections: [{ id: 'h1-1', level: 1, title: 'Title', annotation: null, status: 'accepted' }] }

    store.addSection(null, 2)
    expect(store.outline!.sections).toHaveLength(2)

    store.undo()
    expect(store.outline!.sections).toHaveLength(1)

    store.redo()
    expect(store.outline!.sections).toHaveLength(2)
  })

  it('canUndo est false quand le stack est vide', () => {
    const store = useOutlineStore()
    store.outline = { sections: [] }
    expect(store.canUndo).toBe(false)

    store.addSection(null, 2)
    expect(store.canUndo).toBe(true)

    store.undo()
    expect(store.canUndo).toBe(false)
  })

  it('le stack est limite a 20 entrees', () => {
    const store = useOutlineStore()
    store.outline = { sections: [{ id: 'h1-1', level: 1, title: 'Title', annotation: null, status: 'accepted' }] }

    // Perform 25 modifications
    for (let i = 0; i < 25; i++) {
      store.addSection(null, 2)
    }

    // Undo should work 20 times max
    let undoCount = 0
    while (store.canUndo) {
      store.undo()
      undoCount++
    }
    expect(undoCount).toBe(20)
  })

  it('redo stack est vide apres une nouvelle operation', () => {
    const store = useOutlineStore()
    store.outline = { sections: [{ id: 'h1-1', level: 1, title: 'Title', annotation: null, status: 'accepted' }] }

    store.addSection(null, 2)
    store.undo()
    expect(store.canRedo).toBe(true)

    // New operation clears redo stack
    store.addSection(null, 3)
    expect(store.canRedo).toBe(false)
  })

  it('resetOutline vide les stacks undo/redo', () => {
    const store = useOutlineStore()
    store.outline = { sections: [{ id: 'h1-1', level: 1, title: 'Title', annotation: null, status: 'accepted' }] }

    store.addSection(null, 2)
    expect(store.canUndo).toBe(true)

    store.resetOutline()
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
  })
})
