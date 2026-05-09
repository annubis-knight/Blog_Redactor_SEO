/**
 * Chantier 3 — E2-S1 : composant partagé TabBar (FR-LEX-MULTI-KEYWORD-TABS).
 *
 * Composant pur (pas de logique métier) — on cible :
 *   - Rendu N tabs → N boutons role="tab".
 *   - Bouton actif marqué aria-selected="true".
 *   - Clic émet update:activeId avec l'id cliqué.
 *   - disabled:true → click ne déclenche pas d'émit.
 *   - Réutilisable : pas d'import depuis @/components/moteur/* (test sera dans
 *     le test architectural E2-S3).
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TabBar from '@/components/shared/TabBar.vue'

const TABS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie', disabled: true },
]

describe('TabBar — chantier 3 E2-S1', () => {
  it('rend N tabs → N boutons role="tab"', () => {
    const wrapper = mount(TabBar, {
      props: { tabs: TABS, activeId: 'a' },
    })

    const tabButtons = wrapper.findAll('[role="tab"]')
    expect(tabButtons).toHaveLength(3)
    expect(tabButtons[0].text()).toBe('Alpha')
    expect(tabButtons[1].text()).toBe('Bravo')
    expect(tabButtons[2].text()).toBe('Charlie')
  })

  it('bouton actif a aria-selected="true", les autres "false"', () => {
    const wrapper = mount(TabBar, {
      props: { tabs: TABS, activeId: 'b' },
    })

    const tabButtons = wrapper.findAll('[role="tab"]')
    expect(tabButtons[0].attributes('aria-selected')).toBe('false')
    expect(tabButtons[1].attributes('aria-selected')).toBe('true')
    expect(tabButtons[2].attributes('aria-selected')).toBe('false')
  })

  it('clic sur tab → émet update:activeId avec l\'id cliqué', async () => {
    const wrapper = mount(TabBar, {
      props: { tabs: TABS, activeId: 'a' },
    })

    await wrapper.findAll('[role="tab"]')[1].trigger('click')

    const emitted = wrapper.emitted('update:activeId')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual(['b'])
  })

  it('disabled → bouton non cliquable, n\'émet pas', async () => {
    const wrapper = mount(TabBar, {
      props: { tabs: TABS, activeId: 'a' },
    })

    const charlieBtn = wrapper.findAll('[role="tab"]')[2]
    expect(charlieBtn.attributes('disabled')).toBeDefined()

    await charlieBtn.trigger('click')

    const emitted = wrapper.emitted('update:activeId')
    expect(emitted).toBeFalsy()
  })

  it('container a role="tablist"', () => {
    const wrapper = mount(TabBar, {
      props: { tabs: TABS, activeId: 'a' },
    })

    expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
  })
})
