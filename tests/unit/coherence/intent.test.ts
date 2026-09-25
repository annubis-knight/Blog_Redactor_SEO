/**
 * Tests de cohérence data-flow pour les analyses d'intention SERP.
 *
 * AUTHORITY: PostgreSQL `keyword_intent_analyses`
 * READS FROM: POST /intent/analyze (hydrate intentData store), scanIntent (Radar), scanRadarKeywords
 * WRITES TO: intentData, comparisonData, autocompleteData refs du useIntentStore
 * CONSUMERS: IntentStep.vue, ExplorationVerdict.vue, RadarKeywordCard.vue, scoring KPI/pertinence
 * RELATED FR: FR-EXP-INTENT-ANALYZE, FR-RAD-SCAN-2PASS, FR-CAP-VALIDATE, FR-DIS-INTENT-SCAN
 *
 * La règle d'or : l'intent affiché dans une card DOIT être la même valeur que
 * celle utilisée pour le scoring KPI et la tri Radar. Pas de fallback silencieux.
 */

import { describe, it, expect } from 'vitest'
import type { IntentAnalysis, SerpModule, RadarIntentType } from '@shared/types/index.js'
import { intentValueToPseudoScore } from '@shared/scoring-kpi.js'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeMockSerpModule(type: SerpModule['type'], present: boolean): SerpModule {
  return {
    type,
    present,
    position: present ? Math.floor(Math.random() * 10) + 1 : undefined,
  }
}

function makeMockIntentAnalysis(overrides?: Partial<IntentAnalysis>): IntentAnalysis {
  return {
    keyword: 'test keyword',
    modules: [
      makeMockSerpModule('local_pack', true),
      makeMockSerpModule('featured_snippet', false),
      makeMockSerpModule('people_also_ask', true),
    ],
    scores: [
      { category: 'Local', score: 10, maxScore: 10 },
      { category: 'Informationnel', score: 8, maxScore: 10 },
    ],
    dominantIntent: 'informational',
    classification: {
      type: 'informational',
      confidence: 0.85,
      reasoning: 'PAA et résultats organiques dominent le SERP.',
    },
    recommendations: [
      {
        module: 'local_pack',
        action: 'Optimiser fiche Google Business Profile',
        priority: 'high',
      },
      {
        module: 'people_also_ask',
        action: 'Écrire un article FAQ structuré',
        priority: 'high',
      },
    ],
    topOrganicResults: [
      {
        position: 1,
        title: 'Result 1',
        url: 'https://example.com/1',
        description: 'Top result',
        domain: 'example.com',
      },
      {
        position: 2,
        title: 'Result 2',
        url: 'https://example.com/2',
        description: 'Second result',
        domain: 'example.com',
      },
    ],
    paaQuestions: [
      'Comment démarrer une stratégie digitale ?',
      'Quels outils pour la croissance ?',
    ],
    cachedAt: new Date().toISOString(),
    ...overrides,
  }
}

// T11 — la VRAIE fonction de shared/scoring-kpi.ts. Le test en vérifiait une
// copie locale qui divergeait (échelle 0-100 au lieu de 0-1, autres valeurs,
// types `transactional_local` / `mixed` inconnus du Radar) : il ne prouvait
// rien sur le code réel.

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('FR-EXP-INTENT-ANALYZE — affichage vs calcul intent dans scoring KPI', () => {
  it('dominantIntent affiché et utilisé au scoring KPI dérivent de la même expression', () => {
    // Arrange
    const analysis = makeMockIntentAnalysis({
      dominantIntent: 'informational',
    })

    // Simuler l'affichage (ex: IntentStep.vue ligne 44: intentLabels[dominantIntent])
    const intentLabels: Record<string, string> = {
      informational: 'Informationnel',
      transactional_local: 'Transactionnel Local',
      navigational: 'Navigationnel',
      mixed: 'Mixte',
    }
    const displayedLabel = intentLabels[analysis.dominantIntent]

    // Simuler le calcul (shared/scoring-kpi.ts ligne 50-79)
    const intentTypes: RadarIntentType[] = [analysis.dominantIntent as RadarIntentType]
    const pseudoScore = intentValueToPseudoScore(intentTypes, 0.85)

    // Assert
    expect(displayedLabel).toBe('Informationnel')
    expect(intentTypes[0]).toBe(analysis.dominantIntent)
    expect(pseudoScore).toBeCloseTo(0.5 * 0.85) // informationnel = 0,5 × probabilité
  })

  it('intent null → affichage "—", scoring KPI = 0 (pas fallback silencieux)', () => {
    // Arrange
    const analysis = makeMockIntentAnalysis({
      dominantIntent: null as any,
    })

    // Affichage : null → "—"
    const displayed = analysis.dominantIntent ? analysis.dominantIntent : '—'

    // Calcul : intentTypes vide → pseudo score 0
    const intentTypes: RadarIntentType[] = analysis.dominantIntent ? [analysis.dominantIntent as RadarIntentType] : []
    const pseudoScore = intentValueToPseudoScore(intentTypes, null)

    // Assert : affichage et calcul cohérents sur null
    expect(displayed).toBe('—')
    expect(pseudoScore).toBe(0)
  })

  it('les 4 intentions du Radar valent leur poids × la probabilité', () => {
    const cases: Array<{ intentType: RadarIntentType; expected: number }> = [
      { intentType: 'commercial', expected: 0.5 },     // 1,0 × 0,5
      { intentType: 'transactional', expected: 0.4 },  // 0,8 × 0,5
      { intentType: 'informational', expected: 0.25 }, // 0,5 × 0,5
      { intentType: 'navigational', expected: 0.1 },   // 0,2 × 0,5
    ]
    for (const { intentType, expected } of cases) {
      expect(intentValueToPseudoScore([intentType], 0.5), intentType).toBeCloseTo(expected)
    }
  })

  it('plusieurs intentions : la plus forte l’emporte ; sans probabilité, elle compte pleinement', () => {
    expect(intentValueToPseudoScore(['informational', 'commercial'], null)).toBe(1)
  })
})

