/**
 * Sprint D-2 (2026-05-02) — Tests RadarAiPanel.
 *
 * Panel suggestion bas de page sur l'onglet Radar. Surface les meilleurs
 * candidats Capitaine via tri local par marketScore + relevanceScore. Pas
 * d'appel IA. Handoff : emit('mark-captain-candidates', selectedKeywords[]).
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarAiPanel from '@/components/moteur/RadarAiPanel.vue'
import type { RadarCard } from '@shared/types/intent.types'

function makeCard(over: Partial<RadarCard> & { keyword: string }): RadarCard {
  return {
    keyword: over.keyword,
    reasoning: '',
    paaItems: [],
    combinedScore: 50,
    scoreBreakdown: {
      paaMatchScore: 50,
      resonanceBonus: 50,
      opportunityScore: 50,
      intentValueScore: 50,
      cpcScore: 50,
      painAlignmentScore: 50,
      total: 50,
    },
    cachedPaa: false,
    kpis: {
      searchVolume: 1000,
      difficulty: 30,
      cpc: 1.5,
      competition: 0.4,
      intentTypes: ['informational' as const],
      intentProbability: 0.8,
      autocompleteMatchCount: 2,
      paaMatchCount: 1,
      paaWeightedScore: 1.5,
      paaTotal: 3,
      avgSemanticScore: null,
    },
    ...over,
  }
}

const COMMON = { cards: [] as RadarCard[], isLocked: false }
// hasScanResult passe à true quand on veut tester le comportement post-scan
// (cards rendues, handoff actif). Sans ce flag, le panel est en état "idle".
const POST_SCAN = { hasScanResult: true }

describe('RadarAiPanel', () => {
  it('rend la coque suggestion', () => {
    const w = mount(RadarAiPanel, { props: COMMON })
    expect(w.find('[data-testid="ai-panel-suggestion"]').exists()).toBe(true)
  })

  it('cards vide + pas de scan → empty hint "no-scan"', () => {
    const w = mount(RadarAiPanel, { props: COMMON })
    expect(w.find('[data-testid="radar-ai-empty-no-scan"]').exists()).toBe(true)
    expect(w.find('[data-testid="radar-ai-list"]').exists()).toBe(false)
  })

  it('cards vide + scan exécuté → empty hint "no-candidates"', () => {
    const w = mount(RadarAiPanel, { props: { ...COMMON, ...POST_SCAN } })
    expect(w.find('[data-testid="radar-ai-empty-no-candidates"]').exists()).toBe(true)
    expect(w.find('[data-testid="radar-ai-list"]').exists()).toBe(false)
  })

  it('cards non vide → liste de candidats avec checkboxes', () => {
    const cards = [
      makeCard({
        keyword: 'kw-a',
        marketScore: { total: 70, verdict: 'GO', components: [] as any },
        relevanceScore: { total: 60, verdict: 'GO', breakdown: {} as any, rootsContext: null },
      }),
    ]
    const w = mount(RadarAiPanel, { props: { ...COMMON, ...POST_SCAN, cards } })
    expect(w.find('[data-testid="radar-ai-list"]').exists()).toBe(true)
    expect(w.findAll('input[type="checkbox"]').length).toBe(1)
  })

  it('cocher + handoff → emit mark-captain-candidates avec sélection', async () => {
    const cards = [
      makeCard({
        keyword: 'kw-a',
        marketScore: { total: 70, verdict: 'GO', components: [] as any },
        relevanceScore: { total: 60, verdict: 'GO', breakdown: {} as any, rootsContext: null },
      }),
      makeCard({
        keyword: 'kw-b',
        marketScore: { total: 65, verdict: 'GO', components: [] as any },
        relevanceScore: { total: 55, verdict: 'GO', breakdown: {} as any, rootsContext: null },
      }),
    ]
    const w = mount(RadarAiPanel, { props: { ...COMMON, ...POST_SCAN, cards } })
    const cbs = w.findAll('input[type="checkbox"]')
    await cbs[0].setValue(true)
    await w.find('[data-testid="radar-ai-handoff"]').trigger('click')
    expect(w.emitted('mark-captain-candidates')).toBeTruthy()
    const payload = w.emitted('mark-captain-candidates')![0][0] as string[]
    expect(payload).toContain('kw-a')
  })

  it('handoff désactivé tant que rien n\'est coché', () => {
    const cards = [
      makeCard({
        keyword: 'kw',
        marketScore: { total: 70, verdict: 'GO', components: [] as any },
        relevanceScore: { total: 60, verdict: 'GO', breakdown: {} as any, rootsContext: null },
      }),
    ]
    const w = mount(RadarAiPanel, { props: { ...COMMON, ...POST_SCAN, cards } })
    expect(w.find('[data-testid="radar-ai-handoff"]').attributes('disabled')).toBeDefined()
  })

  it('handoff désactivé tant qu\'aucun scan n\'a été exécuté (même avec cards)', () => {
    const cards = [
      makeCard({
        keyword: 'kw',
        marketScore: { total: 70, verdict: 'GO', components: [] as any },
        relevanceScore: { total: 60, verdict: 'GO', breakdown: {} as any, rootsContext: null },
      }),
    ]
    // hasScanResult: false → handoff disabled même si cards et checkbox cochée
    const w = mount(RadarAiPanel, { props: { ...COMMON, cards } })
    expect(w.find('[data-testid="radar-ai-handoff"]').attributes('disabled')).toBeDefined()
  })

  it('cards toutes NOGO → liste vide + message empty', () => {
    const cards = [
      makeCard({
        keyword: 'nogo',
        marketScore: { total: 30, verdict: 'NOGO', components: [] as any },
        relevanceScore: { total: 30, verdict: 'NOGO', breakdown: {} as any, rootsContext: null },
      }),
    ]
    const w = mount(RadarAiPanel, { props: { ...COMMON, ...POST_SCAN, cards } })
    expect(w.find('[data-testid="radar-ai-list"]').exists()).toBe(false)
    expect(w.find('[data-testid="radar-ai-empty-no-candidates"]').exists()).toBe(true)
  })
})
