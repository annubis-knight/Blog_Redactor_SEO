/**
 * Sprint 7 (2026-05-05) — Tests propagation des clics dans RadarKeywordCard.
 *
 * FR-RAD-CARD-CHEVRON-TOGGLE — comportement figé (docs/radar-card-component.md) :
 *   • Chevron ▶ : toggle PAA + @click.stop (ne propage PAS au parent)
 *   • Reste du header (keyword, KPIs) : propage AU parent (ouvre la sidebar)
 *                                       + ne toggle PAS le PAA
 *   • Score-ring : @click.stop sur le composant lui-même (pour le tooltip)
 *                  → ne propage PAS, ne toggle PAS le PAA
 *
 * Ces tests remplacent les anciens AC1 du Sprint 3 qui encodaient l'ANCIEN
 * comportement (@click.stop sur tout le header). Mis à jour en Sprint 7.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarKeywordCard from '../../../src/components/intent/RadarKeywordCard.vue'
import type { RadarCard } from '../../../shared/types/intent.types'

const MIN_CARD: RadarCard = {
  keyword: 'test keyword',
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
    { question: 'Q2?', answer: 'A2', depth: 1, matchType: 'partial', semanticScore: 0.5, painAlignmentScore: 40, parentQuestion: null, topicWeight: 1, painWeight: 0.4 },
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

describe('RadarKeywordCard — propagation des clics (FR-RAD-CARD-CHEVRON-TOGGLE)', () => {
  it('clic sur radar-card__chevron : toggle PAA + NE bubble PAS au parent', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0
    await wrapper.find('.radar-card__chevron').trigger('click')
    expect(parentClicks).toEqual([])
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(true)
  })

  it('clic sur radar-card__header (hors chevron) : bubble AU parent + ne toggle PAS le PAA', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0
    // Clic direct sur le header (hors chevron) → bubble vers le parent
    await wrapper.find('.radar-card__header').trigger('click')
    expect(parentClicks).toContain('parent')
    // PAA ne se toggle pas (le header seul ne toggle plus)
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(false)
  })

  it('clic sur radar-card__score-ring NE bubble PAS au parent (tooltip protégé)', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0
    await wrapper.find('.radar-card__score-ring').trigger('click')
    expect(parentClicks).toEqual([])
  })

  it('garde-fou — clic direct sur le parent (hors radar-card) déclenche bien le bubble', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0
    await wrapper.find('[data-testid="parent"]').trigger('click')
    expect(parentClicks).toContain('parent')
  })
})
