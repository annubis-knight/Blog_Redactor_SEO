import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOutlineStore } from '../../../src/stores/outline.store'
import type { Outline } from '../../../shared/types/index'

const mockStartStream = vi.fn()

vi.mock('../../../src/composables/useStreaming', () => ({
  useStreaming: vi.fn(() => ({
    chunks: { value: '' },
    isStreaming: { value: false },
    error: { value: null },
    result: { value: null },
    startStream: mockStartStream,
    abort: vi.fn(),
  })),
}))

const mockApiPut = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPut: (...args: unknown[]) => mockApiPut(...args),
}))

const mockOutline: Outline = {
  sections: [
    { id: 'h1-main', level: 1, title: 'Main Title', annotation: 'sommaire-cliquable' },
    { id: 'h2-intro', level: 2, title: 'Introduction', annotation: 'content-valeur' },
    { id: 'h3-detail', level: 3, title: 'Detail', annotation: null },
    { id: 'h2-conclusion', level: 2, title: 'Conclusion', annotation: 'content-reminder' },
  ],
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockStartStream.mockResolvedValue(undefined)
  mockApiPut.mockResolvedValue({})
})

describe('outline.store — edit actions', () => {
  it('addSection inserts after given id', () => {
    const store = useOutlineStore()
    store.outline = { ...mockOutline, sections: [...mockOutline.sections] }

    store.addSection('h2-intro', 3)

    expect(store.outline!.sections).toHaveLength(5)
    expect(store.outline!.sections[2].level).toBe(3)
    expect(store.outline!.sections[2].title).toBe('Nouvelle section')
  })

  it('addSection appends at end when afterId is null', () => {
    const store = useOutlineStore()
    store.outline = { ...mockOutline, sections: [...mockOutline.sections] }

    store.addSection(null, 2)

    expect(store.outline!.sections).toHaveLength(5)
    expect(store.outline!.sections[4].level).toBe(2)
  })

  it('removeSection filters out the section', () => {
    const store = useOutlineStore()
    store.outline = { ...mockOutline, sections: [...mockOutline.sections] }

    store.removeSection('h3-detail')

    expect(store.outline!.sections).toHaveLength(3)
    expect(store.outline!.sections.find(s => s.id === 'h3-detail')).toBeUndefined()
  })

  it('updateSection updates title', () => {
    const store = useOutlineStore()
    store.outline = { ...mockOutline, sections: [...mockOutline.sections] }

    store.updateSection('h2-intro', { title: 'Updated Title' })

    expect(store.outline!.sections[1].title).toBe('Updated Title')
  })

  it('reorderSections moves section to new position', () => {
    const store = useOutlineStore()
    store.outline = { ...mockOutline, sections: [...mockOutline.sections] }

    // Move h2-conclusion (index 3) to index 1
    store.reorderSections(3, 1)

    expect(store.outline!.sections[1].id).toBe('h2-conclusion')
    expect(store.outline!.sections[2].id).toBe('h2-intro')
  })

  it('setOutline replaces outline and resets isValidated', () => {
    const store = useOutlineStore()
    store.isValidated = true
    store.outline = mockOutline

    const newOutline: Outline = { sections: [{ id: 'h1-new', level: 1, title: 'New', annotation: null }] }
    store.setOutline(newOutline)

    expect(store.outline).toEqual(newOutline)
    expect(store.isValidated).toBe(false)
  })
})

describe('outline.store — validateOutline', () => {
  it('calls apiPut with serialized outline and sets isValidated', async () => {
    const store = useOutlineStore()
    store.outline = mockOutline

    await store.validateOutline('test-slug')

    expect(mockApiPut).toHaveBeenCalledWith('/articles/test-slug', {
      outline: JSON.stringify(mockOutline),
    })
    expect(store.isValidated).toBe(true)
    expect(store.isSaving).toBe(false)
  })

  it('sets error on apiPut failure', async () => {
    mockApiPut.mockRejectedValueOnce(new Error('Save failed'))

    const store = useOutlineStore()
    store.outline = mockOutline

    await store.validateOutline('test-slug')

    expect(store.error).toBe('Save failed')
    expect(store.isValidated).toBe(false)
    expect(store.isSaving).toBe(false)
  })

  it('resetOutline clears isValidated', () => {
    const store = useOutlineStore()
    store.isValidated = true
    store.outline = mockOutline

    store.resetOutline()

    expect(store.isValidated).toBe(false)
    expect(store.outline).toBeNull()
  })
})
