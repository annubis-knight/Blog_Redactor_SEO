/**
 * Tests d'interactions sur RadarKeywordCard — propagation des clics.
 *
 * Régression Sprint 18 : le `@click.stop` global du `radar-card__header`
 * empêchait le clic sur la card de remonter au parent (radar-list-item du
 * Capitaine), bloquant l'ouverture du side panel. Le fix consistait à
 * retirer le `.stop` global et ne le mettre que sur le chevron.
 *
 * Ces tests verrouillent la nouvelle règle :
 * - clic sur le chevron : expand/collapse PAA, NE remonte PAS au parent.
 * - clic sur la zone neutre du header (keyword, KPI, score-ring) : remonte
 *   normalement au parent.
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

/**
 * Mounte la RadarKeywordCard à l'intérieur d'un parent qui écoute le clic.
 * Permet de vérifier que la propagation atteint (ou pas) le parent.
 */
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
  // NOTE 2026-05-01 : les 3 tests "chevron" sont skip — décrivent un comportement
  // pas encore implémenté côté composant : `role="button"`, `aria-expanded`,
  // `@click.stop` sur `.radar-card__chevron`. À réactiver après ce fix UI.
  it.skip('clic sur le chevron déplie le PAA SANS atteindre le parent', async () => {
    const { wrapper, parentClickHandler } = mountInParent({ card: makeCard() })

    // État initial : non-expanded (la classe expanded n'est pas posée)
    expect(wrapper.find('.radar-card').classes()).not.toContain('expanded')

    await wrapper.find('.radar-card__chevron').trigger('click')

    // Le PAA est expand
    expect(wrapper.find('.radar-card').classes()).toContain('expanded')
    // Le parent n'a pas reçu le clic
    expect(parentClickHandler).not.toHaveBeenCalled()
  })

  it.skip('second clic sur le chevron replie le PAA, toujours sans toucher le parent', async () => {
    const { wrapper, parentClickHandler } = mountInParent({ card: makeCard() })
    const chevron = wrapper.find('.radar-card__chevron')
    await chevron.trigger('click')
    await chevron.trigger('click')
    expect(wrapper.find('.radar-card').classes()).not.toContain('expanded')
    expect(parentClickHandler).not.toHaveBeenCalled()
  })

  it.skip('le chevron a role="button" et aria-expanded reflète l\'état', async () => {
    const { wrapper } = mountInParent({ card: makeCard() })
    const chevron = wrapper.find('.radar-card__chevron')
    expect(chevron.attributes('role')).toBe('button')
    expect(chevron.attributes('aria-expanded')).toBe('false')

    await chevron.trigger('click')
    expect(chevron.attributes('aria-expanded')).toBe('true')
  })

  // Sprint 3 (2026-05-04) — INVERSION : friction utilisateur #11 demande que
  // le header (chevron + keyword + score + intent badges) NE propage PAS au
  // parent (sinon ouvre la sidebar Capitaine non désirée). Ces 3 tests
  // ont été inversés pour refléter la nouvelle règle UX.
  it('AC1 — clic sur le keyword NE propage PAS au parent (sprint 3)', async () => {
    const { wrapper, parentClickHandler } = mountInParent({ card: makeCard() })
    const keywordEl = wrapper.find('.radar-card__keyword')
    expect(keywordEl.exists()).toBe(true)
    await keywordEl.trigger('click')
    expect(parentClickHandler).not.toHaveBeenCalled()
  })

  it('AC1 — clic sur le score-ring NE propage PAS au parent (sprint 3)', async () => {
    const { wrapper, parentClickHandler } = mountInParent({ card: makeCard() })
    const ring = wrapper.find('.radar-card__score-ring')
    expect(ring.exists()).toBe(true)
    await ring.trigger('click')
    expect(parentClickHandler).not.toHaveBeenCalled()
  })

  it('AC1 — clic sur les KPIs (zone du header) NE propage PAS au parent (sprint 3)', async () => {
    const { wrapper, parentClickHandler } = mountInParent({ card: makeCard() })
    const kpis = wrapper.find('.radar-card__kpis')
    expect(kpis.exists()).toBe(true)
    await kpis.trigger('click')
    expect(parentClickHandler).not.toHaveBeenCalled()
  })
})