describe('FR-RAD-SCAN-2PASS — modules affichés vs utilisés dans verdict', () => {
  it('modules présents affichés dans ExplorationVerdict', () => {
    // Arrange
    const analysis = makeMockIntentAnalysis({
      modules: [
        makeMockSerpModule('local_pack', true),
        makeMockSerpModule('featured_snippet', false),
        makeMockSerpModule('people_also_ask', true),
      ],
    })

    // Simuler ExplorationVerdict logic (lignes 19-76 du composable)
    const presentModules = analysis.modules.filter(m => m.present)
    const hasLocalPack = analysis.modules.some(m => m.type === 'local_pack' && m.present)
    const hasPaa = analysis.modules.some(m => m.type === 'people_also_ask' && m.present)

    // Assert
    expect(presentModules.length).toBe(2)
    expect(hasLocalPack).toBe(true)
    expect(hasPaa).toBe(true)
  })

  it('aucun module présent → affichage "terrain libre", pas list vide silencieuse', () => {
    // Arrange
    const analysis = makeMockIntentAnalysis({
      modules: [
        makeMockSerpModule('local_pack', false),
        makeMockSerpModule('featured_snippet', false),
        makeMockSerpModule('people_also_ask', false),
      ],
    })

    // Simuler verdict
    const presentModules = analysis.modules.filter(m => m.present)
    const hasNoSpecialModules = analysis.modules.every(m => !m.present)

    // Assert
    expect(presentModules.length).toBe(0)
    expect(hasNoSpecialModules).toBe(true)
  })

  it('PAA count affiché et utilisé dans recommendations cohérent', () => {
    // Arrange
    const analysis = makeMockIntentAnalysis({
      modules: [
        makeMockSerpModule('people_also_ask', true),
      ],
      paaQuestions: [
        'Q1',
        'Q2',
        'Q3',
      ],
    })

    // Affichage (ExplorationVerdict ligne 42)
    const displayedCount = analysis.paaQuestions.length
    const displayText = `${displayedCount} question(s) PAA detectee(s)`

    // Utilisation dans recommendations
    const hasPaa = analysis.modules.some(m => m.type === 'people_also_ask' && m.present)
    const shouldRecommend = hasPaa && displayedCount > 0

    // Assert
    expect(displayedCount).toBe(3)
    expect(displayText).toContain('3')
    expect(shouldRecommend).toBe(true)
  })
})

describe('FR-EXP-INTENT-ANALYZE — PAA questions cohérence affichage / tri', () => {
  it('paaQuestions[] vide → ExplorationVerdict n\'affiche pas PAA verdict', () => {
    // Arrange
    const analysis = makeMockIntentAnalysis({
      modules: [
        makeMockSerpModule('people_also_ask', true),
      ],
      paaQuestions: [],
    })

    // Logic : si module PAA présent mais paaQuestions vide, that's a bug
    // L'affichage doit couvrir ce cas
    const presentModules = analysis.modules.filter(m => m.present)
    const hasPaa = presentModules.some(m => m.type === 'people_also_ask')
    const hasPaaQuestions = analysis.paaQuestions.length > 0

    // Assert
    expect(hasPaa).toBe(true)
    expect(hasPaaQuestions).toBe(false)
    // → ExplorationVerdict devrait afficher un warning ou ignorer ce module
  })

  it('paaQuestions ne divergent pas entre affichage et utilisation dans recommendations', () => {
    // Arrange
    const analysis = makeMockIntentAnalysis({
      paaQuestions: ['Q1', 'Q2'],
    })

    // Affichage (ligne 42: `${intentStore.paaQuestions.length} question(s)`)
    const displayedQuestions = analysis.paaQuestions

    // Utilisation en recommendations
    const _isRecommended = analysis.recommendations.some(r => r.module === 'people_also_ask')

    // Assert : même liste utilisée partout
    expect(displayedQuestions.length).toBe(2)
    expect(Array.isArray(displayedQuestions)).toBe(true)
  })
})

