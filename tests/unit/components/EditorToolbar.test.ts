import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EditorToolbar from '../../../src/components/editor/EditorToolbar.vue'

function createMockEditor(activeFormats: string[] = []) {
  const run = vi.fn()
  const chain = () => ({
    focus: () => ({
      toggleBold: () => ({ run }),
      toggleItalic: () => ({ run }),
      toggleHeading: () => ({ run }),
      toggleBulletList: () => ({ run }),
      toggleOrderedList: () => ({ run }),
      toggleBlockquote: () => ({ run }),
      setLink: () => ({ run }),
      unsetLink: () => ({ run }),
      undo: () => ({ run }),
      redo: () => ({ run }),
    }),
  })

  return {
    chain,
    isActive: (name: string) => activeFormats.includes(name),
    can: () => ({
      undo: () => true,
      redo: () => true,
    }),
  }
}

describe('EditorToolbar', () => {
  it('renders all toolbar buttons when editor provided', () => {
    const wrapper = mount(EditorToolbar, {
      props: { editor: createMockEditor() as any },
    })

    const buttons = wrapper.findAll('.toolbar-btn')
    // Bold, Italic, H2, H3, Bullet, Ordered, Blockquote, Link, Undo, Redo = 10
    expect(buttons.length).toBe(10)
  })

  it('marks active buttons with active class', () => {
    const wrapper = mount(EditorToolbar, {
      props: { editor: createMockEditor(['bold', 'italic']) as any },
    })

    const buttons = wrapper.findAll('.toolbar-btn')
    // First button is Bold, should have active class
    expect(buttons[0].classes()).toContain('active')
    // Second button is Italic, should have active class
    expect(buttons[1].classes()).toContain('active')
    // Third button is H2, should NOT have active class
    expect(buttons[2].classes()).not.toContain('active')
  })
})
