import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorBubbleMenu from '../../../src/components/editor/EditorBubbleMenu.vue'

// Mock BubbleMenu from @tiptap/vue-3/menus
vi.mock('@tiptap/vue-3/menus', () => ({
  BubbleMenu: {
    name: 'BubbleMenu',
    props: ['editor', 'tippyOptions'],
    template: '<div class="bubble-menu-mock"><slot /></div>',
  },
}))

function createMockEditor(activeFormats: string[] = []) {
  const run = vi.fn()
  return {
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        toggleBold: vi.fn(() => ({ run })),
        toggleItalic: vi.fn(() => ({ run })),
        setLink: vi.fn(() => ({ run })),
        unsetLink: vi.fn(() => ({ run })),
      })),
    })),
    isActive: vi.fn((name: string) => activeFormats.includes(name)),
  }
}

describe('EditorBubbleMenu', () => {
  it('renders 4 bubble buttons (Bold, Italic, Link, Actions IA)', () => {
    const wrapper = mount(EditorBubbleMenu, {
      props: { editor: createMockEditor() as any },
    })

    const buttons = wrapper.findAll('.bubble-btn')
    expect(buttons.length).toBe(4)
  })

  it('emits open-actions when Actions IA button is clicked', async () => {
    const wrapper = mount(EditorBubbleMenu, {
      props: { editor: createMockEditor() as any },
    })

    const actionBtn = wrapper.findAll('.bubble-btn')[3]
    await actionBtn.trigger('click')

    expect(wrapper.emitted('open-actions')).toHaveLength(1)
  })

  it('marks active buttons with active class', () => {
    const wrapper = mount(EditorBubbleMenu, {
      props: { editor: createMockEditor(['bold', 'link']) as any },
    })

    const buttons = wrapper.findAll('.bubble-btn')
    expect(buttons[0].classes()).toContain('active')
    expect(buttons[1].classes()).not.toContain('active')
    expect(buttons[2].classes()).toContain('active')
  })
})
