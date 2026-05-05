/**
 * Tests d'interactions sur RadarKeywordCard — propagation des clics.
 *
 * FR-RAD-CARD-CHEVRON-TOGGLE (2026-05-05) :
 * - clic sur le chevron : expand/collapse PAA, NE remonte PAS au parent.
 * - clic sur la zone neutre du header (keyword, KPI) : remonte AU parent.
 * - score-ring : @click.stop propre (tooltip) → NE remonte PAS, NE toggle PAS.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount, defineComponent, h } from 'vue'
import { mount as vtuMount } from '@vue/test-utils'
import RadarKeywordCard from '../../../src/components/intent/RadarKeywordCard.vue'
import type { RadarCard } from '../../../shared/types/intent.types'

void mount // empêche tree-shaking de l'import si un test l'utilise

function makeCard(over: Partial<RadarCard> = {}): RadarCard {
  return {
    keyword: 'creation site web entreprise',
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
    paaItems: [
      { question: 'Combien coûte un site web ?', answer: 'Entre 1k et 10k€', depth: 0, match: 'partial' },
    ],
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

function mountInParent(props: { card: RadarCard }) {
  const parentClickHandler = vi.fn()
  const wrapper = vtuMount(defineComponent({
    setup() {
      return () =>
        h('div', { class: 'parent-listener', onClick: parentClickHandler }, [
          h(RadarKeywordCard, props),
        ])
    },
  }))
  return { wrapper, parentClickHandler }
}

describe('RadarKeywordCard — propagation des clics', () => {
  it('clic sur le chevron déplie le PAA SANS atteindre le parent', async () => {
    const { wrapper, parentClickHandler } = mountInParent({ card: makeCard() })
    expect(wrapper.find('.radar-card').classes()).not.toContain('expanded')
    await wrapper.find('.radar-card__chevron').trigger('click')
    expect(wrapper.find('.radar-card').classes()).toContain('expanded')
    expect(parentClickHandler).not.toHaveBeenCalled()
  })

  it('second clic sur le chevron replie le PAA, toujours sans toucher le parent', async () => {
    const { wrapper, parentClickHandler } = mountInParent({ card: makeCard() })
    const chevron = wrapper.find('.radar-card__chevron')
    await chevron.trigger('click')
    await chevron.trigger('click')
    expect(wrapper.find('.radar-card').classes()).not.toContain('expanded')
    expect(parentClickHandler).not.toHaveBeenCalled()
  })

  it('clic sur le keyword PROPAGE au parent (ouvre la sidebar)', async () => {
    const { wrapper, parentClickHandler } = mountInParent({ card: makeCard() })
    const keywordEl = wrapper.find('.radar-card__keyword')
    expect(keywordEl.exists()).toBe(true)
    await keywordEl.trigger('click')
    expect(parentClickHandler).toHaveBeenCalled()
    // PAA ne se toggle pas
    expect(wrapper.find('.radar-card.expanded').exists()).toBe(false)
  })

  it('clic sur le score-ring NE propage PAS au parent (tooltip protégé)', async () => {
    const { wrapper, parentClickHandler } = mountInParent({ card: makeCard() })
    const ring = wrapper.find('.radar-card__score-ring')
    expect(ring.exists()).toBe(true)
    await ring.trigger('click')
    expect(parentClickHandler).not.toHaveBeenCalled()
  })

  it('clic sur les KPIs (zone du header) PROPAGE au parent', async () => {
    const { wrapper, parentClickHandler } = mountInParent({ card: makeCard() })
    const kpis = wrapper.find('.radar-card__kpis')
    expect(kpis.exists()).toBe(true)
    await kpis.trigger('click')
    expect(parentClickHandler).toHaveBeenCalled()
  })
})
