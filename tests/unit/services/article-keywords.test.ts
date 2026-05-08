import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the pg pool
const mockQuery = vi.fn()
vi.mock('../../../server/db/client', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}))

// Mock logger
vi.mock('../../../server/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

beforeEach(() => {
  vi.resetModules()
  mockQuery.mockReset()
})

async function importService() {
  return await import('../../../server/services/infra/data.service')
}

describe('data.service — getArticleKeywords', () => {
  it('returns null when article id is not found', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
    const { getArticleKeywords } = await importService()

    const result = await getArticleKeywords(99)
    expect(result.data).toBeNull()
  })

  it('returns matching entry for existing id', async () => {
    // 1st call: article_keywords
    mockQuery.mockResolvedValueOnce({
      rows: [{
        article_id: 1,
        capitaine: 'mot clef principal',
        lieutenants: ['lieutenant 1', 'lieutenant 2'],
        lexique: ['lsi 1', 'lsi 2', 'lsi 3'],
        hn_structure: [],
        root_keywords: [],
        captain_locked_at: null,
      }],
      rowCount: 1,
    })
    // 2nd call: captain_explorations (JOIN keyword_metrics)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // 3rd call: paa_explorations
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // 4th call: radar_explorations (hydratation marketScore/relevanceScore)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // 5th call: lieutenant_explorations
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const { getArticleKeywords } = await importService()
    const { data: result } = await getArticleKeywords(1)

    expect(result).not.toBeNull()
    expect(result!.articleId).toBe(1)
    expect(result!.capitaine).toBe('mot clef principal')
    expect(result!.lieutenants).toEqual(['lieutenant 1', 'lieutenant 2'])
    expect(result!.lexique).toEqual(['lsi 1', 'lsi 2', 'lsi 3'])
  })

  it('hydrates richCaptain from captain_explorations', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        article_id: 1,
        capitaine: 'captain kw',
        lieutenants: [],
        lexique: [],
        hn_structure: [],
        root_keywords: [],
        captain_locked_at: new Date('2026-01-01'),
      }],
      rowCount: 1,
    })
    // captain_explorations with 2 entries (avec colonnes keyword_metrics jointes)
    mockQuery.mockResolvedValueOnce({
      rows: [
        { keyword: 'captain kw', article_level: 'pilier', status: 'locked', root_keywords: [], ai_panel_markdown: '## Analysis', explored_at: new Date(), locked_at: null, search_volume: 1000, keyword_difficulty: 30, cpc: 1.5, competition: 0.4, intent_raw: 0.6, autocomplete_suggestions: [], metrics_fetched_at: new Date() },
        { keyword: 'other kw', article_level: 'pilier', status: 'tested', root_keywords: [], ai_panel_markdown: null, explored_at: new Date(), locked_at: null, search_volume: 500, keyword_difficulty: 25, cpc: 0.8, competition: 0.3, intent_raw: 0.5, autocomplete_suggestions: [], metrics_fetched_at: new Date() },
      ],
      rowCount: 2,
    })
    // paa_explorations empty
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // radar_explorations empty (hydrate scores)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // lieutenant_explorations empty
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const { getArticleKeywords } = await importService()
    const { data: result } = await getArticleKeywords(1)

    expect(result!.richCaptain).toBeDefined()
    expect(result!.richCaptain!.keyword).toBe('captain kw')
    expect(result!.richCaptain!.status).toBe('locked')
    expect(result!.richCaptain!.exploredKeywords).toHaveLength(2)
    expect(result!.richCaptain!.aiPanelMarkdown).toBe('## Analysis')
  })

  it('hydrates richLieutenants from lieutenant_explorations', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        article_id: 1,
        capitaine: 'captain',
        lieutenants: ['lt1'],
        lexique: [],
        hn_structure: [],
        root_keywords: [],
        captain_locked_at: null,
      }],
      rowCount: 1,
    })
    // captain_explorations empty
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // paa_explorations empty
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // radar_explorations empty
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // lieutenant_explorations with data
    mockQuery.mockResolvedValueOnce({
      rows: [
        { keyword: 'lt1', status: 'locked', reasoning: 'good fit', sources: ['paa'], suggested_hn_level: 2, score: 85, kpis: null, locked_at: null },
      ],
      rowCount: 1,
    })

    const { getArticleKeywords } = await importService()
    const { data: result } = await getArticleKeywords(1)

    expect(result!.richLieutenants).toHaveLength(1)
    expect(result!.richLieutenants![0].keyword).toBe('lt1')
    expect(result!.richLieutenants![0].score).toBe(85)
  })
})

