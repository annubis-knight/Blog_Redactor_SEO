/**
 * « Générer avec Claude » propose un choix (U7, FR-CER-COCOON-PROGRESSIVE).
 *
 * Recette d'Arnaud du 2026-09-25 : le bouton unique dessinait la carte
 * entière du cocon, alors qu'il attendait une création pas à pas. Le menu
 * donne les deux chemins et dit lequel crée de vrais articles.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GenerateCocoonMenu from '@/components/production/brain/GenerateCocoonMenu.vue'

function mountMenu(props: Partial<{ isGenerating: boolean; canStartPillar: boolean; hasPillar: boolean }> = {}) {
  return mount(GenerateCocoonMenu, {
    props: { isGenerating: false, canStartPillar: true, hasPillar: false, ...props },
    attachTo: document.body,
  })
}

describe('GenerateCocoonMenu — le choix', () => {
  it('un bouton qui ouvre un menu à deux choix, fermé au départ', async () => {
    const wrapper = mountMenu()
    const bouton = wrapper.get('[data-testid="brain-generate-menu"]')
    expect(bouton.text()).toBe('Générer avec Claude ▾')
    expect(bouton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)

    await bouton.trigger('click')

    expect(bouton.attributes('aria-expanded')).toBe('true')
    const pilier = wrapper.get('[data-testid="brain-generate-pillar"]')
    const carte = wrapper.get('[data-testid="brain-generate-articles"]')
    expect(pilier.text()).toContain('Le pilier, puis un article à la fois')
    expect(pilier.text()).toContain('Crée de vrais articles, en commençant par le pilier (recommandé).')
    expect(carte.text()).toContain('La carte complète du cocon')
    expect(carte.text()).toContain('Un aperçu de tous les articles possibles : n’en crée aucun.')
    wrapper.unmount()
  })

  it('« La carte complète » émet map et referme le menu', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-testid="brain-generate-menu"]').trigger('click')
    await wrapper.get('[data-testid="brain-generate-articles"]').trigger('click')

    expect(wrapper.emitted('map')).toHaveLength(1)
    expect(wrapper.emitted('pillar')).toBeUndefined()
    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('« Le pilier… » émet pillar et referme le menu', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-testid="brain-generate-menu"]').trigger('click')
    await wrapper.get('[data-testid="brain-generate-pillar"]').trigger('click')

    expect(wrapper.emitted('pillar')).toHaveLength(1)
    expect(wrapper.emitted('map')).toBeUndefined()
    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('GenerateCocoonMenu — quand le pilier ne peut pas naître', () => {
  it('pilier existant : le choix est désactivé, et le menu dit où continuer', async () => {
    const wrapper = mountMenu({ canStartPillar: false, hasPillar: true })
    await wrapper.get('[data-testid="brain-generate-menu"]').trigger('click')
    const pilier = wrapper.get('[data-testid="brain-generate-pillar"]')

    expect(pilier.attributes('disabled')).toBeDefined()
    expect(pilier.text()).toContain('Le pilier existe déjà : chaque article suivant naît d’une section, dans « Construire le cocon ».')
    await pilier.trigger('click')
    expect(wrapper.emitted('pillar')).toBeUndefined()
    wrapper.unmount()
  })

  it('arbre pas encore prêt (chargement ou erreur) : le choix est désactivé, sans parler d’un pilier existant', async () => {
    const wrapper = mountMenu({ canStartPillar: false, hasPillar: false })
    await wrapper.get('[data-testid="brain-generate-menu"]').trigger('click')
    const pilier = wrapper.get('[data-testid="brain-generate-pillar"]')

    expect(pilier.attributes('disabled')).toBeDefined()
    expect(pilier.text()).toContain('L’arbre du cocon n’est pas encore prêt : voyez « Construire le cocon », plus haut.')
    expect(pilier.text()).not.toContain('existe déjà')
    wrapper.unmount()
  })
})

describe('GenerateCocoonMenu — fermeture et génération en cours', () => {
  it('Échap referme le menu', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-testid="brain-generate-menu"]').trigger('click')
    await wrapper.get('[data-testid="brain-generate-options"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="brain-generate-menu"]').attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('un clic à côté referme le menu', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-testid="brain-generate-menu"]').trigger('click')
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('pendant la génération de la carte : « Génération... », bouton désactivé', async () => {
    const wrapper = mountMenu({ isGenerating: true })
    const bouton = wrapper.get('[data-testid="brain-generate-menu"]')

    expect(bouton.text()).toBe('Génération...')
    expect(bouton.attributes('disabled')).toBeDefined()
    await bouton.trigger('click')
    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
