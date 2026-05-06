/**
 * 2026-05-02 — Verrouille la propagation des scores backend lors du
 * `restoreFromHistory` du carousel Capitaine. Bug historique : après reload
 * d'un article, les entries reconstituées n'avaient pas de `relevanceScore`
 * → la card Capitaine affichait "—" alors que le score existait en backend
 * (radar_explorations).
 *
 * Fix : `getCaptainExplorations` (backend) hydrate `marketScore`/`relevanceScore`
 * depuis `radar_explorations.scan_result.cards[k]`, et `restoreFromHistory`
 * (front) les propage à `hydrateCardFromValidation`.
 */
import { describe, it, expect } from 'vitest'
import { useExploredKeywords } from '../../../src/composables/keyword/useExploredKeywords'
import type { CaptainScanEntry } from '../../../shared/types/keyword.types'
import type { MarketScoreResult, RelevanceScoreResult } from '../../../shared/types/scoring.types'

function relevanceStub(total: number): RelevanceScoreResult {
  return {
    total,
    verdict: total >= 70 ? 'GO' : total >= 40 ? 'ORANGE' : 'NOGO',
    breakdown: {
      painKeyword: { weight: 0.3, normalized: total, contribution: 0.3 * total },
      paaPain: { weight: 0.25, normalized: total, contribution: 0.25 * total },
      acPain: { weight: 0.15, normalized: total, contribution: 0.15 * total },
      roots: { weight: 0.2, normalized: total, contribution: 0.2 * total },
      intentPain: { weight: 0.1, normalized: total, contribution: 0.1 * total },
    },
    rootsContext: { rootsAverageScore: null, fallbackApplied: false },
  }
}

function marketStub(total: number): MarketScoreResult {
  return { total, verdict: total >= 70 ? 'GO' : total >= 40 ? 'ORANGE' : 'NOGO', components: [] }
}

function makeEntry(overrides: Partial<CaptainScanEntry> = {}): CaptainScanEntry {
  return {
    keyword: 'test keyword',
    kpis: [
      { name: 'volume', rawValue: 500 },
      { name: 'kd', rawValue: 40 },
      { name: 'cpc', rawValue: 1.5 },
      { name: 'paa', rawValue: 0 },
      { name: 'autocomplete', rawValue: 4 },
      { name: 'intent', rawValue: 0.7 },
    ],
    articleLevel: 'intermediaire',
    rootKeywords: [],
    paaQuestions: [],
    aiPanelMarkdown: null,
    exploredAt: '2026-05-02T00:00:00Z',
    ...overrides,
  }
}

describe('useExploredKeywords.restoreFromHistory — propagation scores', () => {
  it('propage relevanceScore depuis CaptainScanEntry vers card.relevanceScore', () => {
    const carousel = useExploredKeywords()
    const relevance = relevanceStub(78)
    const history = [makeEntry({ keyword: 'kw1', relevanceScore: relevance })]

    carousel.restoreFromHistory(history, 'intermediaire')

    expect(carousel.entries.value).toHaveLength(1)
    expect(carousel.entries.value[0].card.relevanceScore).toEqual(relevance)
    expect(carousel.entries.value[0].card.relevanceScore?.total).toBe(78)
  })

  it('propage marketScore depuis CaptainScanEntry vers card.marketScore', () => {
    const carousel = useExploredKeywords()
    const market = marketStub(65)
    const history = [makeEntry({ keyword: 'kw1', marketScore: market })]

    carousel.restoreFromHistory(history, 'intermediaire')

    expect(carousel.entries.value[0].card.marketScore).toEqual(market)
  })

  it('relevanceScore null dans l\'entry → null sur la card (cas painPoint absent)', () => {
    const carousel = useExploredKeywords()
    const history = [makeEntry({ keyword: 'kw1', relevanceScore: null })]

    carousel.restoreFromHistory(history, 'intermediaire')

    expect(carousel.entries.value[0].card.relevanceScore).toBeNull()
  })

  it('relevanceScore absent dans l\'entry → null sur la card', () => {
    const carousel = useExploredKeywords()
    const history = [makeEntry({ keyword: 'kw1' })]
    delete (history[0] as CaptainScanEntry).relevanceScore

    carousel.restoreFromHistory(history, 'intermediaire')

    expect(carousel.entries.value[0].card.relevanceScore).toBeNull()
  })

  it('plusieurs entries : chaque card reçoit son propre relevanceScore', () => {
    const carousel = useExploredKeywords()
    const history = [
      makeEntry({ keyword: 'kw1', relevanceScore: relevanceStub(80) }),
      makeEntry({ keyword: 'kw2', relevanceScore: relevanceStub(50) }),
      makeEntry({ keyword: 'kw3', relevanceScore: null }),
    ]

    carousel.restoreFromHistory(history, 'intermediaire')

    expect(carousel.entries.value).toHaveLength(3)
    expect(carousel.entries.value[0].card.relevanceScore?.total).toBe(80)
    expect(carousel.entries.value[1].card.relevanceScore?.total).toBe(50)
    expect(carousel.entries.value[2].card.relevanceScore).toBeNull()
  })
})
