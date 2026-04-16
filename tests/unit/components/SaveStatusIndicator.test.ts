import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '../../../src/stores/article/editor.store'
import SaveStatusIndicator from '../../../src/components/editor/SaveStatusIndicator.vue'

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
  apiPut: vi.fn(),
}))

describe('SaveStatusIndicator', () => {
  it('displays "Sauvegarde en cours..." when isSaving', () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.$patch({ isSaving: true })

    const wrapper = mount(SaveStatusIndicator)

    expect(wrapper.text()).toContain('Sauvegarde en cours...')
    expect(wrapper.find('.saving').exists()).toBe(true)
  })

  it('displays "Sauvegardé" with relative timestamp when not dirty and lastSavedAt exists', () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    // Set lastSavedAt to 2 seconds ago so relative time shows "à l'instant"
    store.$patch({ isDirty: false, lastSavedAt: new Date(Date.now() - 2000).toISOString() })

    const wrapper = mount(SaveStatusIndicator)

    expect(wrapper.text()).toContain('Sauvegardé')
    expect(wrapper.text()).toContain("à l'instant")
    expect(wrapper.find('.saved').exists()).toBe(true)
  })

  it('displays "Modifications non sauvegardées" when dirty', () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setContent('<p>Changed</p>')

    const wrapper = mount(SaveStatusIndicator)

    expect(wrapper.text()).toContain('Modifications non sauvegardées')
    expect(wrapper.find('.unsaved').exists()).toBe(true)
  })
})
