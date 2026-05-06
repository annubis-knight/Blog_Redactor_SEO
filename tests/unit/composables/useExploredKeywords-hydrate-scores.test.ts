/**
 * 2026-05-02 — Verrouille la propagation des scores dans
 * `hydrateCardFromValidation`. Bug historique : les champs `marketScore` et
 * `relevanceScore` du backend étaient perdus lors de l'hydratation, forçant
 * l'UI Capitaine à fallback sur `combinedScore` (legacy hybride) et brisant
 * la séparation KPI / Pertinence documentée dans
 * docs/scoring-kpi-vs-relevance.md.
 */
import { describe, it, expect } from 'vitest'
import { hydrateCardFromValidation } from '../../../src/composables/keyword/useExploredKeywords'
import type { ValidateResponse } from '../../../shared/types'

function makeResponse(overrides: Partial<ValidateResponse> = {}): ValidateResponse {
  return {
    keyword: 'test keyword',
    articleLevel: 'intermediaire',
    kpis: [
      { name: 'volume', rawValue: 500, color: 'orange', label: 'Volume' },
      { name: 'kd', rawValue: 40, color: 'green', label: 'KD' },
      { name: 'cpc', rawValue: 1.5, color: 'green', label: 'CPC' },
      { name: 'paa', rawValue: 50, color: 'orange', label: 'PAA' },
      { name: 'autocomplete', rawValue: 4, color: 'orange', label: 'Auto' },
    ],
    verdict: { level: 'ORANGE', reason: 'mixed', autoNoGo: false },
    fromCache: false,
    cachedAt: null,
    ...overrides,
  } as ValidateResponse
}

describe('hydrateCardFromValidation — propagation des scores', () => {
  it('propage marketScore depuis ValidateResponse', () => {
    const market = { total: 65, verdict: 'ORANGE' as const, components: [] }
    const response = makeResponse({ marketScore: market })
    const card = hydrateCardFromValidation('test keyword', response)
    expect(card.marketScore).toEqual(market)
  })

  it('propage relevanceScore depuis ValidateResponse', () => {
    const relevance = {
      total: 78,
      verdict: 'GO' as const,
      breakdown: {
        painKeyword: { weight: 0.3, normalized: 80, contribution: 24 },
        paaPain: { weight: 0.25, normalized: 75, contribution: 18.75 },
        acPain: { weight: 0.15, normalized: 60, contribution: 9 },
        roots: { weight: 0.2, normalized: 80, contribution: 16 },
        intentPain: { weight: 0.1, normalized: 100, contribution: 10 },
      },
      rootsContext: { rootsAverageScore: 80, fallbackApplied: false },
    }
    const response = makeResponse({ relevanceScore: relevance })
    const card = hydrateCardFromValidation('test keyword', response)
    expect(card.relevanceScore).toEqual(relevance)
  })

  it('relevanceScore null → propagé comme null (cas painPoint absent)', () => {
    const response = makeResponse({ relevanceScore: null })
    const card = hydrateCardFromValidation('test keyword', response)
    expect(card.relevanceScore).toBeNull()
  })

  it('marketScore absent → undefined sur la card (rétro-compat backend)', () => {
    const response = makeResponse({ marketScore: undefined })
    const card = hydrateCardFromValidation('test keyword', response)
    expect(card.marketScore).toBeUndefined()
  })

  it('relevanceScore absent dans le payload → null sur la card', () => {
    const response = makeResponse({})
    delete response.relevanceScore
    const card = hydrateCardFromValidation('test keyword', response)
    expect(card.relevanceScore).toBeNull()
  })

  it('combinedScore reste calculé localement (legacy, conservé pour rétro-compat)', () => {
    const card = hydrateCardFromValidation('test keyword', makeResponse())
    expect(typeof card.combinedScore).toBe('number')
    expect(card.combinedScore).toBeGreaterThanOrEqual(0)
    expect(card.combinedScore).toBeLessThanOrEqual(100)
  })
})
