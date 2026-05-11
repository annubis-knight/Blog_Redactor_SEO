/**
 * Tests pour KeywordAssistPanel — refondé DB-first (2026-05-11, chantier
 * radar-dbfirst-refactor, FR-MOT-BASKET-DEPRECATED).
 *
 * Le composant reçoit désormais la liste de keywords à proposer en prop
 * (lecture DB faite par le parent via useRadarExplorationStore). Plus de
 * dépendance au store basket déprécié.
 *
 * Couvre :
 *   1. titre + libellé bouton dépendent du context (capitaine/lieutenants/lexique)
 *   2. prop keywords → suggestions affichées (limite par maxItems)
 *   3. excludeKeywords filtre les keywords déjà utilisés (case-insensitive)
 *   4. clic sur action → emit add(keyword)
 *   5. clic sur ✕ masque le panel
 *   6. panel masqué quand pas de suggestions
 *   7. hide() persistant
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KeywordAssistPanel from '../../../src/components/moteur/KeywordAssistPanel.vue'

describe('KeywordAssistPanel', () => {
  it('REGRESSION GUARD : titre + libellé bouton selon context', () => {
    const w1 = mount(KeywordAssistPanel, { props: { context: 'capitaine', keywords: ['agence seo'] } })
    expect(w1.find('.keyword-assist-panel__title').text()).toContain('Capitaine')
    expect(w1.find('.keyword-assist-panel__action').text()).toBe('Tester')

    const w2 = mount(KeywordAssistPanel, { props: { context: 'lieutenants', keywords: ['agence seo'] } })
    expect(w2.find('.keyword-assist-panel__title').text()).toContain('Lieutenants')
    expect(w2.find('.keyword-assist-panel__action').text()).toBe('Ajouter')

    const w3 = mount(KeywordAssistPanel, { props: { context: 'lexique', keywords: ['agence seo'] } })
    expect(w3.find('.keyword-assist-panel__title').text()).toContain('Lexique')
    expect(w3.find('.keyword-assist-panel__action').text()).toBe('Ajouter')
  })

  it('prop keywords vide → panel masqué', () => {
    const wrapper = mount(KeywordAssistPanel, { props: { context: 'capitaine', keywords: [] } })
    expect(wrapper.find('[data-testid="keyword-assist-panel"]').exists()).toBe(false)
  })

  it('prop keywords peuplée → suggestions rendues', () => {
    const wrapper = mount(KeywordAssistPanel, {
      props: { context: 'capitaine', keywords: ['agence seo', 'consultant local', 'expert paris'] },
    })
    expect(wrapper.findAll('.keyword-assist-panel__item')).toHaveLength(3)
    expect(wrapper.text()).toContain('agence seo')
    expect(wrapper.text()).toContain('consultant local')
  })

  it('REGRESSION GUARD : maxItems limite le nombre de suggestions', () => {
    const wrapper = mount(KeywordAssistPanel, {
      props: {
        context: 'capitaine',
        keywords: Array.from({ length: 20 }, (_, i) => `kw-${i}`),
        maxItems: 5,
      },
    })
    expect(wrapper.findAll('.keyword-assist-panel__item')).toHaveLength(5)
  })

  it('excludeKeywords filtre les keywords (case-insensitive)', () => {
    const wrapper = mount(KeywordAssistPanel, {
      props: {
        context: 'capitaine',
        keywords: ['Agence SEO', 'consultant Paris', 'expert local'],
        excludeKeywords: ['agence seo', 'EXPERT LOCAL'],
      },
    })
    const items = wrapper.findAll('.keyword-assist-panel__item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('consultant Paris')
  })

  it('clic action → emit add(keyword)', async () => {
    const wrapper = mount(KeywordAssistPanel, {
      props: { context: 'capitaine', keywords: ['agence seo', 'consultant'] },
    })
    const actions = wrapper.findAll('.keyword-assist-panel__action')
    await actions[1].trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
    expect(wrapper.emitted('add')![0]).toEqual(['consultant'])
  })

  it('clic sur ✕ → panel masqué', async () => {
    const wrapper = mount(KeywordAssistPanel, {
      props: { context: 'capitaine', keywords: ['agence seo'] },
    })
    expect(wrapper.find('[data-testid="keyword-assist-panel"]').exists()).toBe(true)
    await wrapper.find('.keyword-assist-panel__hide').trigger('click')
    expect(wrapper.find('[data-testid="keyword-assist-panel"]').exists()).toBe(false)
  })

  it('REGRESSION GUARD : hide() persistant — nouvelle prop keywords ne ré-affiche pas', async () => {
    const wrapper = mount(KeywordAssistPanel, {
      props: { context: 'capitaine', keywords: ['agence seo'] },
    })
    await wrapper.find('.keyword-assist-panel__hide').trigger('click')

    await wrapper.setProps({ context: 'capitaine', keywords: ['agence seo', 'nouveau'] })
    expect(wrapper.find('[data-testid="keyword-assist-panel"]').exists()).toBe(false)
  })

  it('tous les keywords exclus → panel masqué (suggestions vides)', () => {
    const wrapper = mount(KeywordAssistPanel, {
      props: { context: 'capitaine', keywords: ['a', 'b', 'c'], excludeKeywords: ['a', 'b', 'c'] },
    })
    expect(wrapper.find('[data-testid="keyword-assist-panel"]').exists()).toBe(false)
  })
})
