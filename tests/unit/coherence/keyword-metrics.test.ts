// @vitest-environment node
/**
 * Tests de cohérence pour keyword-metrics data flow.
 * Vérifie les invariants cross-article et freshness check.
 *
 * Voir docs/data-flows/keyword-metrics.md pour la cartographie complète.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock DB client
const mockQuery = vi.fn()

vi.mock('../../../server/db/client', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const {
  getKeywordMetrics,
  upsertKeywordKpis,
  isKeywordMetricsFresh,
} = await import('../../../server/services/keyword/keyword-metrics.service.js')

const {
  compareScores,
} = await import('../../../shared/score/compare.js')

const {
  averageScores,
} = await import('../../../shared/score/aggregate.js')

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.resetAllMocks()
})

// =====================================================
// Test 1: Freshness check (TTL = 7 jours)
// =====================================================

describe('FR-INFRA-KEYWORD-METRICS — freshness check (TTL 7j)', () => {
  it('returns false when fetchedAt is null', () => {
    expect(isKeywordMetricsFresh(null)).toBe(false)
  })

  it('returns false when fetchedAt is undefined', () => {
    expect(isKeywordMetricsFresh(undefined)).toBe(false)
  })

  it('returns true for a date within 7-day TTL', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    expect(isKeywordMetricsFresh(fiveDaysAgo)).toBe(true)
  })

  it('returns false for a date older than 7 days', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    expect(isKeywordMetricsFresh(eightDaysAgo)).toBe(false)
  })

  it('respects custom ttlDays parameter', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    expect(isKeywordMetricsFresh(fiveDaysAgo, 3)).toBe(false) // < 3 days → fresh
    expect(isKeywordMetricsFresh(fiveDaysAgo, 10)).toBe(true) // < 10 days → fresh
  })

  it('accepts ISO 8601 string timestamps', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(isKeywordMetricsFresh(twoHoursAgo)).toBe(true)
  })
})

// =====================================================
// Test 2: Cache-first pattern (cross-article)
// =====================================================

describe('FR-INFRA-KEYWORD-METRICS — cache-first pattern', () => {
  it('returns cached metrics on fresh DB hit', async () => {
    const freshDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    const metrics = {
      keyword: 'seo',
      lang: 'fr',
      country: 'fr',
      search_volume: 5000,
      keyword_difficulty: 45,
      cpc: '1.50',
      competition: '0.6',
      intent_raw: '0.75',
      autocomplete_suggestions: [{ text: 'seo audit', position: 1 }],
      autocomplete_source: 'dataforseo',
      paa_questions: [{ question: 'What is SEO?', answer: 'Search engine optimization.' }],
      local_analysis: null,
      content_gap_analysis: null,
      local_comparison: null,
      fetched_at: freshDate,
    }

    mockQuery.mockResolvedValueOnce({ rows: [metrics] })

    const result = await getKeywordMetrics('seo')
    expect(result).not.toBeNull()
    expect(result!.searchVolume).toBe(5000)
    expect(result!.keywordDifficulty).toBe(45)
  })

  it('returns null on DB miss (keyword not found)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const result = await getKeywordMetrics('nonexistent-keyword')
    expect(result).toBeNull()
  })
})

// =====================================================
// Test 3: NFR-INT-SERP-ONCE invariant
// (Story C4 — `upsertKeywordSerp` retiré ; SERP cross-article persistance
//  est dans keyword-serp.service. NFR-INT-SERP-ONCE testée par
//  serp-analyze-cache-c2.test.ts + serp-analyze-dual-write.test.ts.)
// =====================================================

// =====================================================
// Test 4: compareScores places null in bottom (tri)
// =====================================================

describe('FR-INFRA-KEYWORD-METRICS — compareScores null handling', () => {
  it('places null scores at the bottom (descending)', () => {
    const scores = [80, null, 50, null, 90]
    const sorted = [...scores].sort((a, b) => compareScores(a, b))
    expect(sorted).toEqual([90, 80, 50, null, null])
  })

  it('keeps non-null scores in descending order', () => {
    const scores = [60, 80, 50, 90]
    const sorted = [...scores].sort((a, b) => compareScores(a, b))
    expect(sorted).toEqual([90, 80, 60, 50])
  })

  it('returns 0 when both scores are null', () => {
    expect(compareScores(null, null)).toBe(0)
  })
})

// =====================================================
// Test 5: averageScores excludes null
// =====================================================

describe('FR-INFRA-KEYWORD-METRICS — averageScores null exclusion', () => {
  it('excludes null values from average calculation', () => {
    const result = averageScores([80, null, 60, null, 100])
    expect(result).toBe(80) // (80 + 60 + 100) / 3 = 80
  })

  it('handles all-null input gracefully', () => {
    const result = averageScores([null, null, null])
    expect(result).toBeNull()
  })

  it('handles empty array', () => {
    const result = averageScores([])
    expect(result).toBeNull()
  })

  it('handles single non-null value', () => {
    const result = averageScores([42])
    expect(result).toBe(42)
  })
})

// =====================================================
// Test 6: upsertKeywordKpis COALESCE pattern
// =====================================================

describe('FR-INFRA-KEYWORD-METRICS — upsertKeywordKpis idempotent', () => {
  it('preserves existing values when new values are null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    // Upsert with partial KPIs (cpc = null, but others provided)
    await upsertKeywordKpis('test', {
      searchVolume: 1000,
      keywordDifficulty: 50,
      cpc: null, // Explicitly null
    })

    const [sql] = mockQuery.mock.calls[0]!
    // ON CONFLICT DO UPDATE with COALESCE should preserve old CPC if new is null
    expect(sql).toContain('COALESCE')
  })

  it('updates timestamp on every upsert', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await upsertKeywordKpis('test', { searchVolume: 500 })

    const [sql] = mockQuery.mock.calls[0]!
    expect(sql).toContain('fetched_at = NOW()')
  })
})

// =====================================================
// Placeholder tests for future implementation
// =====================================================

describe('TODO: Advanced coherence checks', () => {
  it.todo('cross-article: two articles validating same keyword triggers only one DataForSEO call')

  it.todo('restore from history: legacy scores (pre-2026-04-28 PAA formula) display calculation date')

  it.todo('affichage/tri coherence: null displayed as "—" AND placed at bottom of sort')

  it.todo('/serp/tfidf without prior /serp/analyze returns 404 with specific message')

  it.todo('serp_raw_json multi-article: article A fetches SERP, article B reuses same data')
})
