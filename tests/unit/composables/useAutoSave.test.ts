import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '../../../src/stores/article/editor.store'

const mockPause = vi.fn()
const mockResume = vi.fn()
const mockIsActive = { value: true }
let intervalCallback: (() => void) | null = null

vi.mock('@vueuse/core', () => ({
  useIntervalFn: (cb: () => void, _ms: number) => {
    intervalCallback = cb
    return { pause: mockPause, resume: mockResume, isActive: mockIsActive }
  },
}))

vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: vi.fn(() => ({
    chunks: { value: '' },
    isStreaming: { value: false },
    error: { value: null },
    result: { value: null },
    startStream: vi.fn(),
    abort: vi.fn(),
  })),
}))

vi.mock('../../../src/services/api.service', () => ({
  apiPost: vi.fn(),
  apiPut: vi.fn().mockResolvedValue({}),
}))

// Import useAutoSave after mocks are set up
import { useAutoSave } from '../../../src/composables/editor/useAutoSave'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  intervalCallback = null
})

describe('useAutoSave', () => {
  it('calls saveArticle when isDirty is true after interval', async () => {
    const store = useEditorStore()
    store.setContent('<p>Changed</p>')
    const saveSpy = vi.spyOn(store, 'saveArticle')

    useAutoSave('test-slug', 30_000)
    expect(intervalCallback).not.toBeNull()

    await intervalCallback!()

    expect(saveSpy).toHaveBeenCalledWith('test-slug')
  })

  it('does NOT call saveArticle when isDirty is false', async () => {
    const store = useEditorStore()
    const saveSpy = vi.spyOn(store, 'saveArticle')

    useAutoSave('test-slug', 30_000)
    await intervalCallback!()

    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('does NOT call saveArticle when isSaving is true', async () => {
    const store = useEditorStore()
    store.setContent('<p>Changed</p>')
    store.$patch({ isSaving: true })
    const saveSpy = vi.spyOn(store, 'saveArticle')

    useAutoSave('test-slug', 30_000)
    await intervalCallback!()

    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('does NOT call saveArticle when isGenerating is true', async () => {
    const store = useEditorStore()
    store.setContent('<p>Changed</p>')
    store.$patch({ isGenerating: true })
    const saveSpy = vi.spyOn(store, 'saveArticle')

    useAutoSave('test-slug', 30_000)
    await intervalCallback!()

    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('does NOT call saveArticle when isReducing is true (G2 guard)', async () => {
    const store = useEditorStore()
    store.setContent('<p>Changed</p>')
    store.$patch({ isReducing: true })
    const saveSpy = vi.spyOn(store, 'saveArticle')

    useAutoSave('test-slug', 30_000)
    await intervalCallback!()

    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('does NOT call saveArticle when isHumanizing is true (G2 guard)', async () => {
    const store = useEditorStore()
    store.setContent('<p>Changed</p>')
    store.$patch({ isHumanizing: true })
    const saveSpy = vi.spyOn(store, 'saveArticle')

    useAutoSave('test-slug', 30_000)
    await intervalCallback!()

    expect(saveSpy).not.toHaveBeenCalled()
  })
})
