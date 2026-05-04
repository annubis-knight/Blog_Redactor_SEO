/**
 * Sprint 2 (2026-05-04) — Tests bouton recalcul Pertinence dans
 * RadarCardLockable.__actions.
 *
 * Friction utilisateur (audit 2026-05-03) :
 *   « une fonctionnalité de recalcul manuel avait été demandée, via une
 *     nouvelle icône action dans radar-card-lockable__actions. J'avais
 *     demandé une icône qui viendrait recalculer les score de pertinence.
 *     pourquoi ça n'a pas été implémenté ? »
 *
 * Implémentation : 3e bouton dans la colonne d'actions, visible uniquement
 * en mode `relevance` (Capitaine), qui émet `recompute-relevance` que le
 * parent CaptainValidation câble pour relancer la validation à la volée.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarCardLockable from '../../../src/components/intent/RadarCardLockable.vue'
import type { RadarCard } from '../../../shared/types/intent.types'

const MIN_CARD: RadarCard = {
  keyword: 'site web pme',
  reasoning: 'r',
  kpis: {
    searchVolume: 100, difficulty: 25, cpc: 1.2, competition: 0.4,
    intentTypes: ['informational' as const],
    intentProbability: 0.7,
    autocompleteMatchCount: 5,
    paaMatchCount: 3, paaWeightedScore: 1.5, paaTotal: 3,
    avgSemanticScore: 0.6, painAlignmentScore: 40,
  },
  paaItems: [],
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

function mountLockable(propsOverride: Record<string, unknown> = {}) {
  return mount(RadarCardLockable, {
    props: {
      card: MIN_CARD,
      locked: false,
      displayMode: 'relevance',
      articleLevel: 'intermediaire' as const,
      articlePainPoint: 'painPoint suffisamment long pour passer le check (>=10 chars)',
      ...propsOverride,
    },
    global: {
      stubs: {
        RadarKeywordCard: { name: 'RadarKeywordCard', template: '<div class="rkc-stub"></div>', props: ['card', 'displayMode', 'articleLevel', 'articlePainPoint', 'manualTagMode', 'modifiers', 'interactiveWords'], emits: ['word-toggle', 'modifier-untag', 'modifier-cycle'] },
      },
    },
  })
}

describe('RadarCardLockable — bouton recalcul Pertinence (Sprint 2)', () => {
  it('le bouton recompute existe en mode relevance avec painPoint', () => {
    const w = mountLockable()
    expect(w.find('[data-testid="radar-card-recompute-relevance"]').exists()).toBe(true)
  })

  it('le bouton recompute n\'existe PAS en mode kpi (Radar)', () => {
    const w = mountLockable({ displayMode: 'kpi' })
    expect(w.find('[data-testid="radar-card-recompute-relevance"]').exists()).toBe(false)
  })

  it('le bouton recompute est désactivé si articlePainPoint est absent', () => {
    const w = mountLockable({ articlePainPoint: null })
    const btn = w.find('[data-testid="radar-card-recompute-relevance"]')
    // Soit absent, soit présent mais disabled — les deux comportements sont
    // acceptables tant que l'utilisateur ne peut pas cliquer.
    if (btn.exists()) {
      expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    } else {
      expect(btn.exists()).toBe(false)
    }
  })

  it('le bouton recompute est désactivé pendant validating', () => {
    const w = mountLockable({ validating: true })
    const btn = w.find('[data-testid="radar-card-recompute-relevance"]')
    expect(btn.exists()).toBe(true)
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('clic sur le bouton émet recompute-relevance avec la card', async () => {
    const w = mountLockable()
    const btn = w.find('[data-testid="radar-card-recompute-relevance"]')
    await btn.trigger('click')
    const emitted = w.emitted('recompute-relevance')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ keyword: 'site web pme' })
  })

  it('le bouton recompute n\'a PAS d\'effet sur l\'état lock (le clic ne propage pas)', async () => {
    const w = mountLockable()
    const btn = w.find('[data-testid="radar-card-recompute-relevance"]')
    await btn.trigger('click')
    expect(w.emitted('update:locked')).toBeFalsy()
  })

  it('garde-fou : les 3 boutons (lock + tag + recompute) coexistent en mode relevance', () => {
    const w = mountLockable()
    expect(w.find('[data-testid="radar-card-lock"]').exists()).toBe(true)
    expect(w.find('[data-testid="radar-card-tag-toggle"]').exists()).toBe(true)
    expect(w.find('[data-testid="radar-card-recompute-relevance"]').exists()).toBe(true)
  })
})

describe('RadarCardLockable — anti-bruit (clic recompute n\'altère pas le carousel)', () => {
  it('@click.stop sur le bouton recompute empêche la propagation au parent', async () => {
    const parentClick = vi.fn()
    const w = mount({
      components: { RadarCardLockable },
      template: `<div @click="parentClick"><RadarCardLockable v-bind="$attrs" /></div>`,
      methods: { parentClick },
    }, {
      props: {
        card: MIN_CARD,
        locked: false,
        displayMode: 'relevance',
        articleLevel: 'intermediaire',
        articlePainPoint: 'painPoint long enough',
      },
      global: {
        stubs: {
          RadarKeywordCard: { name: 'RadarKeywordCard', template: '<div></div>' },
        },
      },
    })
    await w.find('[data-testid="radar-card-recompute-relevance"]').trigger('click')
    expect(parentClick).not.toHaveBeenCalled()
  })
})
