/**
 * FR-RED-CONTEXTUAL-ACTIONS — le panneau « Blocs » montre chaque bloc avec
 * une icône qui lui correspond.
 *
 * Recette du 2026-09-30 (01-T12, module 07 point 6) : « Titre H2 » portait
 * l'icône « H1 » — un « H » suivi du tracé d'un « 1 » (`l2-2v12`).
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BlocksPanel from '@/components/panels/BlocksPanel.vue'

/** Tracé de l'icône du bloc dont le libellé est donné. */
function iconOf(label: string): string {
  const wrapper = mount(BlocksPanel)
  const item = wrapper.findAll('.block-item').find(li => li.find('.block-label').text() === label)
  expect(item, `bloc « ${label} » absent`).toBeDefined()
  return item!.find('.block-icon path').attributes('d') ?? ''
}

/** Le « H » commun aux titres : deux jambages et la barre. */
const H_GLYPH = 'M4 6v12M4 12h10M14 6v12'

describe('FR-RED-CONTEXTUAL-ACTIONS — icônes du panneau « Blocs » (recette 2026-09-30)', () => {
  it('« Titre H2 » : un H, puis un 2 — pas le 1 de « H1 »', () => {
    const h2 = iconOf('Titre H2')
    expect(h2.startsWith(H_GLYPH)).toBe(true)
    expect(h2).not.toContain('l2-2v12')
    // Le pied du 2 : un trait horizontal qui clôt le tracé.
    expect(h2).toMatch(/h5$/)
  })

  it('« Titre H2 » et « Titre H3 » ont chacun leur chiffre', () => {
    expect(iconOf('Titre H2')).not.toBe(iconOf('Titre H3'))
  })
})
