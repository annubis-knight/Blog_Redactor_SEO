/**
 * 2026-05-02 — Tests de la séparation stricte KPI / Pertinence sur
 * `RadarKeywordCard`. Verrouille les invariants documentés dans
 * docs/scoring-kpi-vs-relevance.md.
 *
 * Règles testées :
 *   - Mode `kpi` (Radar)  → `displayedScore` = `computeKpiScore(kpis, level).total`
 *                             jamais `combinedScore`, jamais `relevanceScore`.
 *   - Mode `relevance` (Capitaine) → `displayedScore` = `card.relevanceScore.total`
 *                             jamais `combinedScore`, jamais `marketScore`.
 *   - Mode `relevance` sans `relevanceScore` → affiche "—" (pas de fallback
 *                             combinedScore).
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarKeywordCard from '../../../src/components/intent/RadarKeywordCard.vue'
import type { RadarCard } from '../../../shared/types/intent.types'
import type { MarketScoreResult, RelevanceScoreResult } from '../../../shared/types/scoring.types'

function makeCard(overrides: Partial<RadarCard> = {}): RadarCard {
  return {
    keyword: 'test keyword',
    reasoning: '',
    kpis: {
      searchVolume: 500,
      difficulty: 40,
      cpc: 1.5,
      competition: 0,
      paaWeightedScore: 50,
      paaTotal: 5,
      paaMatchCount: 3,
      autocompleteMatchCount: 4,
      intentTypes: ['informational'],
      intentProbability: 0.8,
      avgSemanticScore: 60,
      painAlignmentScore: 70,
    },
    paaItems: [],
    combinedScore: 42, // Valeur volontairement DIFFÉRENTE pour détecter les fuites legacy.
    scoreBreakdown: {
      paaMatchScore: 50,
      resonanceBonus: 40,
      opportunityScore: 60,
      intentValueScore: 50,
      cpcScore: 30,
      painAlignmentScore: 70,
      total: 42,
    },
    cachedPaa: false,
    ...overrides,
  } as RadarCard
}

function marketStub(total: number): MarketScoreResult {
  return { total, verdict: total >= 70 ? 'GO' : total >= 40 ? 'ORANGE' : 'NOGO', components: [] }
}

function relevanceStub(total: number): RelevanceScoreResult {
  return {
    total,
    verdict: total >= 70 ? 'GO' : total >= 40 ? 'ORANGE' : 'NOGO',
    breakdown: {
      painKeyword: { weight: 0.3, normalized: total, contribution: 0.3 * total },
      paaPain: { weight: 0.25, normalized: total, contribution: 0.25 * total },
      acPain: { weight: 0.15, normalized: total, contribution: 0.15 * total },
      roots: { weight: 0.2, normalized: total, contribution: 0.2 * total },
      intentPain: { weight: 0.1, normalized: total, contribution: 0.1 * total },
    },
    rootsContext: { rootsAverageScore: null, fallbackApplied: false },
  }
}

describe('RadarKeywordCard — séparation stricte KPI / Pertinence', () => {
  it('mode "kpi" : affiche le score KPI (computeKpiScore), pas combinedScore', () => {
    const card = makeCard({
      combinedScore: 42, // legacy : ne doit JAMAIS apparaître
      marketScore: marketStub(75),
      relevanceScore: relevanceStub(50),
    })
    const wrapper = mount(RadarKeywordCard, {
      props: { card, displayMode: 'kpi', articleLevel: 'intermediaire' },
    })
    const value = wrapper.find('.score-ring__value').text()
    // Le score affiché doit être recalculé par computeKpiScore — pas 42 (combinedScore)
    // ni 50 (relevanceScore). marketScore.total est lui-même calculé via computeKpiScore
    // donc la valeur correspondra à un calcul front cohérent.
    expect(value).not.toBe('42')
    expect(value).not.toBe('50')
    expect(wrapper.find('.score-ring__label').text()).toBe('Score KPI')
  })

  it('mode "relevance" : affiche relevanceScore.total, pas combinedScore', () => {
    const card = makeCard({
      combinedScore: 42, // ne doit JAMAIS apparaître
      relevanceScore: relevanceStub(78),
    })
    const wrapper = mount(RadarKeywordCard, {
      props: { card, displayMode: 'relevance', articleLevel: 'intermediaire' },
    })
    expect(wrapper.find('.score-ring__value').text()).toBe('78')
    expect(wrapper.find('.score-ring__label').text()).toBe('Score Pertinence')
  })

  it('mode "relevance" sans relevanceScore : affiche "—" (pas de fallback combinedScore)', async () => {
    const card = makeCard({
      combinedScore: 42, // jamais utilisé en fallback
      relevanceScore: null,
    })
    const wrapper = mount(RadarKeywordCard, {
      props: { card, displayMode: 'relevance', articleLevel: 'intermediaire' },
    })
    expect(wrapper.find('.score-ring__value').text()).toBe('—')
    // Le ring porte la classe "--empty" pour styliser visuellement l'absence.
    expect(wrapper.find('.radar-card__score-ring--empty').exists()).toBe(true)
    // Tooltip explicatif présent dans le DOM après hover.
    await wrapper.find('.radar-card__score-ring').trigger('mouseenter')
    expect(wrapper.find('.tooltip-empty').exists()).toBe(true)
    expect(wrapper.find('.tooltip-empty').text()).toContain('Score Pertinence indisponible')
  })

  it('mode "relevance" avec relevanceScore.total = 0 : affiche 0 (pas "—")', () => {
    // 0 est une valeur LÉGITIME — un keyword totalement hors douleur a un
    // score de 0. Ne pas confondre avec "indisponible".
    const card = makeCard({
      combinedScore: 42,
      relevanceScore: relevanceStub(0),
    })
    const wrapper = mount(RadarKeywordCard, {
      props: { card, displayMode: 'relevance', articleLevel: 'intermediaire' },
    })
    expect(wrapper.find('.score-ring__value').text()).toBe('0')
  })

  it('mode "kpi" sans marketScore : utilise quand même computeKpiScore (recalcul front)', () => {
    // marketScore absent (cards historiques) : le mode kpi recalcule depuis kpis.
    // La valeur doit être un nombre cohérent, pas combinedScore=42.
    const card = makeCard({
      combinedScore: 42,
      marketScore: undefined,
      relevanceScore: undefined,
    })
    const wrapper = mount(RadarKeywordCard, {
      props: { card, displayMode: 'kpi', articleLevel: 'intermediaire' },
    })
    const value = wrapper.find('.score-ring__value').text()
    expect(value).not.toBe('42')
    expect(value).not.toBe('—')
    // Le score doit être un nombre entre 0 et 100
    const n = Number(value)
    expect(Number.isFinite(n)).toBe(true)
    expect(n).toBeGreaterThanOrEqual(0)
    expect(n).toBeLessThanOrEqual(100)
  })
})

describe('RadarKeywordCard — labels', () => {
  it('mode "kpi" affiche le label "Score KPI"', () => {
    const wrapper = mount(RadarKeywordCard, {
      props: { card: makeCard({ marketScore: marketStub(70) }), displayMode: 'kpi', articleLevel: 'intermediaire' },
    })
    expect(wrapper.find('.score-ring__label').text()).toBe('Score KPI')
  })

  it('mode "relevance" affiche le label "Score Pertinence"', () => {
    const wrapper = mount(RadarKeywordCard, {
      props: { card: makeCard({ relevanceScore: relevanceStub(70) }), displayMode: 'relevance', articleLevel: 'intermediaire' },
    })
    expect(wrapper.find('.score-ring__label').text()).toBe('Score Pertinence')
  })
})
