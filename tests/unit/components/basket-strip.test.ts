/**
 * Tests anti-régression pour BasketStrip — panier de keywords du Moteur.
 *
 * Couvre les comportements user-facing critiques :
 *   1. compteur affiche la taille du panier
 *   2. chaque keyword rend un chip avec son texte
 *   3. clic sur le ✕ d'un chip émet remove(keyword)
 *   4. clic sur "Vider" émet clear()
 *   5. validated → classe CSS supplémentaire (style verdict OK)
 *   6. tooltip (title) = reasoning si présent, sinon source
 *   7. panier vide → label "Panier (0)" affiché, bouton Vider toujours présent
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BasketStrip from '../../../src/components/moteur/BasketStrip.vue'
import type { BasketKeyword } from '../../../src/stores/article/moteur-basket.store'

function makeKw(keyword: string, over: Partial<BasketKeyword> = {}): BasketKeyword {
  return {
    keyword,
    source: 'discovery',
    addedAt: '2026-04-30T10:00:00.000Z',
    ...over,
  }
}

describe('BasketStrip', () => {
  it('affiche le compteur avec la taille du panier', () => {
    const wrapper = mount(BasketStrip, {
      props: { keywords: [makeKw('agence seo'), makeKw('seo paris')] },
    })
    expect(wrapper.text()).toContain('Panier (2)')
  })

  it('panier vide → "Panier (0)"', () => {
    const wrapper = mount(BasketStrip, { props: { keywords: [] } })
    expect(wrapper.text()).toContain('Panier (0)')
  })

  it('rend un chip par keyword avec son texte', () => {
    const wrapper = mount(BasketStrip, {
      props: { keywords: [makeKw('agence seo'), makeKw('expert local')] },
    })
    const chips = wrapper.findAll('.basket-chip')
    expect(chips).toHaveLength(2)
    expect(chips[0].text()).toContain('agence seo')
    expect(chips[1].text()).toContain('expert local')
  })

  it('clic sur le ✕ d\'un chip émet remove(keyword)', async () => {
    const wrapper = mount(BasketStrip, {
      props: { keywords: [makeKw('agence seo'), makeKw('expert local')] },
    })
    const removeButtons = wrapper.findAll('.basket-chip-remove')
    await removeButtons[1].trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')![0]).toEqual(['expert local'])
  })

  it('clic sur "Vider" émet clear()', async () => {
    const wrapper = mount(BasketStrip, {
      props: { keywords: [makeKw('agence seo')] },
    })
    await wrapper.find('.basket-clear').trigger('click')

    expect(wrapper.emitted('clear')).toBeTruthy()
    expect(wrapper.emitted('clear')![0]).toEqual([])
  })

  it('validated=true → classe basket-chip--validated appliquée', () => {
    const wrapper = mount(BasketStrip, {
      props: {
        keywords: [
          makeKw('non-validé'),
          makeKw('validé', { validated: true }),
        ],
      },
    })
    const chips = wrapper.findAll('.basket-chip')
    expect(chips[0].classes()).not.toContain('basket-chip--validated')
    expect(chips[1].classes()).toContain('basket-chip--validated')
  })

  it('tooltip = reasoning si présent', () => {
    const wrapper = mount(BasketStrip, {
      props: { keywords: [makeKw('agence seo', { reasoning: 'volume élevé' })] },
    })
    expect(wrapper.find('.basket-chip').attributes('title')).toBe('volume élevé')
  })

  it('tooltip = source si reasoning absent', () => {
    const wrapper = mount(BasketStrip, {
      props: { keywords: [makeKw('agence seo', { source: 'radar' })] },
    })
    expect(wrapper.find('.basket-chip').attributes('title')).toBe('radar')
  })

  it('le clic sur le ✕ ne propage PAS au parent (stop)', async () => {
    // Important : si le panier est cliquable globalement (futur), le ✕ ne doit
    // pas déclencher d'action parent. @click.stop garantit ça.
    const wrapper = mount(BasketStrip, {
      props: { keywords: [makeKw('agence seo')] },
      attachTo: document.body,
    })

    let parentClicked = false
    wrapper.element.addEventListener('click', () => { parentClicked = true })
    await wrapper.find('.basket-chip-remove').trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(parentClicked).toBe(false)
    wrapper.unmount()
  })
})
