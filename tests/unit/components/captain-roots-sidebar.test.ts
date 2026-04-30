/**
 * Tests anti-régression pour CaptainRootsSidebar — sidebar racines longue-traîne.
 *
 * Composant qui liste les variantes racines d'un Capitaine 3+ mots et expose
 * la moyenne des scores pertinence. Couvre :
 *   1. mode carousel : N variantes rendues + clic émet 'select(variant)'
 *   2. activeKeyword → highlight visuel
 *   3. moyenne calculée correctement (somme / N)
 *   4. couleur moyenne : ≥65 success / ≥40 warning / sinon error
 *   5. tooltip score+verdict sur chaque variant
 *   6. mode manuel singleRoot : une seule racine en lecture seule
 *   7. ni variants ni singleRoot → header seul (pas de crash)
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CaptainRootsSidebar from '../../../src/components/moteur/CaptainRootsSidebar.vue'
import type { KeywordRootVariant, RadarCard } from '../../../shared/types/intent.types'
import type { ValidateResponse } from '../../../shared/types'

const ScoreRingStub = {
  name: 'ScoreRing',
  props: ['value', 'size', 'strokeWidth', 'title'],
  template: '<span class="stub-ring" :data-value="value" :data-title="title || \'\'">{{ value }}</span>',
}

function makeCard(score: number, keyword = 'kw'): RadarCard {
  return {
    keyword,
    reasoning: '',
    paaItems: [],
    combinedScore: score,
    scoreBreakdown: {
      paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0,
      intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: score,
    },
    cachedPaa: false,
    kpis: {
      searchVolume: 0, difficulty: 0, cpc: 0, competition: 0,
      intentTypes: [], intentProbability: null,
      autocompleteMatchCount: 0, paaMatchCount: 0,
      paaWeightedScore: 0, paaTotal: 0, avgSemanticScore: null,
    },
  }
}

function makeValidation(verdict = 'GO', greenCount = 5): ValidateResponse {
  return {
    keyword: 'x',
    articleLevel: 'pilier',
    kpis: [],
    verdict: { level: verdict as never, greenCount, totalKpis: 6, autoNoGo: false },
    fromCache: false,
    cachedAt: null,
  }
}

function makeVariant(keyword: string, score: number, verdict = 'GO'): KeywordRootVariant {
  return {
    keyword,
    card: makeCard(score, keyword),
    validation: makeValidation(verdict),
  }
}

const STUBS = { ScoreRing: ScoreRingStub }

describe('CaptainRootsSidebar', () => {
  it('mode carousel : 1 bouton par variant + ScoreRing avec son score', () => {
    const variants = [
      makeVariant('agence seo', 80),
      makeVariant('agence', 65),
      makeVariant('seo paris', 50),
    ]
    const wrapper = mount(CaptainRootsSidebar, {
      props: { variants },
      global: { stubs: STUBS },
    })

    const items = wrapper.findAll('[data-testid="root-sidebar-item"]')
    expect(items).toHaveLength(3)
    expect(items[0].text()).toContain('agence seo')
    const rings = wrapper.findAll('.stub-ring')
    expect(rings[0].attributes('data-value')).toBe('80')
    expect(rings[1].attributes('data-value')).toBe('65')
    expect(rings[2].attributes('data-value')).toBe('50')
  })

  it('clic sur une racine → emit select avec le variant complet', async () => {
    const v1 = makeVariant('agence seo', 80)
    const v2 = makeVariant('agence', 65)
    const wrapper = mount(CaptainRootsSidebar, {
      props: { variants: [v1, v2] },
      global: { stubs: STUBS },
    })

    await wrapper.findAll('[data-testid="root-sidebar-item"]')[1].trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0][0]).toEqual(v2)
  })

  it('activeKeyword → classe --active sur la bonne racine uniquement', () => {
    const wrapper = mount(CaptainRootsSidebar, {
      props: {
        variants: [
          makeVariant('agence seo', 80),
          makeVariant('agence', 65),
          makeVariant('seo', 50),
        ],
        activeKeyword: 'agence',
      },
      global: { stubs: STUBS },
    })
    const items = wrapper.findAll('[data-testid="root-sidebar-item"]')
    expect(items[0].classes()).not.toContain('roots-sidebar__item--active')
    expect(items[1].classes()).toContain('roots-sidebar__item--active')
    expect(items[2].classes()).not.toContain('roots-sidebar__item--active')
  })

  it('REGRESSION GUARD : moyenne des scores pertinence calculée correctement', () => {
    // (80 + 60 + 40) / 3 = 60
    const wrapper = mount(CaptainRootsSidebar, {
      props: {
        variants: [
          makeVariant('a', 80),
          makeVariant('b', 60),
          makeVariant('c', 40),
        ],
      },
      global: { stubs: STUBS },
    })
    const avg = wrapper.find('[data-testid="roots-sidebar-average"]')
    expect(avg.exists()).toBe(true)
    expect(avg.text()).toContain('60')
  })

  it('couleur moyenne ≥ 65 → success', () => {
    const wrapper = mount(CaptainRootsSidebar, {
      props: { variants: [makeVariant('a', 70)] },
      global: { stubs: STUBS },
    })
    const value = wrapper.find('.roots-sidebar__average-value')
    expect(value.attributes('style')).toContain('22c55e')
  })

  it('couleur moyenne 40-64 → warning', () => {
    const wrapper = mount(CaptainRootsSidebar, {
      props: { variants: [makeVariant('a', 50)] },
      global: { stubs: STUBS },
    })
    const value = wrapper.find('.roots-sidebar__average-value')
    expect(value.attributes('style')).toContain('f59e0b')
  })

  it('couleur moyenne < 40 → error', () => {
    const wrapper = mount(CaptainRootsSidebar, {
      props: { variants: [makeVariant('a', 30)] },
      global: { stubs: STUBS },
    })
    const value = wrapper.find('.roots-sidebar__average-value')
    expect(value.attributes('style')).toContain('ef4444')
  })

  it('tooltip variant : score + verdict', () => {
    const wrapper = mount(CaptainRootsSidebar, {
      props: { variants: [makeVariant('agence', 75, 'ORANGE')] },
      global: { stubs: STUBS },
    })
    const item = wrapper.find('[data-testid="root-sidebar-item"]')
    expect(item.attributes('title')).toContain('75/100')
    expect(item.attributes('title')).toContain('ORANGE')
  })

  it('mode manuel : singleRoot rendu en lecture seule (pas de moyenne)', () => {
    const wrapper = mount(CaptainRootsSidebar, {
      props: { singleRoot: { ...makeValidation('GO', 5), keyword: 'racine seule' } },
      global: { stubs: STUBS },
    })
    expect(wrapper.find('[data-testid="root-sidebar-single"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('racine seule')
    // Pas de moyenne en mode manuel
    expect(wrapper.find('[data-testid="roots-sidebar-average"]').exists()).toBe(false)
  })

  it('REGRESSION GUARD : aucune variante + pas de singleRoot → header seul, pas de crash', () => {
    const wrapper = mount(CaptainRootsSidebar, {
      props: {},
      global: { stubs: STUBS },
    })
    expect(wrapper.find('[data-testid="captain-roots-sidebar"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="root-sidebar-item"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="root-sidebar-single"]').exists()).toBe(false)
  })
})
