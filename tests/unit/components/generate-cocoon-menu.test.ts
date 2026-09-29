/**
 * « Générer avec Claude » fait grandir la carte indicative (U7 révisé,
 * FR-CER-COCOON-PROGRESSIVE).
 *
 * Recette d'Arnaud du 2026-09-25 (constat R1) : le menu pose d'abord le pilier
 * seul, puis un article à la fois. Un article ne s'ajoute que si son parent
 * est déjà sur la carte. Rien n'est créé en base : c'est un aperçu.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GenerateCocoonMenu from '@/components/production/brain/GenerateCocoonMenu.vue'

type MenuProps = { isGenerating: boolean; hasPillar: boolean; hasIntermediate: boolean }

function mountMenu(props: Partial<MenuProps> = {}) {
  return mount(GenerateCocoonMenu, {
    props: { isGenerating: false, hasPillar: false, hasIntermediate: false, ...props },
    attachTo: document.body,
  })
}

async function ouvrir(wrapper: ReturnType<typeof mountMenu>): Promise<void> {
  await wrapper.get('[data-testid="brain-generate-menu"]').trigger('click')
}

describe('GenerateCocoonMenu — carte vide : on commence par le pilier', () => {
  it('un bouton qui ouvre le menu, fermé au départ', async () => {
    const wrapper = mountMenu()
    const bouton = wrapper.get('[data-testid="brain-generate-menu"]')
    expect(bouton.text()).toBe('Générer avec Claude ▾')
    expect(bouton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)

    await bouton.trigger('click')

    expect(bouton.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-testid="brain-generate-options"]').text()).toContain('Sur la carte seulement : aucun article n’est créé.')
    wrapper.unmount()
  })

  it('le pilier est proposé ; ni intermédiaire ni spécialisé, faute de parent', async () => {
    const wrapper = mountMenu()
    await ouvrir(wrapper)

    const pilier = wrapper.get('[data-testid="brain-generate-pillar"]')
    expect(pilier.attributes('disabled')).toBeUndefined()
    expect(pilier.text()).toContain('Le pilier')
    expect(pilier.text()).toContain('Claude pose le pilier seul sur la carte.')
    expect(wrapper.find('[data-testid="brain-generate-intermediate"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="brain-generate-specialized"]').exists()).toBe(false)

    const carte = wrapper.get('[data-testid="brain-generate-articles"]')
    expect(carte.text()).toContain('La carte complète du cocon')
    expect(carte.text()).toContain('Tous les articles d’un coup, à la place de la carte actuelle.')
    wrapper.unmount()
  })

  it('« Le pilier » émet add(pilier) et referme le menu', async () => {
    const wrapper = mountMenu()
    await ouvrir(wrapper)
    await wrapper.get('[data-testid="brain-generate-pillar"]').trigger('click')

    expect(wrapper.emitted('add')).toEqual([['pilier']])
    expect(wrapper.emitted('map')).toBeUndefined()
    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('« La carte complète » émet map et referme le menu', async () => {
    const wrapper = mountMenu()
    await ouvrir(wrapper)
    await wrapper.get('[data-testid="brain-generate-articles"]').trigger('click')

    expect(wrapper.emitted('map')).toHaveLength(1)
    expect(wrapper.emitted('add')).toBeUndefined()
    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('GenerateCocoonMenu — pilier posé : un intermédiaire à la fois', () => {
  it('« Le pilier » est grisé, avec sa raison, et n’émet rien', async () => {
    const wrapper = mountMenu({ hasPillar: true })
    await ouvrir(wrapper)
    const pilier = wrapper.get('[data-testid="brain-generate-pillar"]')

    expect(pilier.attributes('disabled')).toBeDefined()
    expect(pilier.text()).toContain('Déjà sur la carte : un seul pilier par cocon.')
    await pilier.trigger('click')
    expect(wrapper.emitted('add')).toBeUndefined()
    wrapper.unmount()
  })

  it('« 1 article intermédiaire » apparaît et émet add(intermediaire)', async () => {
    const wrapper = mountMenu({ hasPillar: true })
    await ouvrir(wrapper)
    const inter = wrapper.get('[data-testid="brain-generate-intermediate"]')

    expect(inter.text()).toContain('1 article intermédiaire')
    expect(inter.text()).toContain('Claude en ajoute un sous le pilier.')
    expect(wrapper.find('[data-testid="brain-generate-specialized"]').exists(), 'pas encore d’intermédiaire').toBe(false)
    await inter.trigger('click')

    expect(wrapper.emitted('add')).toEqual([['intermediaire']])
    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('GenerateCocoonMenu — intermédiaire posé : un spécialisé à la fois', () => {
  it('« 1 article spécialisé » apparaît et émet add(specifique)', async () => {
    const wrapper = mountMenu({ hasPillar: true, hasIntermediate: true })
    await ouvrir(wrapper)
    expect(wrapper.find('[data-testid="brain-generate-intermediate"]').exists(), 'on peut encore ajouter un intermédiaire').toBe(true)
    const spe = wrapper.get('[data-testid="brain-generate-specialized"]')

    expect(spe.text()).toContain('1 article spécialisé')
    expect(spe.text()).toContain('Claude en ajoute un sous l’intermédiaire qui en a le plus besoin.')
    await spe.trigger('click')

    expect(wrapper.emitted('add')).toEqual([['specifique']])
    wrapper.unmount()
  })

  it('un intermédiaire sans pilier (carte incomplète) : le spécialisé reste possible, pas l’intermédiaire', async () => {
    const wrapper = mountMenu({ hasPillar: false, hasIntermediate: true })
    await ouvrir(wrapper)

    expect(wrapper.find('[data-testid="brain-generate-intermediate"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="brain-generate-specialized"]').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('GenerateCocoonMenu — fermeture et génération en cours', () => {
  it('Échap referme le menu', async () => {
    const wrapper = mountMenu()
    await ouvrir(wrapper)
    await wrapper.get('[data-testid="brain-generate-options"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="brain-generate-menu"]').attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('un clic à côté referme le menu', async () => {
    const wrapper = mountMenu()
    await ouvrir(wrapper)
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('pendant une génération : « Génération... », bouton désactivé', async () => {
    const wrapper = mountMenu({ isGenerating: true })
    const bouton = wrapper.get('[data-testid="brain-generate-menu"]')

    expect(bouton.text()).toBe('Génération...')
    expect(bouton.attributes('disabled')).toBeDefined()
    await bouton.trigger('click')
    expect(wrapper.find('[data-testid="brain-generate-options"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
