import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ArticleEditor from '../../../src/components/editor/ArticleEditor.vue'

// Mock TipTap useEditor + EditorContent
// With 3 section editors, useEditor is called 3 times.
// We track all onUpdate callbacks and mock each editor independently.
const mockSetContent = vi.fn()
const mockDestroy = vi.fn()
const mockOn = vi.fn()
const mockChain = vi.fn().mockReturnValue({
  focus: vi.fn().mockReturnValue({
    toggleBold: vi.fn().mockReturnValue({ run: vi.fn() }),
  }),
})

function createMockEditor(defaultHTML: string) {
  let currentHTML = defaultHTML
  return {
    getHTML: vi.fn(() => currentHTML),
    _setHTML(html: string) { currentHTML = html },
    commands: { setContent: mockSetContent },
    destroy: mockDestroy,
    on: mockOn,
    chain: mockChain,
    isActive: vi.fn().mockReturnValue(false),
    isDestroyed: false,
  }
}

const capturedOnUpdates: Array<(args: { editor: ReturnType<typeof createMockEditor> }) => void> = []
const mockEditors: Array<ReturnType<typeof createMockEditor>> = []

vi.mock('@tiptap/vue-3', () => ({
  useEditor: vi.fn((options: any) => {
    // Determine which section based on call order: toc(0), intro(1), body(2), conclusion(3)
    const idx = mockEditors.length
    const mock = createMockEditor(options.content || '')
    mockEditors.push(mock)
    if (options.onUpdate) {
      capturedOnUpdates.push(options.onUpdate)
    }
    return ref(mock)
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

// Mock shared html-utils — pass-through for simplicity
vi.mock('@shared/html-utils', () => ({
  mergeConsecutiveElements: (html: string) => html,
  removeEmptyElements: (html: string) => html,
  splitArticleSections: (html: string) => ({
    intro: '',
    body: html,
    conclusion: '',
  }),
}))

// Mock CollapsableSection as a simple pass-through
vi.mock('../../../src/components/shared/CollapsableSection.vue', () => ({
  default: {
    name: 'CollapsableSection',
    props: ['title', 'defaultOpen'],
    template: '<div class="collapsable-mock"><slot /></div>',
  },
}))

describe('ArticleEditor', () => {
  beforeEach(() => {
    capturedOnUpdates.length = 0
    mockEditors.length = 0
  })

  it('renders editor content components (3 sections)', () => {
    const wrapper = mount(ArticleEditor, {
      props: { content: '<p>Hello</p>' },
    })

    expect(wrapper.find('.article-editor').exists()).toBe(true)
    expect(wrapper.findAll('.editor-content-mock').length).toBeGreaterThanOrEqual(1)
  })

  it('emits update:content on editor update with combined HTML', () => {
    const wrapper = mount(ArticleEditor, {
      props: { content: '<p>Hello</p>' },
    })

    // The body editor (index 1) should have the content since splitArticleSections mock
    // puts everything in body. Order: intro(0), body(1), conclusion(2)
    const bodyEditorIdx = 1
    const bodyEditor = mockEditors[bodyEditorIdx]!
    bodyEditor._setHTML('<p>Updated</p>')
    capturedOnUpdates[bodyEditorIdx]!({ editor: bodyEditor })

    expect(wrapper.emitted('update:content')).toBeTruthy()
    const emitted = wrapper.emitted('update:content')![0]![0] as string
    expect(emitted).toContain('<p>Updated</p>')
  })

  it('exposes editor instance via ref', () => {
    const wrapper = mount(ArticleEditor, {
      props: { content: '<p>Hello</p>' },
    })

    expect((wrapper.vm as any).editor).toBeDefined()
  })
})
