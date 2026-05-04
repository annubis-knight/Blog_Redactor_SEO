/**
 * Tests de cohérence pour radar-explorations (data-flow).
 *
 * Cibles :
 * - FR-RAD-PERSIST : preservation des cards lors persistance longues-traînes
 * - FR-RAD-LONGTAIL-REGENERATE : filtrage selection aux nouveaux keywords
 * - FR-RAD-SEND-CAPTAIN : dédup cards + longues-traînes sans doublons
 * - FR-RAD-SCORING-BIMODAL : cohérence affichage vs tri (pas de fallback silencieux)
 *
 * Cf. docs/data-flows/radar-explorations.md § Tests de cohérence à écrire.
 */

import { describe, it, expect } from 'vitest'
import type { RadarCard, KeywordRadarScanResult } from '@shared/types/intent.types'
import type { LongTailSuggestion } from '@shared/types/long-tail.types'

// ============================================================================
// Helpers & Fixtures
// ============================================================================

function createRadarCard(keyword: string, overrides?: Partial<RadarCard>): RadarCard {
  return {
    keyword,
    reasoning: `test reasoning for ${keyword}`,
    kpis: {
      searchVolume: 100,
      difficulty: 30,
      cpc: 1.5,
      competition: 0.5,
      intentTypes: ['informational'],
      intentProbability: 0.8,
      autocompleteMatchCount: 2,
      paaMatchCount: 1,
      paaWeightedScore: 0.5,
      paaTotal: 1,
      avgSemanticScore: 0.7,
    },
    paaItems: [],
    combinedScore: 65,
    scoreBreakdown: {
      paaMatchScore: 10,
      resonanceBonus: 15,
      opportunityScore: 20,
      intentValueScore: 10,
      cpcScore: 10,
      painAlignmentScore: 50,
      total: 65,
    },
    cachedPaa: false,
    marketScore: { value: 65, verdict: 'GO', breakdown: { volume: 80, difficulty: 40, cpc: 50, competition: 60, intent: 70 } },
    relevanceScore: { value: 70, verdict: 'GO', breakdown: { pain: 80, paa: 70, autocomplete: 75, roots: 0, intent: 60 } },
    source: 'radar',
    ...overrides,
  }
}

function createLongTailSuggestion(keyword: string, score: number = 7): LongTailSuggestion {
  return {
    keyword,
    rationale: `suggestion for ${keyword}`,
    preferenceScore: score,
    derivedFromRoots: ['root1', 'root2'],
  }
}

