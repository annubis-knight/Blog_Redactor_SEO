/**
 * Vague 2 — Tests visuels (snapshot HTML) RadarKeywordCard.
 *
 * Référence FR PRD : FR-CAP-RADAR-CARD.
 *
 * Ces snapshots verrouillent la STRUCTURE HTML rendue. Ils complètent les
 * tests architecturaux (DOM-position) en captant les régressions CSS qui
 * ne cassent aucun isDescendantOf (ex: padding supprimé, ordre changé).
 *
 * RÈGLE DE RÉGÉNÉRATION : voir tech-spec V2 risque 2.1.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarKeywordCard from '../../../src/components/intent/RadarKeywordCard.vue'
import type { RadarCard } from '@shared/types/intent.types.js'

function makeCard(over: Partial<RadarCard> = {}): RadarCard {
  return {
    keyword: 'seo local pme',
    reasoning: 'Mot-clé pilier pour le cocon SEO local',
    cachedPaa: false,
    combinedScore: 72,
    scoreBreakdown: {
      paaMatchScore: 80,
      resonanceBonus: 60,
      opportunityScore: 70,
      intentValueScore: 50,
      cpcScore: 65,
      painAlignmentScore: 75,
      total: 72,
    },
    kpis: {
      searchVolume: 2900,
      difficulty: 35,
      cpc: 2.4,
      competition: 0.5,
      paaTotal: 8,
      paaMatchCount: 5,
      paaWeightedScore: 4.2,
      intentTypes: ['commercial', 'informational'],
      intentProbability: 0.85,
      autocompleteMatchCount: 7,
      avgSemanticScore: 0.78,
    },
    paaItems: [
      {
        question: 'Comment faire du SEO local pour PME ?',
        answer: 'Inscrire la PME sur Google Business Profile, optimiser les fiches, obtenir des avis.',
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

describe('RadarKeywordCard — snapshots HTML (Vague 2)', () => {
  it('renders collapsed state (default mode kpi)', () => {
    const wrapper = mount(RadarKeywordCard, {
      props: { card: makeCard(), articleLevel: 'intermediaire' },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders expanded state with PAA tree', async () => {
    const wrapper = mount(RadarKeywordCard, {
      props: { card: makeCard(), articleLevel: 'intermediaire' },
    })
    await wrapper.find('.radar-card__header').trigger('click')
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders mode "relevance" with score = 75', () => {
    const wrapper = mount(RadarKeywordCard, {
      props: {
        card: makeCard({
          relevanceScore: {
            total: 75,
            breakdown: {
              painKeyword: { normalized: 80, weight: 0.3 },
              paaPain: { normalized: 70, weight: 0.3 },
              acPain: { normalized: 60, weight: 0.2 },
              roots: { normalized: 90, weight: 0.1 },
              intentPain: { normalized: 80, weight: 0.1 },
            },
          },
        } as Partial<RadarCard>),
        displayMode: 'relevance',
        articleLevel: 'intermediaire',
        articlePainPoint: 'Manque de visibilité Google Maps',
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('renders mode "relevance" with displayedScore = null + reason "no-pain"', () => {
    const wrapper = mount(RadarKeywordCard, {
      props: {
        card: makeCard(),
        displayMode: 'relevance',
        articleLevel: 'intermediaire',
        articlePainPoint: '',
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
