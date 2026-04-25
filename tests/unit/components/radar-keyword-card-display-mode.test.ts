import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarKeywordCard from '../../../src/components/intent/RadarKeywordCard.vue'
import type { RadarCard } from '../../../shared/types/intent.types'

function makeCard(over: Partial<RadarCard> = {}): RadarCard {
  return {
    keyword: 'outil seo',
    reasoning: '',
    kpis: {
      searchVolume: 500,
      difficulty: 25,
      cpc: 1.5,
      competition: 0.5,
      intentTypes: ['commercial'],
      intentProbability: 0.9,
      autocompleteMatchCount: 4,
      paaMatchCount: 3,
      paaWeightedScore: 2.5,
      paaTotal: 5,
      avgSemanticScore: null,
    },
    paaItems: [],
    combinedScore: 67,
    scoreBreakdown: {
      paaMatchScore: 80,
      resonanceBonus: 70,
      opportunityScore: 60,
      intentValueScore: 100,
      cpcScore: 55,
      painAlignmentScore: 50,
      total: 67,
    },
    cachedPaa: false,
    ...over,
  }
}

describe('RadarKeywordCard — displayMode', () => {
  it('mode "relevance" affiche le combinedScore et le label "Score pertinence"', () => {
    const w = mount(RadarKeywordCard, {
      props: { card: makeCard({ combinedScore: 67 }), displayMode: 'relevance' },
    })
    const ring = w.find('.radar-card__score-ring')
    expect(ring.exists()).toBe(true)
    expect(ring.find('.score-ring__value').text()).toBe('67')
    expect(ring.find('.score-ring__label').text()).toBe('Score pertinence')
  })

  it('mode "kpi" calcule le score via computeKpiScore (≠ combinedScore)', () => {
    const card = makeCard({ combinedScore: 67 })
    const w = mount(RadarKeywordCard, {
      props: { card, displayMode: 'kpi', articleLevel: 'intermediaire' },
    })
    const ring = w.find('.radar-card__score-ring')
    const valueText = ring.find('.score-ring__value').text()
    const parsed = Number(valueText)
    expect(Number.isFinite(parsed)).toBe(true)
    expect(parsed).toBeGreaterThanOrEqual(0)
    expect(parsed).toBeLessThanOrEqual(100)
    expect(ring.find('.score-ring__label').text()).toBe('Score KPI')
  })

  it('mode par défaut = "kpi" si non spécifié', () => {
    const w = mount(RadarKeywordCard, {
      props: { card: makeCard(), articleLevel: 'intermediaire' },
    })
    expect(w.find('.score-ring__label').text()).toBe('Score KPI')
  })
})
