/**
 * Sprint 2 (2026-05-04) — Tests tooltip Pertinence différencié.
 *
 * Friction utilisateur (audit 2026-05-03) :
 *   « les scores de pertinence ne s'affichent toujours pas, le tooltip
 *     affiche "veuillez définir un point de douleur" mais l'article en
 *     possède déjà un. »
 *
 * Cause racine : le tooltip était un message unique "Définis un point de
 * douleur" alors que `relevanceScore=null` peut arriver pour 4 raisons :
 *   (A) painPoint absent
 *   (B) painPoint présent, signaux SERP nuls (cas observé sur DB pleine)
 *   (C) longue traîne (kpis: null par construction)
 *
 * Ce sprint introduit un message contextualisé selon la cause détectable.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarKeywordCard from '../../../src/components/intent/RadarKeywordCard.vue'
import type { RadarCard } from '../../../shared/types/intent.types'

const MIN_KPIS = {
  searchVolume: 100,
  difficulty: 25,
  cpc: 1.2,
  competition: 0.4,
  intentTypes: ['informational' as const],
  intentProbability: 0.7,
  autocompleteMatchCount: 5,
  paaMatchCount: 3,
  paaWeightedScore: 1.5,
  paaTotal: 3,
  avgSemanticScore: 0.6,
  painAlignmentScore: 40,
}

function makeCard(overrides: Partial<RadarCard> = {}): RadarCard {
  return {
    keyword: 'test keyword',
    reasoning: 'test reasoning',
    kpis: MIN_KPIS,
    paaItems: [],
    combinedScore: 50,
    scoreBreakdown: {
      total: 50,
      paaMatchScore: 30,
      resonanceBonus: 20,
      opportunityScore: 40,
      intentValueScore: 60,
      cpcScore: 50,
      painAlignmentScore: 40,
    },
    cachedPaa: false,
    marketScore: { total: 50, verdict: 'ORANGE', components: [] },
    relevanceScore: null, // ← cause du tooltip
    ...overrides,
  } as never as RadarCard
}

function mountCard(props: Record<string, unknown> = {}) {
  return mount(RadarKeywordCard, {
    props: {
      card: makeCard(),
      displayMode: 'relevance',
      articleLevel: 'intermediaire' as const,
      ...props,
    },
  })
}

async function showTooltip(wrapper: ReturnType<typeof mountCard>) {
  await wrapper.find('.radar-card__score-ring').trigger('mouseenter')
}

describe('RadarKeywordCard — tooltip Pertinence différencié (Sprint 2)', () => {
  it('Cas A — pas de painPoint → message original "Définis un point de douleur"', async () => {
    const w = mountCard({ articlePainPoint: null })
    await showTooltip(w)
    const tooltip = w.find('.tooltip-empty')
    expect(tooltip.exists()).toBe(true)
    expect(tooltip.text().toLowerCase()).toContain('point de douleur')
    expect(tooltip.text().toLowerCase()).not.toContain('signaux')
  })

  it('Cas A bis — painPoint trop court (<10 chars) → message Définis un point de douleur', async () => {
    const w = mountCard({ articlePainPoint: 'court' })
    await showTooltip(w)
    expect(w.find('.tooltip-empty').text().toLowerCase()).toContain('point de douleur')
  })

  it('Cas B — painPoint présent + score null → message "signaux SERP" + bouton recalcul', async () => {
    const painPoint = 'Je veux un site web qui convertit mais je ne sais pas comment faire'
    const w = mountCard({ articlePainPoint: painPoint })
    await showTooltip(w)
    const tooltip = w.find('.tooltip-empty')
    expect(tooltip.exists()).toBe(true)
    expect(tooltip.text().toLowerCase()).toContain('signaux')
    expect(tooltip.text().toLowerCase()).not.toContain('définis un point de douleur')
  })

  it('Cas C — longue traîne (kpis: null) → message dédié "non applicable"', async () => {
    const longTailCard = makeCard({ kpis: null as never as RadarCard['kpis'] })
    const w = mount(RadarKeywordCard, {
      props: {
        card: longTailCard,
        displayMode: 'relevance',
        articleLevel: 'intermediaire' as const,
        articlePainPoint: 'painPoint suffisamment long',
      },
    })
    await showTooltip(w)
    expect(w.find('.tooltip-empty').text().toLowerCase()).toContain('longue')
  })

  it('Quand relevanceScore présent, le tooltip affiche le breakdown standard (pas le tooltip-empty)', async () => {
    const w = mountCard({
      card: makeCard({
        relevanceScore: {
          total: 65,
          verdict: 'ORANGE',
          breakdown: {
            painKeyword: { weight: 0.3, normalized: 60, contribution: 18 },
            paaPain: { weight: 0.25, normalized: 70, contribution: 17.5 },
            acPain: { weight: 0.15, normalized: 50, contribution: 7.5 },
            roots: { weight: 0.2, normalized: 70, contribution: 14 },
            intentPain: { weight: 0.1, normalized: 80, contribution: 8 },
          },
          rootsContext: { rootsAverageScore: 70, fallbackApplied: false },
        } as never,
      }),
      articlePainPoint: 'painPoint présent',
    })
    await showTooltip(w)
    expect(w.find('.tooltip-empty').exists()).toBe(false)
    expect(w.find('.tooltip-total').text()).toContain('65')
  })
})
