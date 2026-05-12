/**
 * Tests UI bimodaux pour RadarKeywordCard (moteur:radar-keyword-card-paa-badge).
 *
 * Couvre FR-CAP-PAA-BADGE-SINGLE :
 *   - cardContext='radar' (default) → badge lexical pur (comportement historique)
 *   - cardContext='capitaine' + paaJudgment → badge unique (pertinent/partiel/hors-sujet)
 *   - cardContext='capitaine' + paaJudgmentLoading → état chargement
 *   - cardContext='capitaine' sans paaJudgment → fallback lexical (transparent)
 *   - "PAA pts" header : mode capitaine lit overallPaaScore Haiku
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarKeywordCard from '../../../src/components/intent/RadarKeywordCard.vue'
import type { RadarCard, RadarPaaItem } from '../../../shared/types/intent.types'
import type { PaaJudgmentBlock } from '../../../shared/types/captain-paa-judgment.types'

function makePaaItem(over: Partial<RadarPaaItem> = {}): RadarPaaItem {
  return {
    question: 'Comment choisir une agence web ?',
    answer: 'Vérifier les références.',
    match: 'total',
    matchQuality: 'exact',
    semanticScore: 0.9,
    depth: 1,
    painAlignment: 'aligned',
    ...over,
  } as RadarPaaItem
}

function makeCard(paaItems: RadarPaaItem[] = []): RadarCard {
  return {
    keyword: 'site web',
    reasoning: '',
    kpis: {
      searchVolume: 9900,
      difficulty: 100,
      cpc: 5.2,
      competition: 0.5,
      intentTypes: ['informational'],
      intentProbability: 0.9,
      autocompleteMatchCount: 0,
      paaMatchCount: paaItems.length,
      paaWeightedScore: 4.0,
      paaTotal: paaItems.length,
      avgSemanticScore: null,
    },
    paaItems,
    combinedScore: 50,
    scoreBreakdown: {
      paaMatchScore: 50, resonanceBonus: 30, opportunityScore: 60,
      intentValueScore: 50, cpcScore: 55, painAlignmentScore: 40, total: 50,
    },
    cachedPaa: false,
  } as RadarCard
}

function makeJudgment(badges: Array<'pertinent' | 'partiel' | 'hors-sujet'>): PaaJudgmentBlock {
  return {
    paaJudgments: badges.map((badge, idx) => ({
      paaIndex: idx,
      badge,
      paaScore: badge === 'pertinent' ? 85 : badge === 'partiel' ? 55 : 20,
      reasonShort: `Test ${badge} ${idx}`,
    })),
    overallPaaScore: Math.round(
      badges.reduce((sum, b) => sum + (b === 'pertinent' ? 85 : b === 'partiel' ? 55 : 20), 0) / badges.length,
    ),
    summary: 'Test summary',
  }
}

describe('moteur:radar-keyword-card — cardContext bimodal', () => {
  it('cardContext="radar" (default) → "PAA pts" affiche la somme brute paaWeightedScore', () => {
    const w = mount(RadarKeywordCard, {
      props: { card: makeCard() },
    })
    // En mode radar, le header KPI montre "PAA <value> pts" (legacy)
    const html = w.html()
    expect(html).toContain('PAA')
    expect(html).toContain('4.0 pts') // paaWeightedScore.toFixed(1)
  })

  it('cardContext="capitaine" + paaJudgment fourni → "PAA pts" affiche overallPaaScore/100', () => {
    const judgment = makeJudgment(['pertinent', 'pertinent', 'pertinent', 'pertinent'])
    const w = mount(RadarKeywordCard, {
      props: {
        card: makeCard(),
        cardContext: 'capitaine',
        paaJudgment: judgment,
      },
    })
    const html = w.html()
    expect(html).toContain('85/100')   // overallPaaScore = 85 (4 × 85 / 4 = 85)
    expect(html).not.toContain('4.0 pts')
  })

  it('cardContext="capitaine" + paaJudgmentLoading=true → "..." sur PAA pts', () => {
    const w = mount(RadarKeywordCard, {
      props: {
        card: makeCard(),
        cardContext: 'capitaine',
        paaJudgmentLoading: true,
      },
    })
    const html = w.html()
    expect(html).toContain('...')
  })

  it('cardContext="capitaine" sans paaJudgment ni loading → fallback affichage somme brute (silencieux)', () => {
    const w = mount(RadarKeywordCard, {
      props: {
        card: makeCard(),
        cardContext: 'capitaine',
      },
    })
    // Fallback transparent : on n'affiche pas "..." (pas loading), donc somme brute
    const html = w.html()
    expect(html).toContain('4.0 pts')
  })
})

describe('moteur:radar-keyword-card — badge PAA en mode capitaine', () => {
  it('badge unique "pertinent" → classe badge--judge-pertinent et label "pertinent"', async () => {
    const paaItems = [makePaaItem({ question: 'Q1 ?' })]
    const judgment = makeJudgment(['pertinent'])
    const w = mount(RadarKeywordCard, {
      props: {
        card: makeCard(paaItems),
        cardContext: 'capitaine',
        paaJudgment: judgment,
      },
    })
    // Expand pour voir les PAA
    await w.find('.radar-card__chevron').trigger('click')

    const badge = w.find('.paa-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('pertinent')
    expect(badge.classes()).toContain('badge--judge-pertinent')
  })

  it('badge unique "hors-sujet" → classe badge--judge-hors-sujet', async () => {
    const paaItems = [makePaaItem({ question: 'Q1 ?' })]
    const judgment = makeJudgment(['hors-sujet'])
    const w = mount(RadarKeywordCard, {
      props: {
        card: makeCard(paaItems),
        cardContext: 'capitaine',
        paaJudgment: judgment,
      },
    })
    await w.find('.radar-card__chevron').trigger('click')
    const badge = w.find('.paa-badge')
    expect(badge.text()).toBe('hors-sujet')
    expect(badge.classes()).toContain('badge--judge-hors-sujet')
  })

  it('badge unique "partiel" → classe badge--judge-partiel', async () => {
    const paaItems = [makePaaItem({ question: 'Q1 ?' })]
    const judgment = makeJudgment(['partiel'])
    const w = mount(RadarKeywordCard, {
      props: {
        card: makeCard(paaItems),
        cardContext: 'capitaine',
        paaJudgment: judgment,
      },
    })
    await w.find('.radar-card__chevron').trigger('click')
    const badge = w.find('.paa-badge')
    expect(badge.text()).toBe('partiel')
    expect(badge.classes()).toContain('badge--judge-partiel')
  })

  it('cardContext="radar" → badge lexical historique (Exact / Match / Hors sujet)', async () => {
    const paaItems = [makePaaItem({ question: 'Q1 ?', match: 'total', matchQuality: 'exact' })]
    const w = mount(RadarKeywordCard, {
      props: {
        card: makeCard(paaItems),
        // cardContext omis → default 'radar'
      },
    })
    await w.find('.radar-card__chevron').trigger('click')
    const badge = w.find('.paa-badge')
    // Comportement legacy : matchLabel retourne "Exact" pour match=total + quality=exact
    // (sans tag douleur si painAlignment='aligned' && match='total' → " · douleur")
    expect(badge.text()).toContain('Exact')
    expect(badge.classes()).toContain('badge--total')
  })

  it('mode capitaine multi-PAA → chaque PAA reçoit son propre badge selon paaIndex', async () => {
    const paaItems = [
      makePaaItem({ question: 'Q0 ?' }),
      makePaaItem({ question: 'Q1 ?' }),
      makePaaItem({ question: 'Q2 ?' }),
    ]
    const judgment = makeJudgment(['pertinent', 'partiel', 'hors-sujet'])
    const w = mount(RadarKeywordCard, {
      props: {
        card: makeCard(paaItems),
        cardContext: 'capitaine',
        paaJudgment: judgment,
      },
    })
    await w.find('.radar-card__chevron').trigger('click')
    const badges = w.findAll('.paa-badge')
    expect(badges).toHaveLength(3)
    expect(badges[0].text()).toBe('pertinent')
    expect(badges[1].text()).toBe('partiel')
    expect(badges[2].text()).toBe('hors-sujet')
  })

  it('reasonShort du jugement est exposé en title (tooltip) sur le badge', async () => {
    const paaItems = [makePaaItem({ question: 'Q0 ?' })]
    const judgment = makeJudgment(['pertinent'])
    judgment.paaJudgments[0].reasonShort = 'Aligné sujet et douleur.'
    const w = mount(RadarKeywordCard, {
      props: {
        card: makeCard(paaItems),
        cardContext: 'capitaine',
        paaJudgment: judgment,
      },
    })
    await w.find('.radar-card__chevron').trigger('click')
    const badge = w.find('.paa-badge')
    expect(badge.attributes('title')).toContain('Aligné sujet et douleur')
  })

  it('cardContext="capitaine" mais paaJudgment absent → fallback badge lexical (pas de cassure)', async () => {
    const paaItems = [makePaaItem({ question: 'Q1 ?', match: 'total', matchQuality: 'exact' })]
    const w = mount(RadarKeywordCard, {
      props: {
        card: makeCard(paaItems),
        cardContext: 'capitaine',
        // paaJudgment omis (null)
      },
    })
    await w.find('.radar-card__chevron').trigger('click')
    const badge = w.find('.paa-badge')
    // Fallback transparent : on lit le match lexical comme en mode radar
    expect(badge.text()).toContain('Exact')
  })
})