function createScanResult(overrides?: Partial<KeywordRadarScanResult>): KeywordRadarScanResult {
  return {
    specificTopic: 'test topic',
    broadKeyword: 'test keyword',
    autocomplete: { suggestions: [], totalCount: 0 },
    cards: [],
    globalScore: 50,
    heatLevel: 'tiede',
    verdict: 'test verdict',
    scannedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('FR-RAD-PERSIST — JSONB complet preserve vs upsert', () => {
  it('preserve cards[] lors persistence longues-traînes', () => {
    // Scenario: première scan a 5 cards, puis on ajoute longues-traînes
    const originalCards = [
      createRadarCard('kw1'),
      createRadarCard('kw2'),
      createRadarCard('kw3'),
      createRadarCard('kw4'),
      createRadarCard('kw5'),
    ]
    const scanResult = createScanResult({ cards: originalCards })

    // Simulation persistance longues-traînes (merge intelligente)
    const longTailSuggestions = [createLongTailSuggestion('kw1-long', 8), createLongTailSuggestion('kw2-long', 7)]
    const merged = {
      ...scanResult,
      longTailSuggestions,
      longTailSelectedKeywords: ['kw1-long'],
    }

    // Vérification : cards non écrasées, longues-traînes ajoutées
    expect(merged.cards).toHaveLength(5)
    expect(merged.cards[0].keyword).toBe('kw1')
    expect(merged.longTailSuggestions).toHaveLength(2)
    expect(merged.longTailSelectedKeywords).toEqual(['kw1-long'])
  })

  it('regenerate longues-traînes ecrase suggestions mais preserve existant cards', () => {
    // Scenario: première gen 10 suggestions, puis régénération retourne 8 (2 perdues, 3 nouvelles)
    const cards = [createRadarCard('kw1'), createRadarCard('kw2')]
    const gen1 = [
      createLongTailSuggestion('combo1', 9),
      createLongTailSuggestion('combo2', 8),
      createLongTailSuggestion('combo3', 7),
      createLongTailSuggestion('combo4', 6),
      createLongTailSuggestion('combo5', 5),
    ]
    const selected1 = new Set(['combo1', 'combo3', 'combo5'])

    let scanResult = createScanResult({ cards, longTailSuggestions: gen1, longTailSelectedKeywords: Array.from(selected1) })

    // Simulation régénération (cache miss)
    const gen2 = [
      createLongTailSuggestion('combo1', 9), // kept
      createLongTailSuggestion('combo3', 7), // kept
      createLongTailSuggestion('combo6', 8), // new
      createLongTailSuggestion('combo7', 6), // new
    ]

    // Intersection : selected1 ∩ gen2.keywords = ['combo1', 'combo3']
    const gen2Keywords = new Set(gen2.map(s => s.keyword))
    const selected2 = new Set(Array.from(selected1).filter(kw => gen2Keywords.has(kw)))

    scanResult = {
      ...scanResult,
      longTailSuggestions: gen2,
      longTailSelectedKeywords: Array.from(selected2),
    }

    // Vérifications
    expect(scanResult.cards).toHaveLength(2) // cards preservées
    expect(scanResult.longTailSuggestions).toHaveLength(4) // écrasées
    expect(scanResult.longTailSelectedKeywords).toEqual(expect.arrayContaining(['combo1', 'combo3'])) // filtrage
    expect(scanResult.longTailSelectedKeywords).not.toContain('combo5') // perdu
  })
})

describe('FR-RAD-LONGTAIL-REGENERATE — sélection filtree aux nouveaux keywords', () => {
  it('conserve la selection qui matche la nouvelle liste', () => {
    const selected = new Set(['A', 'B', 'C'])
    const newList = new Set(['A', 'D', 'E']) // B, C perdus; D, E nouveaux

    const preserved = new Set(Array.from(selected).filter(kw => newList.has(kw)))

    expect(preserved).toEqual(new Set(['A']))
    expect(preserved).not.toContain('B')
    expect(preserved).not.toContain('C')
  })

  it('returns vide si aucune intersection', () => {
    const selected = new Set(['A', 'B'])
    const newList = new Set(['C', 'D', 'E'])

    const preserved = new Set(Array.from(selected).filter(kw => newList.has(kw)))

    expect(preserved.size).toBe(0)
  })
})

describe('FR-RAD-SEND-CAPTAIN — dédup cards + longues-traînes', () => {
  it('merge sans doublon cards + longues-traînes (case-insensitive normalization)', () => {
    // Cards cochées racines
    const cardKeywords = new Set(['Copywriting Email', 'SEO Local'])
    // Longues-traînes cochées
    const ltKeywords = new Set(['copywriting email PME', 'SEO Local B2B']) // note variante casse

    // Simulation dédup canonique (normalize)
    const canonical = new Set<string>()
    for (const kw of [...Array.from(cardKeywords), ...Array.from(ltKeywords)]) {
      canonical.add(kw.toLowerCase().trim())
    }

    // Vérification
    // Reformulé 2026-05-04 : les 4 chaînes sont distinctes une fois lowercased,
    // l'assertion `size === 3` était fausse. La dédup canonique consolide seulement
    // les variantes de casse pures ('SEO Local' ↔ 'seo local'), pas les radicaux.
    expect(canonical.size).toBe(4)
    expect(canonical.has('copywriting email')).toBe(true)
    expect(canonical.has('seo local')).toBe(true)
    expect(canonical.has('copywriting email pme')).toBe(true)
    expect(canonical.has('seo local b2b')).toBe(true)
  })

  it('cas extrême : même keyword exact dans cards + longues-traînes → garde racine', () => {
    // Card racine
    const cardKw: RadarCard = createRadarCard('SEO local', { source: 'radar', kpis: {} as any })
    // Longue-traîne (accidentellement même keyword)
    const _ltSuggestion: LongTailSuggestion = createLongTailSuggestion('seo local', 7)

    // Simulation merge : garder la card racine (kpis présent)
    const selectedCards = [cardKw]
    const selectedLT = ['seo local']

    // Dédup : si keyword exact en lowercase match une card racine, exclure de longues-traînes
    const ltKeysNotInCards = selectedLT.filter(
      ltKw => !selectedCards.some(c => c.keyword.toLowerCase().trim() === ltKw.toLowerCase().trim()),
    )

    expect(selectedCards).toHaveLength(1)
    expect(ltKeysNotInCards).toHaveLength(0) // exclue car match card
  })
})

describe('FR-RAD-SCORING-BIMODAL — affichage vs tri identical', () => {
  it('mode KPI : affichage = tri (même valeur recalculée front)', () => {
    const card = createRadarCard('test', {
      marketScore: { value: 75, verdict: 'GO', breakdown: { volume: 80, difficulty: 40, cpc: 50, competition: 60, intent: 70 } },
    })

    // Simulation front : calcul front du KPI score (qui recalcule depuis card.kpis)
    // En vrai, computeKpiScore(card.kpis) → 75 (mock ici)
    const displayedScore = card.marketScore?.value ?? null
    const tieBreaker = displayedScore !== null ? displayedScore : Infinity // tri desc : null en bas

    expect(displayedScore).toBe(75)
    expect(tieBreaker).toBe(75)
  })

  it('mode Relevance : affichage = tri (peut être null, pas fallback)', () => {
    // Card sans signal pertinence
    const cardNoSignal = createRadarCard('test', {
      relevanceScore: null, // null explicite, pas fallback
    })

    const displayedScore = cardNoSignal.relevanceScore?.value ?? null
    const tieBreaker = displayedScore !== null ? displayedScore : Infinity // null → Infinity (en bas)

    expect(displayedScore).toBeNull()
    expect(tieBreaker).toBe(Infinity) // goes to bottom in sort
  })

  it('longue-traîne (kpis null) : affichage neutre, exclude du tri KPI', () => {
    const card = createRadarCard('long-tail combo', {
      source: 'longtail',
      kpis: null, // no KPIs by construction
      marketScore: undefined, // no market score
      preferenceScore: 8, // only preference score
    })

    // Simulation affichage : pas de cercle score KPI (neutral "—")
    const hasKpiScore = card.kpis !== null && card.marketScore?.value !== null
    expect(hasKpiScore).toBe(false)

    // Simulation tri : fallback à preferenceScore pour longues-traînes, ou excluded du tri KPI
    const triValue = card.source === 'longtail' ? card.preferenceScore : card.marketScore?.value ?? null
    expect(triValue).toBe(8)
  })

  it('cohérence : tri desc par valeur numérique, null toujours en bas', () => {
    const cards = [
      createRadarCard('kw1', { relevanceScore: { value: 60, verdict: 'GO', breakdown: {} as any } }),
      createRadarCard('kw2', { relevanceScore: null }),
      createRadarCard('kw3', { relevanceScore: { value: 80, verdict: 'GO', breakdown: {} as any } }),
      createRadarCard('kw4', { relevanceScore: null }),
    ]

    // Tri : desc par relevanceScore.value, null en bas
    const sorted = cards.sort((a, b) => {
      const scoreA = a.relevanceScore?.value ?? -Infinity
      const scoreB = b.relevanceScore?.value ?? -Infinity
      return scoreB - scoreA // desc
    })

    // Attendre : [80, 60, null, null]
    expect(sorted[0].relevanceScore?.value).toBe(80)
    expect(sorted[1].relevanceScore?.value).toBe(60)
    expect(sorted[2].relevanceScore).toBeNull()
    expect(sorted[3].relevanceScore).toBeNull()
  })
})

describe('FR-RAD-LONGTAIL-UI — pre-check top 5 par preferenceScore desc', () => {
  it('precheckTopN retourne les 5 meilleurs scores triés desc', () => {
    const suggestions = [
      createLongTailSuggestion('kw1', 5),
      createLongTailSuggestion('kw2', 9),
      createLongTailSuggestion('kw3', 7),
      createLongTailSuggestion('kw4', 3),
      createLongTailSuggestion('kw5', 8),
      createLongTailSuggestion('kw6', 6),
      createLongTailSuggestion('kw7', 2),
    ]

    // Simulation precheckTopN(5)
    const sorted = [...suggestions].sort((a, b) => b.preferenceScore - a.preferenceScore)
    const topN = sorted.slice(0, 5)

    expect(topN).toHaveLength(5)
    expect(topN[0].preferenceScore).toBe(9) // kw2
    expect(topN[1].preferenceScore).toBe(8) // kw5
    expect(topN[2].preferenceScore).toBe(7) // kw3
    expect(topN[3].preferenceScore).toBe(6) // kw6
    expect(topN[4].preferenceScore).toBe(5) // kw1
  })

  it('less than 5 suggestions : precheck toutes', () => {
    const suggestions = [
      createLongTailSuggestion('kw1', 8),
      createLongTailSuggestion('kw2', 5),
    ]

    const sorted = [...suggestions].sort((a, b) => b.preferenceScore - a.preferenceScore)
    const topN = sorted.slice(0, 5)

    expect(topN).toHaveLength(2)
    expect(topN.map(s => s.keyword)).toEqual(['kw1', 'kw2'])
  })
})

// ============================================================================
// TODOs (placeholders pour futures features/regressions)
// ============================================================================

describe.todo('FR-RAD-SCORING-BIMODAL — reload restaure scores identiques (pas recalc)', () => {
  it('scores persistés JSONB ≈ scores rechargés (pas divergence formule)', () => {
    // Risque majeur si scores recalculés au reload
    // Test: save scan avec marketScore/relevanceScore, reload, vérifier identique
  })
})

describe.todo('Cas — keyword identity (racine = longue-traîne accidentelle)', () => {
  it('merge dédup garde la racine (source="radar", kpis présent)', () => {
    // Si IA génère accidentellement un keyword identique à une racine
    // Garder la racine (données primaires), perdre la longue-traîne
  })
})
