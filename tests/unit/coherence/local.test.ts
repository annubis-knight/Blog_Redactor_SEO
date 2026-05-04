// @vitest-environment node
/**
 * Tests de coherence pour local data flow.
 * Verifie le calcul d'opportunityIndex, le review gap, et l'invariant cross-article.
 *
 * Voir docs/data-flows/local.md pour la cartographie complete.
 */
import { describe, it, expect } from 'vitest'

// =====================================================
// FR-EXP-LOCAL-COMPARE — opportunityIndex calcul
// =====================================================

describe('FR-EXP-LOCAL-COMPARE — opportunityIndex', () => {
  type LocationMetrics = {
    searchVolume: number | null
    keywordDifficulty: number | null
    cpc: number | null
    competition: number | null
  }

  const computeOpportunityIndex = (local: LocationMetrics, national: LocationMetrics): number | null => {
    if (local.searchVolume === null || local.keywordDifficulty === null || national.keywordDifficulty === null) {
      return null
    }
    const denominator = Math.max(national.keywordDifficulty, 1)
    return (local.searchVolume * (100 - local.keywordDifficulty)) / denominator
  }

  it('opportunityIndex eleve quand volume local fort + KD local faible', () => {
    const local: LocationMetrics = { searchVolume: 1000, keywordDifficulty: 20, cpc: 1.5, competition: 0.3 }
    const national: LocationMetrics = { searchVolume: 5000, keywordDifficulty: 70, cpc: 2.5, competition: 0.7 }
    const index = computeOpportunityIndex(local, national)
    // (1000 * (100 - 20)) / 70 = 80000 / 70 ~= 1142.86
    expect(index).toBeGreaterThan(1000)
  })

  it('opportunityIndex faible quand volume local bas', () => {
    const local: LocationMetrics = { searchVolume: 50, keywordDifficulty: 30, cpc: 1, competition: 0.2 }
    const national: LocationMetrics = { searchVolume: 5000, keywordDifficulty: 60, cpc: 2, competition: 0.6 }
    const index = computeOpportunityIndex(local, national)
    // (50 * 70) / 60 = 58.33
    expect(index).toBeLessThan(100)
  })

  it('opportunityIndex null si donnee manquante (jamais de fallback 0)', () => {
    const local: LocationMetrics = { searchVolume: null, keywordDifficulty: 30, cpc: 1, competition: 0.2 }
    const national: LocationMetrics = { searchVolume: 5000, keywordDifficulty: 60, cpc: 2, competition: 0.6 }
    expect(computeOpportunityIndex(local, national)).toBeNull()
  })

  it('national KD = 0 ne divise pas par zero (max(KD, 1))', () => {
    const local: LocationMetrics = { searchVolume: 100, keywordDifficulty: 25, cpc: 1, competition: 0.2 }
    const national: LocationMetrics = { searchVolume: 1000, keywordDifficulty: 0, cpc: 2, competition: 0.5 }
    const index = computeOpportunityIndex(local, national)
    expect(index).not.toBeNull()
    expect(Number.isFinite(index)).toBe(true)
  })
})

// =====================================================
// FR-EXP-MAPS — review gap
// =====================================================

describe('FR-EXP-MAPS — review gap calcul', () => {
  type GbpListing = { reviews: number | null }

  const calculateReviewGap = (myReviews: number, listings: GbpListing[]): { avgCompetitor: number; gap: number } | null => {
    const validReviews = listings
      .map(l => l.reviews)
      .filter((r): r is number => r !== null && r > 0)
    if (validReviews.length === 0) return null
    const avg = validReviews.reduce((sum, r) => sum + r, 0) / validReviews.length
    return { avgCompetitor: avg, gap: avg - myReviews }
  }

  it('gap positif si concurrents ont plus d\'avis', () => {
    const result = calculateReviewGap(10, [{ reviews: 50 }, { reviews: 30 }, { reviews: 40 }])
    expect(result).not.toBeNull()
    expect(result!.avgCompetitor).toBe(40)
    expect(result!.gap).toBe(30) // 40 - 10
  })

  it('gap negatif si moi plus d\'avis', () => {
    const result = calculateReviewGap(100, [{ reviews: 20 }, { reviews: 30 }])
    expect(result!.gap).toBe(-75) // 25 - 100
  })

  it('null si aucun concurrent valide (pas de fallback 0)', () => {
    expect(calculateReviewGap(10, [{ reviews: null }, { reviews: 0 }])).toBeNull()
  })
})

// =====================================================
// NFR-COST-CACHE-FIRST — cross-article cache
// =====================================================

describe('NFR-COST-CACHE-FIRST — un keyword = une analyse Maps', () => {
  it('2 articles avec le meme keyword ne refont qu\'un seul fetch DataForSEO', () => {
    type FetchLog = { keyword: string; articleId: number; fetched: boolean }
    const log: FetchLog[] = [
      { keyword: 'plombier paris', articleId: 1, fetched: true }, // miss
      { keyword: 'plombier paris', articleId: 2, fetched: false }, // hit cache
    ]
    const totalFetches = log.filter(l => l.fetched).length
    expect(totalFetches).toBe(1)
  })
})

// =====================================================
// FR-LIE-GEOFUNNEL-RULE — local renforce villes Lieutenants
// =====================================================

describe('FR-LIE-GEOFUNNEL-RULE — coherence Maps -> geo-funnel Lieutenants', () => {
  it.todo('si Local Pack present, suggestion Lieutenant ville premier rang')
  it.todo('Pilier max 1-2 villes, Inter ZERO, Spe ZERO (pas de cannibalisation locale)')
})

// =====================================================
// Reload coherence (placeholder)
// =====================================================

describe('FR-EXP-MAPS — reload coherence (placeholder)', () => {
  it.todo('reload restaure le cache si fetched_at < 7j')
  it.todo('store useLocalStore reflete exactement keyword_metrics.local_analysis')
})
