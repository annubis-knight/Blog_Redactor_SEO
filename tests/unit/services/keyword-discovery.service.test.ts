import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dataforseo.service before importing
vi.mock('../../../server/services/dataforseo.service', () => ({
  fetchDataForSeo: vi.fn(),
  fetchKeywordOverviewBatch: vi.fn(),
  fetchSearchIntentBatch: vi.fn(),
  computeCompositeScore: vi.fn(),
}))

// Mock data.service
vi.mock('../../../server/services/data.service', () => ({
  getKeywordsByCocoon: vi.fn(),
}))

import {
  fetchDataForSeo,
  fetchKeywordOverviewBatch,
  fetchSearchIntentBatch,
  computeCompositeScore,
} from '../../../server/services/dataforseo.service'
import {
  classifyKeywordsRelative,
  discoverKeywords,
  discoverFromDomain,
} from '../../../server/services/keyword-discovery.service'

const mockFetchDataForSeo = vi.mocked(fetchDataForSeo)
const mockFetchOverviewBatch = vi.mocked(fetchKeywordOverviewBatch)
const mockFetchIntentBatch = vi.mocked(fetchSearchIntentBatch)
const mockComputeScore = vi.mocked(computeCompositeScore)

beforeEach(() => {
  vi.resetAllMocks()
  mockComputeScore.mockReturnValue({
    volume: 50, difficultyInverse: 70, cpc: 30, competitionInverse: 70, total: 55,
  })
})

describe('keyword-discovery.service — classifyKeywordsRelative', () => {
  it('classifies top volume keywords as Pilier', () => {
    // 10 keywords: top 15% (index 1) = Pilier threshold at volume 5000
    const keywords = [
      { searchVolume: 10000, wordsCount: 1 },
      { searchVolume: 5000, wordsCount: 2 },
      { searchVolume: 3000, wordsCount: 2 },
      { searchVolume: 2000, wordsCount: 3 },
      { searchVolume: 1000, wordsCount: 3 },
      { searchVolume: 500, wordsCount: 3 },
      { searchVolume: 300, wordsCount: 4 },
      { searchVolume: 200, wordsCount: 4 },
      { searchVolume: 100, wordsCount: 5 },
      { searchVolume: 50, wordsCount: 6 },
    ]
    const types = classifyKeywordsRelative(keywords)
    expect(types[0]).toBe('Pilier')   // 10000 vol, 1 word
    expect(types[1]).toBe('Pilier')   // 5000 vol, 2 words
  })

  it('classifies mid-range keywords as Moyenne traine', () => {
    const keywords = [
      { searchVolume: 10000, wordsCount: 1 },
      { searchVolume: 5000, wordsCount: 2 },
      { searchVolume: 3000, wordsCount: 2 },
      { searchVolume: 2000, wordsCount: 3 },
      { searchVolume: 1000, wordsCount: 3 },
      { searchVolume: 500, wordsCount: 3 },
      { searchVolume: 300, wordsCount: 4 },
      { searchVolume: 200, wordsCount: 4 },
      { searchVolume: 100, wordsCount: 5 },
      { searchVolume: 50, wordsCount: 6 },
    ]
    const types = classifyKeywordsRelative(keywords)
    expect(types[2]).toBe('Moyenne traine') // 3000 vol, 2 words
    expect(types[3]).toBe('Moyenne traine') // 2000 vol, 3 words
    expect(types[4]).toBe('Moyenne traine') // 1000 vol, 3 words
  })

  it('classifies low volume / many words as Longue traine', () => {
    const keywords = [
      { searchVolume: 10000, wordsCount: 1 },
      { searchVolume: 5000, wordsCount: 2 },
      { searchVolume: 3000, wordsCount: 2 },
      { searchVolume: 2000, wordsCount: 3 },
      { searchVolume: 1000, wordsCount: 3 },
      { searchVolume: 500, wordsCount: 3 },
      { searchVolume: 300, wordsCount: 4 },
      { searchVolume: 200, wordsCount: 4 },
      { searchVolume: 100, wordsCount: 5 },
      { searchVolume: 50, wordsCount: 6 },
    ]
    const types = classifyKeywordsRelative(keywords)
    expect(types[8]).toBe('Longue traine')  // 100 vol, 5 words
    expect(types[9]).toBe('Longue traine')  // 50 vol, 6 words
  })

  it('demotes high volume keywords with too many words', () => {
    const keywords = [
      { searchVolume: 10000, wordsCount: 5 }, // High vol but 5 words → Moyenne
      { searchVolume: 5000, wordsCount: 2 },
      { searchVolume: 1000, wordsCount: 3 },
      { searchVolume: 100, wordsCount: 4 },
    ]
    const types = classifyKeywordsRelative(keywords)
    expect(types[0]).toBe('Moyenne traine') // demoted from Pilier due to word count
  })

  it('returns empty array for empty input', () => {
    expect(classifyKeywordsRelative([])).toEqual([])
  })
})

