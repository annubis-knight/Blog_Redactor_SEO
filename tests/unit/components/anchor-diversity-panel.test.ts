/**
 * Tests anti-régression pour AnchorDiversityPanel — alertes SEO d'ancres répétées.
 *
 * Composant macro de la sidebar LinkingMatrixView. Surveille la concentration
 * des ancres : si la même phrase d'ancre est utilisée trop souvent vers les
 * mêmes cibles, Google peut suspecter une manipulation. Couvre :
 *   1. liste vide → message rassurant + pas de badge count
 *   2. alertes peuplées → 1 carte par alerte avec ancre + count + cibles
 *   3. compteur visible dans le titre quand alerts.length > 0
 *   4. ancre affichée entre guillemets typographiques
 *   5. count formaté "Nx"
 *   6. cibles concaténées avec ", "
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnchorDiversityPanel from '../../../src/components/linking/AnchorDiversityPanel.vue'
import type { AnchorDiversityAlert } from '../../../shared/types'

function makeAlert(over: Partial<AnchorDiversityAlert> = {}): AnchorDiversityAlert {
  return {
    anchorText: 'cliquez ici',
    count: 5,
    targets: ['Article A', 'Article B'],
    ...over,
  }
}

describe('AnchorDiversityPanel', () => {
  it('liste vide → message "Bonne diversité" + pas de badge count', () => {
    const wrapper = mount(AnchorDiversityPanel, { props: { alerts: [] } })
    expect(wrapper.find('.panel-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('Bonne diversité')
    // Pas de badge dans le titre quand 0 alertes
    expect(wrapper.find('.alert-count').exists()).toBe(false)
    expect(wrapper.find('.alert-list').exists()).toBe(false)
  })

  it('alertes peuplées → 1 carte par alerte', () => {
    const alerts = [
      makeAlert({ anchorText: 'cliquez ici' }),
      makeAlert({ anchorText: 'voir aussi' }),
      makeAlert({ anchorText: 'en savoir plus' }),
    ]
    const wrapper = mount(AnchorDiversityPanel, { props: { alerts } })
    expect(wrapper.findAll('.alert-item')).toHaveLength(3)
  })

  it('compteur visible dans le titre quand alerts.length > 0', () => {
    const wrapper = mount(AnchorDiversityPanel, {
      props: { alerts: [makeAlert(), makeAlert({ anchorText: 'autre' })] },
    })
    expect(wrapper.find('.alert-count').exists()).toBe(true)
    expect(wrapper.find('.alert-count').text()).toBe('2')
  })

  it('REGRESSION GUARD : ancre affichée entre guillemets typographiques « »', () => {
    // Si quelqu'un retire les guillemets, l'ancre se confond avec le texte
    // ambiant et perd sa lisibilité. Visuel critique.
    const wrapper = mount(AnchorDiversityPanel, {
      props: { alerts: [makeAlert({ anchorText: 'agence seo paris' })] },
    })
    const anchor = wrapper.find('.alert-anchor').text()
    expect(anchor).toContain('«')
    expect(anchor).toContain('»')
    expect(anchor).toContain('agence seo paris')
  })

  it('count formaté "Nx" dans le badge', () => {
    const wrapper = mount(AnchorDiversityPanel, {
      props: { alerts: [makeAlert({ count: 7 })] },
    })
    expect(wrapper.find('.alert-badge').text()).toBe('7x')
  })

  it('cibles concaténées avec ", "', () => {
    const wrapper = mount(AnchorDiversityPanel, {
      props: {
        alerts: [makeAlert({ targets: ['Article 1', 'Article 2', 'Article 3'] })],
      },
    })
    expect(wrapper.find('.alert-targets').text()).toContain('Article 1, Article 2, Article 3')
  })

  it('1 seule cible → affichée sans virgule', () => {
    const wrapper = mount(AnchorDiversityPanel, {
      props: { alerts: [makeAlert({ targets: ['Cible unique'] })] },
    })
    expect(wrapper.find('.alert-targets').text()).toContain('Cible unique')
    expect(wrapper.find('.alert-targets').text()).not.toContain(',')
  })

  it('REGRESSION GUARD : titre toujours présent même sans alerte', () => {
    // Le panel reste visible avec son header pour confirmer que la détection
    // a bien tourné (pas un état "rien chargé").
    const wrapper = mount(AnchorDiversityPanel, { props: { alerts: [] } })
    expect(wrapper.find('.panel-title').text()).toContain('Diversité des ancres')
  })

  it('alertes avec targets vides → cibles affichées vides (pas de crash)', () => {
    const wrapper = mount(AnchorDiversityPanel, {
      props: { alerts: [makeAlert({ targets: [] })] },
    })
    expect(wrapper.find('.alert-item').exists()).toBe(true)
    expect(wrapper.find('.alert-targets').text()).toBe('Cibles :')
  })
})
