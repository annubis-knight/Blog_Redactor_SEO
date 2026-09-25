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
    // Bold, Italic, H2, H3, Bullet, Ordered, Blockquote, Link, Image, Undo, Redo = 11
    expect(buttons.length).toBe(11)
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

// R20 — la passe images réserve une place « à fournir » que la publication
// refuse ; il faut pouvoir y mettre la vraie image depuis l'éditeur.
describe('EditorToolbar — image', () => {
  function imageEditor(selected: { src: string; alt: string } | null) {
    const calls: Array<[string, unknown]> = []
    const step = (name: string) => (arg?: unknown) => { calls.push([name, arg]); return { run: () => true } }
    const editor = {
      chain: () => ({ focus: () => ({ updateAttributes: (_type: string, attrs: unknown) => step('updateAttributes')(attrs), setImage: step('setImage') }) }),
      isActive: (name: string) => name === 'image' && selected !== null,
      getAttributes: () => selected ?? {},
      can: () => ({ undo: () => true, redo: () => true }),
    }
    return { editor, calls }
  }

  it('remplace l’image à fournir sélectionnée par l’adresse donnée', async () => {
    const { editor, calls } = imageEditor({ src: '/images/image-a-fournir.svg', alt: 'Un atelier' })
    const ask = vi.spyOn(window, 'prompt').mockReturnValueOnce('https://cdn.example.fr/atelier.jpg')
    const wrapper = mount(EditorToolbar, { props: { editor: editor as any } })
    await wrapper.get('[data-testid="toolbar-image"]').trigger('click')
    expect(ask.mock.calls[0]![1], 'la place réservée ne s’affiche pas comme adresse').toBe('')
    expect(calls).toEqual([['updateAttributes', { src: 'https://cdn.example.fr/atelier.jpg' }]])
    ask.mockRestore()
  })

  it('insère une image avec son texte alternatif ; refuse une adresse douteuse', async () => {
    const { editor, calls } = imageEditor(null)
    const ask = vi.spyOn(window, 'prompt').mockReturnValueOnce('/images/devanture.jpg').mockReturnValueOnce('La devanture de la boutique')
    const wrapper = mount(EditorToolbar, { props: { editor: editor as any } })
    await wrapper.get('[data-testid="toolbar-image"]').trigger('click')
    expect(calls).toEqual([['setImage', { src: '/images/devanture.jpg', alt: 'La devanture de la boutique' }]])
    ask.mockReturnValueOnce('javascript:alert(1)')
    await wrapper.get('[data-testid="toolbar-image"]').trigger('click')
    expect(calls).toHaveLength(1)
    ask.mockRestore()
  })
})
