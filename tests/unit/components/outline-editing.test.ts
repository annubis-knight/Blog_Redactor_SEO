/**
 * FR-RED-OUTLINE — retoucher le sommaire : Échap annule, le H1 reste en tête.
 *
 * Recette du 2026-09-30 (RED-7) :
 *   - ✎ sur « Conclusion », « nimporte quoi xyz », Échap → le titre devenait
 *     « nimporte quoi xyz » : le champ retiré envoyait son `blur`, qui validait ;
 *   - un chapitre lâché sur la ligne du H1 passait au-dessus de lui.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OutlineNode from '@/components/outline/OutlineNode.vue'
import OutlineEditor from '@/components/outline/OutlineEditor.vue'
import type { Outline, OutlineSection } from '@shared/types/index.js'

const section = (id: string, level: 1 | 2 | 3, title = id): OutlineSection => ({ id, level, title, annotation: null, status: 'accepted' })

function mountNode() {
  return mount(OutlineNode, { props: { section: section('c', 2, 'Conclusion'), isDragging: false, isDragOver: false } })
}

describe('FR-RED-OUTLINE — renommer un titre (recette 2026-09-30, RED-7)', () => {
  it('Échap annule : le blur du champ qui disparaît n’enregistre rien', async () => {
    const wrapper = mountNode()
    await wrapper.find('button[title="Modifier le titre"]').trigger('click')
    const input = wrapper.find('input.edit-input')
    await input.setValue('nimporte quoi xyz')
    await input.trigger('keydown', { key: 'Escape' })
    // Le navigateur envoie « blur » au champ retiré du DOM : on le rejoue.
    await input.trigger('blur')
    expect(wrapper.emitted('update:section')).toBeUndefined()
    expect(wrapper.find('.section-title').text()).toBe('Conclusion')
  })

  it('Entrée garde le nouveau titre, une seule fois', async () => {
    const wrapper = mountNode()
    await wrapper.find('button[title="Modifier le titre"]').trigger('click')
    const input = wrapper.find('input.edit-input')
    await input.setValue('Conclusion (recette)')
    await input.trigger('keydown', { key: 'Enter' })
    await input.trigger('blur')
    expect(wrapper.emitted('update:section')).toEqual([[{ title: 'Conclusion (recette)' }]])
  })

  it('quitter le champ (clic ailleurs) garde le nouveau titre', async () => {
    const wrapper = mountNode()
    await wrapper.find('button[title="Modifier le titre"]').trigger('click')
    const input = wrapper.find('input.edit-input')
    await input.setValue('Pour conclure')
    await input.trigger('blur')
    expect(wrapper.emitted('update:section')).toEqual([[{ title: 'Pour conclure' }]])
  })
})

describe('FR-RED-OUTLINE — glisser un chapitre sur le H1 (recette 2026-09-30, RED-7)', () => {
  it('le chapitre se place sous le H1, qui reste en tête', async () => {
    const outline: Outline = { sections: [section('h1', 1), section('intro', 2), section('a', 2)] }
    const wrapper = mount(OutlineEditor, { props: { outline } })
    const nodes = wrapper.findAllComponents(OutlineNode)
    nodes[2]!.vm.$emit('dragstart', new Event('dragstart'))
    nodes[0]!.vm.$emit('drop', new Event('drop'))
    const emitted = wrapper.emitted('update:outline') as Array<[Outline]>
    expect(emitted[0]![0].sections.map(s => s.id)).toEqual(['h1', 'a', 'intro'])
  })
})
