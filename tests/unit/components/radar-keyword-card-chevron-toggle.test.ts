/**
 * FR-RAD-CARD-CHEVRON-TOGGLE — toggle PAA UNIQUEMENT sur le chevron.
 *
 * Décision figée 2026-05-05 — voir docs/data-flows/relevance-score-live-computation.md.
 *
 * AVANT (Sprint 3, 2026-05-04) :
 *   @click.stop sur tout le header → toggle PAA sur tout le header,
 *   et bloque la propagation au parent (= side panel ne s'ouvre jamais).
 *
 * APRÈS (cette refonte) :
 *   @click.stop UNIQUEMENT sur le chevron → toggle PAA limité au chevron.
 *   Le reste du header propage normalement vers le parent (radar-list-item)
 *   qui ouvre le side panel.
 *
 * Ces tests sont ROUGES tant que la modif RadarKeywordCard.vue n'est pas faite (Sprint 7).
 *
 * NOTE : ce fichier coexiste avec radar-keyword-card-click-propagation.test.ts qui
 * encode l'ancien comportement. Le fichier ancien sera mis à jour en Sprint 7.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarKeywordCard from '../../../src/components/intent/RadarKeywordCard.vue'
import type { RadarCard } from '../../../shared/types/intent.types'

const MIN_CARD: RadarCard = {
  keyword: 'cours piano intermediaire paris',
  reasoning: 'r',
  kpis: {
    searchVolume: 100, difficulty: 25, cpc: 1.2, competition: 0.4,
    intentTypes: ['informational' as const],
    intentProbability: 0.7,
    autocompleteMatchCount: 5,
    paaMatchCount: 2, paaWeightedScore: 1.0, paaTotal: 2,
    avgSemanticScore: 0.6, painAlignmentScore: 40,
  },
  paaItems: [
    { question: 'Q1?', answer: 'A1', depth: 1, matchType: 'partial', semanticScore: 0.6, painAlignmentScore: 50, parentQuestion: null, topicWeight: 1, painWeight: 0.5 },
  ] as never,
  combinedScore: 50,
  scoreBreakdown: {
    total: 50, paaMatchScore: 30, resonanceBonus: 20,
    opportunityScore: 40, intentValueScore: 60, cpcScore: 50,
    painAlignmentScore: 40,
  },
  cachedPaa: false,
  marketScore: { total: 50, verdict: 'ORANGE', components: [] },
  relevanceScore: null,
} as never as RadarCard

function mountWithParentSpy() {
  const parentClicks: string[] = []
  const wrapper = mount({
    components: { RadarKeywordCard },
    setup() {
      function onParentClick(label: string) { parentClicks.push(label) }
      return { onParentClick }
    },
    template: `
      <div data-testid="parent" @click="onParentClick('parent')">
        <RadarKeywordCard
          :card="card"
          display-mode="kpi"
          article-level="intermediaire"
        />
      </div>
    `,
    data() { return { card: MIN_CARD } },
  })
  return { wrapper, parentClicks }
}

describe('FR-RAD-CARD-CHEVRON-TOGGLE — chevron isolé du reste du header', () => {
  it('clic sur le chevron : toggle PAA + ne propage PAS au parent', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0

    // Avant : pas expanded
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(false)

    // Clic sur le chevron uniquement
    await wrapper.find('.radar-card__chevron').trigger('click')

    // PAA toggle (expanded passe à true)
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(true)
    // Et ne propage pas au parent
    expect(parentClicks).toEqual([])
  })

  it('clic sur le chevron une 2e fois : referme le PAA', async () => {
    const { wrapper } = mountWithParentSpy()
    await wrapper.find('.radar-card__chevron').trigger('click')
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(true)
    await wrapper.find('.radar-card__chevron').trigger('click')
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(false)
  })

  it('clic sur le keyword text (zone non-interactive) : propage AU parent + ne toggle PAS le PAA', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0

    // État initial : PAA fermé
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(false)

    // Clic sur la zone keyword
    await wrapper.find('.radar-card__keyword').trigger('click')

    // PAA reste fermé
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(false)
    // Le clic propage au parent (= side panel s'ouvre)
    expect(parentClicks).toContain('parent')
  })

  it('clic sur les KPIs : propage AU parent + ne toggle PAS le PAA', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0

    expect(wrapper.find('.radar-card.expanded').exists()).toBe(false)

    const kpis = wrapper.find('.radar-card__kpis')
    if (kpis.exists()) {
      await kpis.trigger('click')
      expect(wrapper.find('.radar-card.expanded').exists()).toBe(false)
      expect(parentClicks).toContain('parent')
    }
  })

  it('garde-fou — clic direct sur le parent (hors radar-card) propage bien', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0
    await wrapper.find('[data-testid="parent"]').trigger('click')
    expect(parentClicks).toContain('parent')
  })

  it('clic sur le score-ring : ne toggle PAS le PAA (zone tooltip protégée)', async () => {
    const { wrapper } = mountWithParentSpy()
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(false)
    const ring = wrapper.find('.radar-card__score-ring')
    if (ring.exists()) {
      await ring.trigger('click')
      // Le score-ring conserve son @click.stop (existant) — ne propage pas et ne toggle pas le PAA
      expect(wrapper.find('.radar-card.expanded').exists()).toBe(false)
    }
  })
})
