// @vitest-environment node
/**
 * Tests de caractérisation pour keyword-metrics.service.
 *
 * S2.1 — Sprint 2 stabilisation : on fige le comportement actuel des
 * fonctions pures et de l'API CRUD avant tout refactor (notamment S3 sur
 * shared/score/). Ces tests sont volontairement « low-fidelity » : ils
 * vérifient le contrat observable, pas l'implémentation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  upsertKeywordAutocomplete,
  upsertKeywordPaa,
  isKeywordMetricsFresh,
  deleteKeywordMetrics,
} = await import('../../../server/services/keyword/keyword-metrics.service')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('moteur:keyword-metrics:isKeywordMetricsFresh', () => {
  it('returns false when fetchedAt is null', () => {
    expect(isKeywordMetricsFresh(null)).toBe(false)
  })

  it('returns false when fetchedAt is undefined', () => {
    expect(isKeywordMetricsFresh(undefined)).toBe(false)
  })

  it('returns true for a date within default 7-day TTL', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(isKeywordMetricsFresh(yesterday)).toBe(true)
  })

  it('returns false for a date older than 7 days', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    expect(isKeywordMetricsFresh(tenDaysAgo)).toBe(false)
  })

  it('respects custom ttlDays parameter', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(isKeywordMetricsFresh(fiveDaysAgo, 3)).toBe(false)
    expect(isKeywordMetricsFresh(fiveDaysAgo, 10)).toBe(true)
  })

  it('accepts Date objects (not just strings)', () => {
    const recent = new Date(Date.now() - 60 * 1000)
    expect(isKeywordMetricsFresh(recent)).toBe(true)
  })
})

describe('moteur:keyword-metrics:getKeywordMetrics', () => {
  it('returns null when keyword not found in DB', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const result = await getKeywordMetrics('inconnu')
    expect(result).toBeNull()
  })

  it('maps DB row to KeywordMetrics with type coercion', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        keyword: 'seo',
        lang: 'fr',
        country: 'fr',
        search_volume: 1000,
        keyword_difficulty: 45,
        cpc: '1.23', // CPC stored as string in DB
        competition: '0.5',
        intent_raw: '0.8',
        autocomplete_suggestions: [{ text: 'seo', position: 1 }],
        autocomplete_source: 'dataforseo',
        paa_questions: [{ question: 'Q?', answer: 'A.' }],
        local_analysis: null,
        content_gap_analysis: null,
        local_comparison: null,
        serp_raw_json: null,
        fetched_at: new Date('2026-05-03T10:00:00Z'),
      }],
    })
    const result = await getKeywordMetrics('seo')
    expect(result).not.toBeNull()
    expect(result!.keyword).toBe('seo')
    expect(result!.cpc).toBe(1.23) // converted to number
    expect(result!.competition).toBe(0.5)
    expect(result!.intentRaw).toBe(0.8)
    expect(result!.autocompleteSuggestions).toEqual([{ text: 'seo', position: 1 }])
    expect(result!.fetchedAt).toBe('2026-05-03T10:00:00.000Z')
  })

  it('handles null KPI fields gracefully', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        keyword: 'rare',
        lang: 'fr',
        country: 'fr',
        search_volume: null,
        keyword_difficulty: null,
        cpc: null,
        competition: null,
        intent_raw: null,
        autocomplete_suggestions: null,
        autocomplete_source: null,
        paa_questions: null,
        local_analysis: null,
        content_gap_analysis: null,
        local_comparison: null,
        serp_raw_json: null,
        fetched_at: new Date(),
      }],
    })
    const result = await getKeywordMetrics('rare')
    expect(result!.cpc).toBeNull()
    expect(result!.competition).toBeNull()
    expect(result!.autocompleteSuggestions).toEqual([])
    expect(result!.paaQuestions).toEqual([])
  })

  it('uses default lang/country when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await getKeywordMetrics('test')
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['test', 'fr', 'fr'],
    )
  })

  it('respects custom lang/country', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await getKeywordMetrics('test', 'en', 'us')
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['test', 'en', 'us'],
    )
  })
})

describe('moteur:keyword-metrics:upsertKeywordKpis', () => {
  it('inserts KPIs with default lang/country', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await upsertKeywordKpis('seo', { searchVolume: 1000, keywordDifficulty: 50 })
    expect(mockQuery).toHaveBeenCalledTimes(1)
    const [, params] = mockQuery.mock.calls[0]!
    // Signature : keyword, lang, country, volume, KD, cpc, competition, intentRaw, intentLabel
    expect(params).toEqual(['seo', 'fr', 'fr', 1000, 50, null, null, null, null])
  })

  it('coalesces undefined KPIs to null in params', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await upsertKeywordKpis('seo', { cpc: 1.5 })
    const [, params] = mockQuery.mock.calls[0]!
    // Per signature : volume, KD, cpc, competition, intentRaw, intentLabel
    expect(params[3]).toBeNull()
    expect(params[4]).toBeNull()
    expect(params[5]).toBe(1.5)
    expect(params[8]).toBeNull() // intentLabel
  })

  it('persists intentLabel for the 5th Pertinence signal', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await upsertKeywordKpis('seo', { intentLabel: 'commercial' })
    const [sql, params] = mockQuery.mock.calls[0]!
    expect(sql).toContain('intent_label')
    expect(params[8]).toBe('commercial')
  })

  it('uses ON CONFLICT to upsert (idempotent)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await upsertKeywordKpis('seo', { searchVolume: 100 })
    const [sql] = mockQuery.mock.calls[0]!
    expect(sql).toContain('ON CONFLICT')
  })
})

describe('moteur:keyword-metrics:upsertKeywordAutocomplete', () => {
  it('serialises suggestions as JSON', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const suggestions = [{ text: 'seo audit', position: 1 }]
    await upsertKeywordAutocomplete('seo', suggestions, 'google')
    const [, params] = mockQuery.mock.calls[0]!
    expect(params[3]).toBe(JSON.stringify(suggestions))
    expect(params[4]).toBe('google')
  })
})

describe('moteur:keyword-metrics:upsertKeywordPaa', () => {
  it('serialises questions as JSON', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const questions = [{ question: 'Quoi?', answer: 'Cela.' }]
    await upsertKeywordPaa('seo', questions)
    const [, params] = mockQuery.mock.calls[0]!
    expect(params[3]).toBe(JSON.stringify(questions))
  })
})

describe('moteur:keyword-metrics:deleteKeywordMetrics', () => {
  it('issues DELETE with keyword/lang/country', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await deleteKeywordMetrics('seo', 'fr', 'fr')
    const [sql, params] = mockQuery.mock.calls[0]!
    expect(sql).toContain('DELETE FROM keyword_metrics')
    expect(params).toEqual(['seo', 'fr', 'fr'])
  })
})
