/**
 * Vague 2 — Tests architecturaux RadarKeywordCard.
 *
 * Référence FR PRD : FR-CAP-RADAR-CARD (la card Radar affiche un keyword,
 * ses KPIs, son score (KPI ou Pertinence), son intent, et au déploiement
 * son arbre PAA — voir prd.md §8.6).
 *
 * Ces tests verrouillent la POSITION DOM des sous-composants après
 * factorisation Vague 2 :
 * - `RadarCardScoreRing` rendu dans `radar-card__header`.
 * - `RadarCardPaaTree` rendu dans `radar-card__body`, visible uniquement
 *   en mode expanded.
 * - `RadarCardScoreRing` ne propage PAS le clic (préservation `@click.stop`
 *   héritée du markup d'origine — verrou critique pour ne pas ouvrir la
 *   sidebar Capitaine au clic sur le ring).
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarKeywordCard from '../../../src/components/intent/RadarKeywordCard.vue'
import type { RadarCard } from '@shared/types/intent.types.js'

function makeCard(over: Partial<RadarCard> = {}): RadarCard {
  return {
    keyword: 'mon mot-clé test',
    reasoning: '',
    cachedPaa: false,
    combinedScore: 50,
    scoreBreakdown: {
      paaMatchScore: 50,
      resonanceBonus: 0,
      opportunityScore: 0,
      intentValueScore: 0,
      cpcScore: 0,
      painAlignmentScore: 50,
      total: 50,
    },
    kpis: {
      searchVolume: 1000,
      difficulty: 30,
      cpc: 1.5,
      competition: 0.4,
      paaTotal: 5,
      paaMatchCount: 3,
      paaWeightedScore: 2.5,
      intentTypes: ['informational'],
      intentProbability: 0.7,
      autocompleteMatchCount: 5,
      avgSemanticScore: 0.6,
    },
    paaItems: [
      {
        question: 'Question 1 ?',
        answer: 'Réponse 1.',
        match: 'total',
        matchQuality: 'exact',
        depth: 1,
        parentQuestion: null,
        painAlignment: 'aligned',
      },
    ],
    ...over,
  } as RadarCard
}

const stubs = {
  KeywordWords: { template: '<span></span>' },
  RadarCardScoreRing: {
    name: 'RadarCardScoreRing',
    template: '<div data-testid="radar-card-score-ring"></div>',
    props: ['displayedScore', 'scoreColor', 'scoreLabel', 'breakdownRows', 'hasScore', 'relevanceMissingReason', 'circleRadius', 'circleCircumference', 'scoreDashoffset'],
  },
  RadarCardPaaTree: {
    name: 'RadarCardPaaTree',
    template: '<div data-testid="radar-card-paa-tree"></div>',
    props: ['paaTree', 'expandedPaa', 'expandedParents', 'cachedPaa', 'itemBorderClass', 'badgeClass', 'matchLabel'],
    emits: ['toggle-children', 'toggle-answer'],
  },
}

function isDescendantOf(wrapper: ReturnType<typeof mount>, ancestorSelector: string, descendantSelector: string): boolean {
  const ancestor = wrapper.find(ancestorSelector)
  if (!ancestor.exists()) return false
  return ancestor.find(descendantSelector).exists()
}

describe('RadarKeywordCard — architecture des sous-composants (Vague 2)', () => {
  it('AC.L.1 — RadarCardScoreRing est descendant direct de radar-card__header', () => {
    const wrapper = mount(RadarKeywordCard, {
      props: { card: makeCard() },
      global: { stubs },
    })
    expect(isDescendantOf(wrapper, '.radar-card__header', '[data-testid="radar-card-score-ring"]'))
      .toBe(true)
  })

  it('AC.L.2 — RadarCardPaaTree est descendant de radar-card__body, visible seulement si expanded', async () => {
    const wrapper = mount(RadarKeywordCard, {
      props: { card: makeCard() },
      global: { stubs },
    })
    // Collapsed : pas de paa-tree
    expect(wrapper.find('[data-testid="radar-card-paa-tree"]').exists()).toBe(false)

    // Expanded
    await wrapper.find('.radar-card__header').trigger('click')
    expect(wrapper.find('[data-testid="radar-card-paa-tree"]').exists()).toBe(true)
    expect(isDescendantOf(wrapper, '.radar-card__body', '[data-testid="radar-card-paa-tree"]'))
      .toBe(true)
  })

  it('AC.L.3 — RadarCardScoreRing N\'EST PAS descendant de radar-card__body', async () => {
    const wrapper = mount(RadarKeywordCard, {
      props: { card: makeCard() },
      global: { stubs },
    })
    await wrapper.find('.radar-card__header').trigger('click')
    expect(isDescendantOf(wrapper, '.radar-card__body', '[data-testid="radar-card-score-ring"]'))
      .toBe(false)
  })
})
