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
  it('mode "relevance" affiche `relevanceScore.total` et le label "Score Pertinence"', () => {
    // Sprint 2026-05 — fin du fallback combinedScore en mode relevance.
    // Le score affiché provient strictement de `card.relevanceScore.total`
    // (cf. docs/scoring-kpi-vs-relevance.md). Si absent → "—".
    const card = makeCard({
      combinedScore: 67, // legacy ignoré en mode relevance
      relevanceScore: {
        total: 78,
        verdict: 'GO',
        breakdown: {
          painKeyword: { normalized: 80, weight: 0.3 },
          paaPain: { normalized: 75, weight: 0.3 },
          acPain: { normalized: 70, weight: 0.2 },
          roots: { normalized: 85, weight: 0.1 },
          intentPain: { normalized: 80, weight: 0.1 },
        },
      },
    } as Partial<RadarCard>)
    const w = mount(RadarKeywordCard, {
      props: { card, displayMode: 'relevance', articlePainPoint: 'visibilité locale faible' },
    })
    const ring = w.find('.radar-card__score-ring')
    expect(ring.exists()).toBe(true)
    expect(ring.find('.score-ring__value').text()).toBe('78')
    expect(ring.find('.score-ring__label').text()).toBe('Score Pertinence')
  })

  it('mode "relevance" sans relevanceScore → "—" (pas de fallback combinedScore)', () => {
    const w = mount(RadarKeywordCard, {
      props: { card: makeCard({ combinedScore: 67 }), displayMode: 'relevance' },
    })
    const ring = w.find('.radar-card__score-ring')
    expect(ring.find('.score-ring__value').text()).toBe('—')
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
