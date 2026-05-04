/**
 * Sprint 5 (2026-05-04) — Tests Radar UX.
 *
 * Frictions utilisateur (audit 2026-05-03) :
 *   #7 — « à quoi sert scanner-inputs dans l'onglet Radar alors qu'on a un
 *         onglet Discovery ? » → masqué en mode workflow.
 *   #8 — « les radar-ai-score-pill du panel ia semblent ne pas fonctionner. »
 *        → affichent "—" au lieu de "0" quand le score est absent.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarAiPanel from '../../../src/components/moteur/RadarAiPanel.vue'
import type { RadarCard } from '../../../shared/types/intent.types'

function makeCard(overrides: Partial<RadarCard> = {}): RadarCard {
  return {
    keyword: 'kw',
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
    marketScore: { total: 60, verdict: 'ORANGE', components: [] },
    relevanceScore: null,
    ...overrides,
  } as never as RadarCard
}

describe('RadarAiPanel — pills score (Sprint 5 #8)', () => {
  it('AC8 — pill Pertinence affiche "—" quand relevanceScore est null', () => {
    const w = mount(RadarAiPanel, {
      props: { cards: [makeCard()], isLocked: false },
    })
    const html = w.html()
    // À la place de "P 0", on affiche "—"
    expect(html).toMatch(/P\s+—/)
    // Garde-fou : aucune pill ne doit afficher "P 0" exactement
    // (ré-écrit comme assertion strictement positive : pas de pill avec
    // un texte commençant par "P 0" suivi de fin de chaîne ou non-digit).
    expect(html).not.toContain('P 0\n')
    expect(html).not.toContain('P 0<')
    expect(html).not.toContain('P 0 ')
  })

  it('AC8 — pill Marché affiche "—" quand marketScore est absent (null)', () => {
    // Card avec marketScore null (jamais calculé). isNogoBoth() laisse
    // passer car relevanceScore est aussi null → pas de filtre sur les 2.
    // On garde la card avec relevanceScore présent pour qu'elle ne soit
    // pas filtrée par isNogoBoth.
    const card = makeCard({
      marketScore: null as never,
      relevanceScore: { total: 50, verdict: 'ORANGE', breakdown: {} as never, rootsContext: { rootsAverageScore: null, fallbackApplied: true } } as never,
    })
    const w = mount(RadarAiPanel, {
      props: { cards: [card], isLocked: false },
    })
    expect(w.html()).toMatch(/M\s+—/)
  })

  it('AC8 — pill Marché affiche le chiffre arrondi quand le score est présent', () => {
    const card = makeCard({
      marketScore: { total: 67.4, verdict: 'ORANGE', components: [] } as never,
    })
    const w = mount(RadarAiPanel, {
      props: { cards: [card], isLocked: false },
    })
    expect(w.html()).toMatch(/M\s+67/)
  })

  it('AC8 — pill Pertinence affiche le chiffre arrondi quand le score est présent', () => {
    const card = makeCard({
      relevanceScore: {
        total: 73.6, verdict: 'ORANGE',
        breakdown: {
          painKeyword: { weight: 0.3, normalized: 70, contribution: 21 },
          paaPain: { weight: 0.25, normalized: 75, contribution: 18.75 },
          acPain: { weight: 0.15, normalized: 60, contribution: 9 },
          roots: { weight: 0.2, normalized: 80, contribution: 16 },
          intentPain: { weight: 0.1, normalized: 70, contribution: 7 },
        },
        rootsContext: { rootsAverageScore: 80, fallbackApplied: false },
      } as never,
    })
    const w = mount(RadarAiPanel, {
      props: { cards: [card], isLocked: false },
    })
    expect(w.html()).toMatch(/P\s+74/)
  })

  it('AC8 — title du tooltip mentionne "indisponible" quand score absent', () => {
    const w = mount(RadarAiPanel, {
      props: { cards: [makeCard()], isLocked: false },
    })
    const html = w.html()
    expect(html).toContain('Pertinence indisponible')
  })
})
