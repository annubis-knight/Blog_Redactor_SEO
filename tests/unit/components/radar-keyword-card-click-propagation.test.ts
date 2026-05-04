/**
 * Sprint 3 (2026-05-04) — Tests propagation des clics dans RadarKeywordCard.
 *
 * Friction utilisateur (audit 2026-05-03) :
 *   « un click sur radar-card__chevron devrait uniquement déclencher le
 *     déroulement des PAA, pas l'affichage de la side bar. La side bar
 *     peut s'afficher uniquement si le clic sur la radar card ne
 *     déclenche pas d'action. Les éléments cliquables de la radarcard
 *     sont : les termes underlines, le chevron, les icônes action. »
 *
 * Cause racine : le parent (radar-list-item dans CaptainValidation) a
 * @click=selectEntry. Tout clic interne de RadarKeywordCard bubble et
 * déclenche selectEntry → ouverture sidebar non désirée.
 *
 * Fix : @click.stop sur les zones interactives de RadarKeywordCard.
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

/**
 * Mount avec un parent qui spy le clic bubble.
 */
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

describe('RadarKeywordCard — propagation des clics (Sprint 3)', () => {
  it('AC1 — clic sur radar-card__header NE bubble PAS au parent', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0
    await wrapper.find('.radar-card__header').trigger('click')
    expect(parentClicks).toEqual([]) // pas de bubble
  })

  it('AC1 — clic sur radar-card__header toggle expanded (PAA visible)', async () => {
    const { wrapper } = mountWithParentSpy()
    await wrapper.find('.radar-card__header').trigger('click')
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(true)
  })

  it('AC1 — clic sur radar-card__chevron NE bubble PAS au parent', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0
    await wrapper.find('.radar-card__chevron').trigger('click')
    expect(parentClicks).toEqual([])
  })

  it('AC1 — clic sur radar-card__score-ring NE bubble PAS au parent', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0
    await wrapper.find('.radar-card__score-ring').trigger('click')
    expect(parentClicks).toEqual([])
  })

  it('garde-fou — clic direct sur le parent (hors radar-card) déclenche bien le bubble', async () => {
    const { wrapper, parentClicks } = mountWithParentSpy()
    parentClicks.length = 0
    // Trigger un click direct sur l'élément data-testid="parent"
    await wrapper.find('[data-testid="parent"]').trigger('click')
    // Le clic au-dessus de la card bubble bien au handler (sanity check du test)
    expect(parentClicks).toContain('parent')
  })
})