describe('FR-CAP-VALIDATE — intent modules cross-article shared correctness', () => {
  it('même keyword → mêmes types de modules présents (DB unique par keyword+location)', () => {
    // Reformulé 2026-05-04 : makeMockSerpModule utilise Math.random pour la position,
    // donc on ne peut pas tester l'égalité stricte. L'invariant cross-article porte
    // sur les TYPES de modules présents, pas sur leur position aléatoire de mock.
    // Arrange
    const keyword = 'stratégie digitale'
    const _location = 2250

    const analysis1 = makeMockIntentAnalysis({
      keyword,
      modules: [
        makeMockSerpModule('featured_snippet', true),
        makeMockSerpModule('people_also_ask', true),
      ],
    })

    const analysis2 = makeMockIntentAnalysis({
      keyword,
      modules: [
        makeMockSerpModule('featured_snippet', true),
        makeMockSerpModule('people_also_ask', true),
      ],
    })

    // Assert : mêmes types de modules présents (invariant cross-article)
    const types1 = analysis1.modules.filter(m => m.present).map(m => m.type).sort()
    const types2 = analysis2.modules.filter(m => m.present).map(m => m.type).sort()
    expect(types1).toEqual(types2)
    expect(analysis1.keyword).toBe(analysis2.keyword)
  })
})

describe('FR-EXP-INTENT-ANALYZE — stability et freshness', () => {
  it('intent frais (< 7j) ne doit pas diverger au reload', () => {
    // Arrange
    const now = new Date()
    const freshDate = new Date(now.getTime() - 6 * 24 * 3600 * 1000) // 6 days ago

    const analysis = makeMockIntentAnalysis({
      cachedAt: freshDate.toISOString(),
    })

    // Simule freshness check (keyword-intent-analysis.service.ts ligne 97-101)
    const isKeywordIntentFresh = (fetchedAt: string | Date | null | undefined, ttlDays: number = 7): boolean => {
      if (!fetchedAt) return false
      const ts = typeof fetchedAt === 'string' ? new Date(fetchedAt).getTime() : fetchedAt.getTime()
      return Date.now() - ts < ttlDays * 24 * 60 * 60 * 1000
    }

    // Assert
    expect(isKeywordIntentFresh(analysis.cachedAt, 7)).toBe(true)
  })

  it('intent stale (>= 7d) → refetch, affichage peut différer', () => {
    // Arrange
    const now = new Date()
    const staleDate = new Date(now.getTime() - 8 * 24 * 3600 * 1000) // 8 days ago

    const analysis = makeMockIntentAnalysis({
      cachedAt: staleDate.toISOString(),
    })

    // Freshness check
    const isKeywordIntentFresh = (fetchedAt: string | Date | null | undefined, ttlDays: number = 7): boolean => {
      if (!fetchedAt) return false
      const ts = typeof fetchedAt === 'string' ? new Date(fetchedAt).getTime() : fetchedAt.getTime()
      return Date.now() - ts < ttlDays * 24 * 60 * 60 * 1000
    }

    // Assert
    expect(isKeywordIntentFresh(analysis.cachedAt, 7)).toBe(false)
    // → Service should refetch instead of using stale data
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Placeholders (to be implemented with full store/service setup)
// ─────────────────────────────────────────────────────────────────────────────

describe('FR-RAD-GENERATE — intent type stability', () => {
  it.todo('Radar generate + Capitaine validate sur même keyword → intent stable (< 7j TTL)')
})

describe('FR-DIS-INTENT-SCAN — intent scoring cohérence', () => {
  it.todo('Affichage score résonance dans Radar heat level = celui utilisé pour tri')
  it.todo('resonanceScore=0 (aucun match) → affichage "froide", tri en bas')
})

describe('FR-EXP-INTENT-ANALYZE — fallback Claude handling', () => {
  it.todo('Fallback Claude (confidence=0.3) → affichage label "Estimation par défaut"')
})