describe('keyword-discovery.service — discoverKeywords', () => {
  it('fetches from 3 sources and returns classified keywords', async () => {
    // Mock 3 parallel fetches: suggestions, related, ideas
    mockFetchDataForSeo
      .mockResolvedValueOnce({ items: [{ keyword: 'seo tips' }, { keyword: 'seo guide' }] }) // suggestions
      .mockResolvedValueOnce({ items: [{ keyword_data: { keyword: 'seo' }, related_keywords: [{ keyword: 'search optimization', keyword_info: {} }] }] }) // related
      .mockResolvedValueOnce({ items: [{ keyword: 'seo for beginners' }] }) // ideas

    // Mock batch enrichment
    const overviewMap = new Map([
      ['seo tips', { searchVolume: 1000, difficulty: 30, cpc: 1.5, competition: 0.3, monthlySearches: [], wordsCount: 2 }],
      ['seo guide', { searchVolume: 800, difficulty: 25, cpc: 1.0, competition: 0.2, monthlySearches: [], wordsCount: 2 }],
      ['search optimization', { searchVolume: 500, difficulty: 40, cpc: 2.0, competition: 0.5, monthlySearches: [], wordsCount: 2 }],
      ['seo for beginners', { searchVolume: 300, difficulty: 15, cpc: 0.5, competition: 0.1, monthlySearches: [], wordsCount: 3 }],
    ])
    mockFetchOverviewBatch.mockResolvedValue(overviewMap)

    const intentMap = new Map([
      ['seo tips', { intent: 'informational', intentProbability: 0.9 }],
      ['seo guide', { intent: 'informational', intentProbability: 0.85 }],
      ['search optimization', { intent: 'informational', intentProbability: 0.8 }],
      ['seo for beginners', { intent: 'informational', intentProbability: 0.95 }],
    ])
    mockFetchIntentBatch.mockResolvedValue(intentMap)

    const result = await discoverKeywords('seo')

    expect(result.seed).toBe('seo')
    expect(result.keywords.length).toBeGreaterThan(0)
    expect(result.totalBeforeDedup).toBe(4)
    expect(result.apiCost).toBeGreaterThan(0)

    // Check first keyword is classified
    const first = result.keywords[0]
    expect(first.keyword).toBeDefined()
    expect(first.type).toBeDefined()
    expect(first.compositeScore).toBeDefined()
    expect(first.source).toBeDefined()
  })

  it('returns empty keywords when all endpoints fail', async () => {
    mockFetchDataForSeo
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))

    mockFetchOverviewBatch.mockResolvedValue(new Map())
    mockFetchIntentBatch.mockResolvedValue(new Map())

    const result = await discoverKeywords('test')
    expect(result.keywords).toHaveLength(0)
    expect(result.totalBeforeDedup).toBe(0)
  })

  it('deduplicates keywords from multiple sources', async () => {
    // Same keyword from two sources
    mockFetchDataForSeo
      .mockResolvedValueOnce({ items: [{ keyword: 'web design' }] }) // suggestions
      .mockResolvedValueOnce({ items: [{ keyword_data: { keyword: 'test' }, related_keywords: [{ keyword: 'Web Design', keyword_info: {} }] }] }) // related (same, different case)
      .mockResolvedValueOnce({ items: [] }) // ideas

    const overviewMap = new Map([
      ['web design', { searchVolume: 5000, difficulty: 50, cpc: 3.0, competition: 0.6, monthlySearches: [], wordsCount: 2 }],
    ])
    mockFetchOverviewBatch.mockResolvedValue(overviewMap)
    mockFetchIntentBatch.mockResolvedValue(new Map())

    const result = await discoverKeywords('design')
    expect(result.totalBeforeDedup).toBe(2)
    expect(result.totalAfterDedup).toBe(1) // Deduplicated
    expect(result.keywords).toHaveLength(1)
  })
})

describe('keyword-discovery.service — discoverFromDomain', () => {
  it('fetches keywords for a domain and classifies them', async () => {
    mockFetchDataForSeo.mockResolvedValueOnce({
      items: [
        { keyword: 'competitor product', keyword_info: { search_volume: 2000, competition: 0.4, cpc: 1.5 } },
        { keyword: 'competitor service', keyword_info: { search_volume: 1000, competition: 0.3, cpc: 1.0 } },
      ],
    })

    const overviewMap = new Map([
      ['competitor product', { searchVolume: 2000, difficulty: 35, cpc: 1.5, competition: 0.4, monthlySearches: [], wordsCount: 2 }],
      ['competitor service', { searchVolume: 1000, difficulty: 25, cpc: 1.0, competition: 0.3, monthlySearches: [], wordsCount: 2 }],
    ])
    mockFetchOverviewBatch.mockResolvedValue(overviewMap)
    mockFetchIntentBatch.mockResolvedValue(new Map())

    const result = await discoverFromDomain('competitor.com', undefined, ['competitor product'])

    expect(result.domain).toBe('competitor.com')
    expect(result.keywords.length).toBeGreaterThan(0)
    // competitor product should be marked as existing
    const existing = result.keywords.find(k => k.keyword === 'competitor product')
    expect(existing?.existsInCocoon).toBe(true)
    const notExisting = result.keywords.find(k => k.keyword === 'competitor service')
    expect(notExisting?.existsInCocoon).toBe(false)
  })

  it('handles empty response from site', async () => {
    mockFetchDataForSeo.mockResolvedValueOnce({ items: null })
    mockFetchOverviewBatch.mockResolvedValue(new Map())
    mockFetchIntentBatch.mockResolvedValue(new Map())

    const result = await discoverFromDomain('empty.com')
    expect(result.keywords).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})
