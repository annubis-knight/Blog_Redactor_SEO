/**
 * Tests anti-régression pour OrphanDetector — détection articles orphelins.
 *
 * Composant SEO critique : il liste les articles qui n'ont aucun lien entrant
 * (typiquement à corriger pour le maillage interne). Couvre :
 *   1. compteur affiché dans le titre
 *   2. liste vide → message rassurant "Tous les articles ont au moins un lien"
 *   3. liste peuplée → un RouterLink par orphelin avec href correct
 *   4. classe type (Pilier/Intermédiaire/Spécialisé) appliquée sur le badge
 *   5. nom du cocoon affiché en méta
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OrphanDetector from '../../../src/components/linking/OrphanDetector.vue'
import type { OrphanArticle } from '../../../shared/types'

// Stub minimal pour <RouterLink> (pas besoin du vrai router pour ces tests)
const RouterLinkStub = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a class="stub-router-link" :href="typeof to === \'string\' ? to : \'\'"><slot /></a>',
}

function makeOrphan(id: number, type: 'pilier' | 'Intermédiaire' | 'Spécialisé', over: Partial<OrphanArticle> = {}): OrphanArticle {
  return {
    id,
    slug: `orphan-${id}`,
    title: `Orphelin ${id}`,
    type,
    cocoonName: 'Mon Cocon',
    ...over,
  } as OrphanArticle
}

describe('OrphanDetector', () => {
  it('compteur affiché dans le titre', () => {
    const wrapper = mount(OrphanDetector, {
      props: { orphans: [makeOrphan(1, 'pilier'), makeOrphan(2, 'intermediaire')] },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(wrapper.find('.orphan-count').text()).toBe('2')
  })

  it('liste vide → message rassurant + compteur 0', () => {
    const wrapper = mount(OrphanDetector, {
      props: { orphans: [] },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(wrapper.find('.orphan-count').text()).toBe('0')
    expect(wrapper.find('.orphan-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('Aucun article orphelin')
    expect(wrapper.find('.orphan-list').exists()).toBe(false)
  })

  it('liste peuplée → un RouterLink par orphelin', () => {
    const wrapper = mount(OrphanDetector, {
      props: {
        orphans: [
          makeOrphan(1, 'pilier'),
          makeOrphan(2, 'intermediaire'),
          makeOrphan(3, 'specifique'),
        ],
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    const links = wrapper.findAll('.stub-router-link')
    expect(links).toHaveLength(3)
  })

  it('chaque RouterLink pointe vers /article/:id/editor', () => {
    const wrapper = mount(OrphanDetector, {
      props: { orphans: [makeOrphan(42, 'pilier'), makeOrphan(99, 'specifique')] },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    const links = wrapper.findAll('.stub-router-link')
    expect(links[0].attributes('href')).toBe('/article/42/editor')
    expect(links[1].attributes('href')).toBe('/article/99/editor')
  })

  it('titre + cocoonName affichés', () => {
    const wrapper = mount(OrphanDetector, {
      props: {
        orphans: [makeOrphan(1, 'Pilier', { title: 'Mon article perdu', cocoonName: 'SEO Local' })],
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(wrapper.text()).toContain('Mon article perdu')
    expect(wrapper.text()).toContain('SEO Local')
  })

  it('type badge avec la classe correspondante', () => {
    const wrapper = mount(OrphanDetector, {
      props: {
        orphans: [
          makeOrphan(1, 'pilier'),
          makeOrphan(2, 'intermediaire'),
          makeOrphan(3, 'specifique'),
        ],
      },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    const types = wrapper.findAll('.orphan-type')
    expect(types[0].classes()).toContain('pilier')
    expect(types[1].classes()).toContain('intermediaire')
    expect(types[2].classes()).toContain('specifique')
    expect(types[0].text()).toBe('pilier')
  })

  it('REGRESSION GUARD : l\'élément racine reste visible même sans orphelins', () => {
    // Le titre + le compteur 0 doivent rester visibles pour que l'utilisateur
    // sache que la détection a tourné (pas un état "rien chargé").
    const wrapper = mount(OrphanDetector, {
      props: { orphans: [] },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(wrapper.find('.orphan-detector').exists()).toBe(true)
    expect(wrapper.find('.orphan-title').text()).toContain('Articles orphelins')
  })
})
