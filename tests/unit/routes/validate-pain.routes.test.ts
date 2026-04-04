// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockFetchKeywordOverviewBatch, mockFetchRelatedKeywords } = vi.hoisted(() => ({
  mockFetchKeywordOverviewBatch: vi.fn(),
  mockFetchRelatedKeywords: vi.fn(),
}))

const { mockFetchCommunityDiscussions } = vi.hoisted(() => ({
  mockFetchCommunityDiscussions: vi.fn(),
}))

const { mockFetchAutocomplete } = vi.hoisted(() => ({
  mockFetchAutocomplete: vi.fn(),
}))

vi.mock('../../../server/services/dataforseo.service', () => ({
  fetchKeywordOverviewBatch: mockFetchKeywordOverviewBatch,
  fetchRelatedKeywords: mockFetchRelatedKeywords,
  auditCocoonKeywords: vi.fn(),
  getAuditCacheStatus: vi.fn(),
  detectRedundancy: vi.fn(),
}))

vi.mock('../../../server/services/community-discussions.service', () => ({
  fetchCommunityDiscussions: mockFetchCommunityDiscussions,
}))

vi.mock('../../../server/services/autocomplete.service', () => ({
  fetchAutocomplete: mockFetchAutocomplete,
}))

vi.mock('../../../server/services/claude.service', () => ({
  streamChatCompletion: vi.fn(),
  USAGE_SENTINEL: '__USAGE__',
}))

vi.mock('../../../server/utils/prompt-loader', () => ({
  loadPrompt: vi.fn(),
}))

vi.mock('../../../server/utils/cache', () => ({
  readCached: vi.fn().mockResolvedValue(null),
  writeCached: vi.fn().mockResolvedValue(undefined),
  slugify: (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  isFresh: vi.fn().mockReturnValue(false),
}))

vi.mock('../../../server/services/data.service', () => ({
  getKeywordsByCocoon: vi.fn(),
  addKeyword: vi.fn(),
  replaceKeyword: vi.fn(),
  deleteKeyword: vi.fn(),
  updateKeywordStatus: vi.fn(),
  loadKeywordsDb: vi.fn(),
  getArticleKeywords: vi.fn(),
  saveArticleKeywords: vi.fn(),
}))

vi.mock('../../../server/services/keyword-discovery.service', () => ({
  discoverKeywords: vi.fn(),
  discoverFromDomain: vi.fn(),
}))

vi.mock('../../../server/services/keyword-assignment.service', () => ({
  previewMigration: vi.fn(),
  applyMigration: vi.fn(),
}))

const { default: router } = await import('../../../server/routes/keywords.routes')

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
  }
  return res
}

function findHandler(method: string, path: string) {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods[method],
  )
  return layer?.route?.stack[0]?.handle
}

// Helper: community signal
function makeCommunitySignal(count = 5) {
  return {
    discussionsCount: count,
    uniqueDomains: ['reddit.com', 'quora.com'],
    domainDiversity: 2,
    avgVotesCount: 15,
    freshness: 'recent',
    serpPosition: 4,
    topDiscussions: [],
  }
}

// Helper: autocomplete signal
function makeAutocompleteSignal(count = 5) {
  return {
    suggestionsCount: count,
    suggestions: ['a', 'b', 'c', 'd', 'e'].slice(0, count),
    hasKeyword: true,
    position: 1,
  }
}

