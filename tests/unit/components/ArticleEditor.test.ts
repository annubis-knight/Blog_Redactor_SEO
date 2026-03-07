import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ArticleEditor from '../../../src/components/editor/ArticleEditor.vue'

// Mock TipTap useEditor + EditorContent
const mockGetHTML = vi.fn().mockReturnValue('<p>Hello</p>')
const mockSetContent = vi.fn()
const mockDestroy = vi.fn()
const mockOn = vi.fn()
const mockChain = vi.fn().mockReturnValue({
  focus: vi.fn().mockReturnValue({
    toggleBold: vi.fn().mockReturnValue({ run: vi.fn() }),
  }),
})

const mockEditorInstance = {
  getHTML: mockGetHTML,
  commands: { setContent: mockSetContent },
  destroy: mockDestroy,
  on: mockOn,
  chain: mockChain,
  isActive: vi.fn().mockReturnValue(false),
  isDestroyed: false,
}

let capturedOnUpdate: (args: { editor: typeof mockEditorInstance }) => void

vi.mock('@tiptap/vue-3', () => ({
  useEditor: vi.fn((options: any) => {
    if (options.onUpdate) {
      capturedOnUpdate = options.onUpdate
    }
    return ref(mockEditorInstance)
  }),
  EditorContent: {
    name: 'EditorContent',
    props: ['editor'],
    template: '<div class="editor-content-mock" />',
  },
}))

vi.mock('@tiptap/starter-kit', () => ({ default: {} }))
vi.mock('@tiptap/extension-link', () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}))
vi.mock('@tiptap/extension-placeholder', () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}))
vi.mock('../../../src/components/editor/tiptap/extensions/content-valeur', () => ({ ContentValeur: {} }))
vi.mock('../../../src/components/editor/tiptap/extensions/content-reminder', () => ({ ContentReminder: {} }))
vi.mock('../../../src/components/editor/tiptap/extensions/answer-capsule', () => ({ AnswerCapsule: {} }))
vi.mock('../../../src/components/editor/tiptap/extensions/internal-link', () => ({ InternalLink: {} }))

describe('ArticleEditor', () => {
  it('renders editor content component', () => {
    const wrapper = mount(ArticleEditor, {
      props: { content: '<p>Hello</p>' },
    })

    expect(wrapper.find('.article-editor').exists()).toBe(true)
    expect(wrapper.find('.editor-content-mock').exists()).toBe(true)
  })

  it('emits update:content on editor update', () => {
    const wrapper = mount(ArticleEditor, {
      props: { content: '<p>Hello</p>' },
    })

    mockGetHTML.mockReturnValueOnce('<p>Updated</p>')
    capturedOnUpdate({ editor: mockEditorInstance })

    expect(wrapper.emitted('update:content')).toBeTruthy()
    expect(wrapper.emitted('update:content')![0]).toEqual(['<p>Updated</p>'])
  })

  it('exposes editor instance via ref', () => {
    const wrapper = mount(ArticleEditor, {
      props: { content: '<p>Hello</p>' },
    })

    expect((wrapper.vm as any).editor).toBeDefined()
  })
})
