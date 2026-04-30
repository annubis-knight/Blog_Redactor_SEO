/**
 * Tests anti-régression pour KeywordAssistPanel — suggestions du basket Moteur.
 *
 * Composant partagé entre Capitaine / Lieutenants / Lexique. Couvre :
 *   1. titre + libellé bouton dépendent du context (capitaine/lieutenants/lexique)
 *   2. liste basket → suggestions affichées (limite par maxItems)
 *   3. excludeKeywords filtre les keywords déjà utilisés (case-insensitive)
 *   4. clic sur action → emit add(keyword)
 *   5. clic sur ✕ masque le panel
 *   6. panel masqué quand pas de suggestions
 *   7. panel masqué après hide() même si suggestions nouvelles
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import KeywordAssistPanel from '../../../src/components/moteur/KeywordAssistPanel.vue'
import { useMoteurBasketStore } from '../../../src/stores/article/moteur-basket.store'

function fillBasket(keywords: string[]) {
  const store = useMoteurBasketStore()
  store.keywords = keywords.map(kw => ({
    keyword: kw,
    source: 'discovery' as const,
    addedAt: '2026-04-30T00:00:00.000Z',
  }))
}

describe('KeywordAssistPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('REGRESSION GUARD : titre + libellé bouton selon context', () => {
    fillBasket(['agence seo'])
    const w1 = mount(KeywordAssistPanel, { props: { context: 'capitaine' } })
    expect(w1.find('.keyword-assist-panel__title').text()).toContain('Capitaine')
    expect(w1.find('.keyword-assist-panel__action').text()).toBe('Tester')

    const w2 = mount(KeywordAssistPanel, { props: { context: 'lieutenants' } })
    expect(w2.find('.keyword-assist-panel__title').text()).toContain('Lieutenants')
    expect(w2.find('.keyword-assist-panel__action').text()).toBe('Ajouter')

    const w3 = mount(KeywordAssistPanel, { props: { context: 'lexique' } })
    expect(w3.find('.keyword-assist-panel__title').text()).toContain('Lexique')
    expect(w3.find('.keyword-assist-panel__action').text()).toBe('Ajouter')
  })

  it('basket vide → panel masqué', () => {
    fillBasket([])
    const wrapper = mount(KeywordAssistPanel, { props: { context: 'capitaine' } })
    expect(wrapper.find('[data-testid="keyword-assist-panel"]').exists()).toBe(false)
  })

  it('basket peuplé → suggestions rendues', () => {
    fillBasket(['agence seo', 'consultant local', 'expert paris'])
    const wrapper = mount(KeywordAssistPanel, { props: { context: 'capitaine' } })
    expect(wrapper.findAll('.keyword-assist-panel__item')).toHaveLength(3)
    expect(wrapper.text()).toContain('agence seo')
    expect(wrapper.text()).toContain('consultant local')
  })

  it('REGRESSION GUARD : maxItems limite le nombre de suggestions', () => {
    fillBasket(Array.from({ length: 20 }, (_, i) => `kw-${i}`))
    const wrapper = mount(KeywordAssistPanel, { props: { context: 'capitaine', maxItems: 5 } })
    expect(wrapper.findAll('.keyword-assist-panel__item')).toHaveLength(5)
  })

  it('excludeKeywords filtre les keywords (case-insensitive)', () => {
    fillBasket(['Agence SEO', 'consultant Paris', 'expert local'])
    const wrapper = mount(KeywordAssistPanel, {
      props: {
        context: 'capitaine',
        excludeKeywords: ['agence seo', 'EXPERT LOCAL'], // varying case
      },
    })
    const items = wrapper.findAll('.keyword-assist-panel__item')
    expect(items).toHaveLength(1) // seul "consultant Paris" reste
    expect(items[0].text()).toContain('consultant Paris')
  })

  it('clic action → emit add(keyword)', async () => {
    fillBasket(['agence seo', 'consultant'])
    const wrapper = mount(KeywordAssistPanel, { props: { context: 'capitaine' } })
    const actions = wrapper.findAll('.keyword-assist-panel__action')
    await actions[1].trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
    expect(wrapper.emitted('add')![0]).toEqual(['consultant'])
  })

  it('clic sur ✕ → panel masqué', async () => {
    fillBasket(['agence seo'])
    const wrapper = mount(KeywordAssistPanel, { props: { context: 'capitaine' } })
    expect(wrapper.find('[data-testid="keyword-assist-panel"]').exists()).toBe(true)

    await wrapper.find('.keyword-assist-panel__hide').trigger('click')

    expect(wrapper.find('[data-testid="keyword-assist-panel"]').exists()).toBe(false)
  })

  it('REGRESSION GUARD : hide() persistant — re-ajout dans le basket ne ré-affiche pas le panel', async () => {
    fillBasket(['agence seo'])
    const wrapper = mount(KeywordAssistPanel, { props: { context: 'capitaine' } })
    await wrapper.find('.keyword-assist-panel__hide').trigger('click')

    // Ajout d'un nouveau keyword au basket
    const store = useMoteurBasketStore()
    store.keywords = [...store.keywords, {
      keyword: 'nouveau',
      source: 'manual',
      addedAt: '2026-04-30T00:00:00.000Z',
    }]
    await wrapper.vm.$nextTick()

    // Le panel reste masqué (état isHidden local)
    expect(wrapper.find('[data-testid="keyword-assist-panel"]').exists()).toBe(false)
  })

  it('tous les keywords excluded → panel masqué (suggestions vides)', () => {
    fillBasket(['a', 'b', 'c'])
    const wrapper = mount(KeywordAssistPanel, {
      props: { context: 'capitaine', excludeKeywords: ['a', 'b', 'c'] },
    })
    expect(wrapper.find('[data-testid="keyword-assist-panel"]').exists()).toBe(false)
  })
})