describe('POST /keywords/validate-pain — multi-source', () => {
  const handler = findHandler('post', '/keywords/validate-pain')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('route exists', () => {
    expect(handler).toBeDefined()
  })

  it('returns 400 if keywords is missing', async () => {
    const req = { body: {} } as Request
    const res = createMockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'MISSING_PARAM' }),
      }),
    )
  })

  it('returns 400 if keywords is empty array', async () => {
    const req = { body: { keywords: [] } } as Request
    const res = createMockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('calls all 3 sources in parallel and returns enriched results', async () => {
    const overviewMap = new Map([
      ['seo toulouse', { searchVolume: 800, difficulty: 25, cpc: 4.5, competition: 0.6, monthlySearches: [] }],
    ])
    mockFetchKeywordOverviewBatch.mockResolvedValue(overviewMap)
    mockFetchRelatedKeywords.mockResolvedValue([{ keyword: 'r1' }, { keyword: 'r2' }])
    mockFetchCommunityDiscussions.mockResolvedValue(makeCommunitySignal(8))
    mockFetchAutocomplete.mockResolvedValue(makeAutocompleteSignal(5))

    const req = { body: { keywords: ['seo toulouse'] } } as Request
    const res = createMockRes()
    await handler(req, res)

    expect(mockFetchCommunityDiscussions).toHaveBeenCalledWith('seo toulouse')
    expect(mockFetchAutocomplete).toHaveBeenCalledWith('seo toulouse')
    expect(mockFetchRelatedKeywords).toHaveBeenCalledWith('seo toulouse')

    const result = res.json.mock.calls[0][0].data.results[0]
    expect(result.keyword).toBe('seo toulouse')
    expect(result.dataforseo).toEqual(expect.objectContaining({ searchVolume: 800, cpc: 4.5, relatedCount: 2 }))
    expect(result.community).toEqual(expect.objectContaining({ discussionsCount: 8 }))
    expect(result.autocomplete).toEqual(expect.objectContaining({ suggestionsCount: 5 }))
    expect(result.verdict).toBeDefined()
    expect(result.verdict.category).toBeDefined()
    expect(result.verdict.confidence).toBeGreaterThan(0)
    expect(result.verdict.sourcesAvailable).toBe(3)
  })

  it('returns null for a source that fails, others still OK', async () => {
    const overviewMap = new Map([
      ['test kw', { searchVolume: 100, difficulty: 20, cpc: 2.0, competition: 0.5, monthlySearches: [] }],
    ])
    mockFetchKeywordOverviewBatch.mockResolvedValue(overviewMap)
    mockFetchRelatedKeywords.mockResolvedValue([])
    mockFetchCommunityDiscussions.mockRejectedValue(new Error('API down'))
    mockFetchAutocomplete.mockResolvedValue(makeAutocompleteSignal(3))

    const req = { body: { keywords: ['test kw'] } } as Request
    const res = createMockRes()
    await handler(req, res)

    const result = res.json.mock.calls[0][0].data.results[0]
    expect(result.dataforseo).toBeDefined()
    expect(result.community).toBeNull()
    expect(result.autocomplete).toBeDefined()
    expect(result.verdict.sourcesAvailable).toBe(2)
  })

  it('handles all sources failing gracefully', async () => {
    mockFetchKeywordOverviewBatch.mockResolvedValue(new Map())
    mockFetchRelatedKeywords.mockRejectedValue(new Error('fail'))
    mockFetchCommunityDiscussions.mockRejectedValue(new Error('fail'))
    mockFetchAutocomplete.mockRejectedValue(new Error('fail'))

    const req = { body: { keywords: ['failing kw'] } } as Request
    const res = createMockRes()
    await handler(req, res)

    const result = res.json.mock.calls[0][0].data.results[0]
    expect(result.keyword).toBe('failing kw')
    expect(result.dataforseo).toEqual(expect.objectContaining({ searchVolume: 0, cpc: 0, relatedCount: 0 }))
    expect(result.community).toBeNull()
    expect(result.autocomplete).toBeNull()
    expect(result.verdict.sourcesAvailable).toBe(1)
  })

  it('returns response with correct structure matching schema', async () => {
    const overviewMap = new Map([
      ['plombier toulouse', { searchVolume: 500, difficulty: 30, cpc: 5.0, competition: 0.7, monthlySearches: [] }],
    ])
    mockFetchKeywordOverviewBatch.mockResolvedValue(overviewMap)
    mockFetchRelatedKeywords.mockResolvedValue([{ keyword: 'r1' }])
    mockFetchCommunityDiscussions.mockResolvedValue(makeCommunitySignal())
    mockFetchAutocomplete.mockResolvedValue(makeAutocompleteSignal())

    const req = { body: { keywords: ['plombier toulouse'] } } as Request
    const res = createMockRes()
    await handler(req, res)

    const responseData = res.json.mock.calls[0][0].data
    expect(responseData.results).toHaveLength(1)

    const result = responseData.results[0]
    expect(result).toHaveProperty('keyword')
    expect(result).toHaveProperty('dataforseo')
    expect(result).toHaveProperty('community')
    expect(result).toHaveProperty('autocomplete')
    expect(result).toHaveProperty('verdict')
    expect(result.verdict).toHaveProperty('category')
    expect(result.verdict).toHaveProperty('confidence')
    expect(result.verdict).toHaveProperty('sourcesAvailable')

    const validCategories = ['brulante', 'confirmee', 'emergente', 'latente', 'froide', 'incertaine']
    expect(validCategories).toContain(result.verdict.category)
  })

  it('returns 500 on internal error', async () => {
    mockFetchKeywordOverviewBatch.mockRejectedValue(new Error('Connection refused'))

    const req = { body: { keywords: ['seo toulouse'] } } as Request
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      }),
    )
  })
})