describe('data.service — saveArticleKeywords', () => {
  it('creates new entry and writes to article_keywords only', async () => {
    // 2026-05-07 Option A — saveArticleKeywords lit d'abord l'etat existant
    // pour preserver les champs non-fournis (3 calls au lieu de 2).
    // SELECT existing
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // article_keywords UPSERT
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
    // updateArticleCaptainKeyword
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const { saveArticleKeywords } = await importService()
    const result = await saveArticleKeywords(1, {
      capitaine: 'main keyword',
      lieutenants: ['lt1'],
      lexique: ['lsi1', 'lsi2'],
    })

    expect(result.articleId).toBe(1)
    expect(result.capitaine).toBe('main keyword')
    expect(result.lieutenants).toEqual(['lt1'])
    expect(result.lexique).toEqual(['lsi1', 'lsi2'])
    // First call = SELECT existing, second = article_keywords UPSERT
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT')
    expect(mockQuery.mock.calls[1][0]).toContain('article_keywords')
    // 3 calls total: SELECT + UPSERT + mirror
    expect(mockQuery.mock.calls).toHaveLength(3)
  })

  it('does not write to exploration tables (decision only)', async () => {
    // SELECT existing (Option A preserve)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    // article_keywords UPSERT
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
    // updateArticleCaptainKeyword
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })

    const { saveArticleKeywords } = await importService()
    await saveArticleKeywords(1, {
      capitaine: 'captain kw',
      lieutenants: [],
      lexique: [],
    })

    // 3 calls: SELECT + article_keywords + mirror. No exploration table writes.
    expect(mockQuery.mock.calls).toHaveLength(3)
    expect(mockQuery.mock.calls[1][0]).toContain('article_keywords')
    // No captain_explorations or lieutenant_explorations calls
    const allQueries = mockQuery.mock.calls.map(c => c[0] as string)
    expect(allQueries.every(q => !q.includes('captain_explorations') && !q.includes('lieutenant_explorations'))).toBe(true)
  })
})

describe('data.service — saveCaptainExploration', () => {
  it('upserts into captain_explorations', async () => {
    // captain_explorations UPSERT
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const { saveCaptainExploration } = await importService()
    await saveCaptainExploration(1, {
      keyword: 'test kw',
      kpis: [{ name: 'volume', rawValue: 500 }],
      articleLevel: 'intermediaire',
      rootKeywords: ['test'],
    })

    expect(mockQuery.mock.calls[0][0]).toContain('captain_explorations')
  })

  it('upserts PAA questions into paa_explorations', async () => {
    // captain_explorations UPSERT
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
    // paa_explorations UPSERT
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const { saveCaptainExploration } = await importService()
    await saveCaptainExploration(1, {
      keyword: 'test kw',
      kpis: [],
      articleLevel: 'pilier',
      rootKeywords: [],
      paaQuestions: [
        { question: 'What is SEO?', answer: 'SEO is...', match: 'total', matchQuality: 'exact' },
      ],
    })

    const allQueries = mockQuery.mock.calls.map(c => c[0] as string)
    expect(allQueries.some(q => q.includes('paa_explorations'))).toBe(true)
  })
})

describe('data.service — saveLieutenantExplorations', () => {
  it('upserts into lieutenant_explorations with status protection', async () => {
    // lieutenant_explorations UPSERT
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

    const { saveLieutenantExplorations } = await importService()
    await saveLieutenantExplorations(1, [
      { keyword: 'lt1', status: 'suggested', reasoning: 'good', sources: ['paa'], suggestedHnLevel: 2, score: 85, kpis: null },
    ], 'captain kw')

    expect(mockQuery.mock.calls[0][0]).toContain('lieutenant_explorations')
    expect(mockQuery.mock.calls[0][0]).toContain('CASE WHEN')
  })
})

describe('data.service — getArticleKeywordsByCocoon', () => {
  it('filters article keywords by cocoon articles', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { article_id: 1, capitaine: 'kw1', lieutenants: [], lexique: [], hn_structure: [], root_keywords: [] },
        { article_id: 2, capitaine: 'kw2', lieutenants: [], lexique: [], hn_structure: [], root_keywords: [] },
      ],
      rowCount: 2,
    })

    const { getArticleKeywordsByCocoon } = await importService()
    const result = await getArticleKeywordsByCocoon('Cocoon A')

    expect(result).toHaveLength(2)
    expect(result.map(ak => ak.articleId)).toEqual([1, 2])
  })

  it('returns empty array for non-existent cocoon', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const { getArticleKeywordsByCocoon } = await importService()

    const result = await getArticleKeywordsByCocoon('Non-existent Cocoon')
    expect(result).toEqual([])
  })
})
