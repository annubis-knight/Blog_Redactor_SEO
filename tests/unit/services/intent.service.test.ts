import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// --- Mocks ---

vi.mock('../../../server/utils/json-storage', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
}))

const mockClaudeCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: '{"type":"transactional_local","confidence":0.85,"reasoning":"Local pack present"}' }],
  usage: { input_tokens: 100, output_tokens: 50 },
})

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockClaudeCreate }
      constructor(_opts?: unknown) {}
    },
  }
})

import { readJson, writeJson } from '../../../server/utils/json-storage'
import { analyzeIntent, compareLocalNational, validateAutocomplete } from '../../../server/services/intent.service'
import type { IntentAnalysis, LocalNationalComparison, AutocompleteResult } from '../../../shared/types/index'

const mockReadJson = readJson as Mock
const mockWriteJson = writeJson as Mock

// --- Helpers ---

const mockFetch = vi.fn()

function makeDfsResponse(result: unknown, statusCode = 20000) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      tasks: [{ status_code: statusCode, status_message: 'Ok.', result: [result] }],
    }),
  }
}

function makeSerpResult(itemTypes: string[]) {
  return {
    items: itemTypes.map((type, idx) => ({
      type,
      rank_absolute: idx + 1,
      title: `Title ${idx}`,
      url: `https://example.com/${idx}`,
      description: `Description ${idx}`,
      domain: 'example.com',
    })),
  }
}

function makeKwOverviewResult(volume: number, kd: number, cpc = 0.5, competition = 0.3) {
  return {
    items: [{
      keyword_info: {
        search_volume: volume,
        keyword_difficulty: kd,
        cpc,
        competition,
        monthly_searches: [{ search_volume: volume }, { search_volume: volume - 10 }],
      },
    }],
  }
}

function makeAutocompleteResult(suggestions: string[]) {
  return {
    items: suggestions.map(s => ({ suggestion: s })),
  }
}

function makeCachedIntentAnalysis(keyword: string): IntentAnalysis {
  return {
    keyword,
    modules: [],
    scores: [],
    dominantIntent: 'informational',
    classification: { type: 'informational', confidence: 0.9, reasoning: 'cached' },
    recommendations: [],
    topOrganicResults: [],
    paaQuestions: [],
    cachedAt: '2026-03-01T00:00:00.000Z',
  }
}

function makeCachedComparison(keyword: string): LocalNationalComparison {
  return {
    keyword,
    local: { searchVolume: 100, keywordDifficulty: 20, cpc: 0.5, competition: 0.3, monthlySearches: [] },
    national: { searchVolume: 5000, keywordDifficulty: 60, cpc: 1.2, competition: 0.7, monthlySearches: [] },
    opportunityIndex: 133,
    alert: null,
    cachedAt: '2026-03-01T00:00:00.000Z',
  }
}

function makeCachedAutocomplete(keyword: string): AutocompleteResult {
  return {
    keyword,
    suggestions: [{ keyword: 'plombier toulouse', type: 'autocomplete', searchVolume: null }],
    validated: true,
    certaintyIndex: { autocompleteExists: 1, volumeNormalized: 0, serpDensity: 0, total: 0.4 },
    cachedAt: '2026-03-01T00:00:00.000Z',
  }
}

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
  vi.stubEnv('DATAFORSEO_LOGIN', 'test-login')
  vi.stubEnv('DATAFORSEO_PASSWORD', 'test-password')
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key')
  vi.stubEnv('DATAFORSEO_SANDBOX', 'true')
  mockWriteJson.mockResolvedValue(undefined)
})

// ============================================================
// analyzeIntent
// ============================================================

describe('analyzeIntent', () => {
  it('returns cached result on cache hit', async () => {
    const cached = makeCachedIntentAnalysis('plombier toulouse')
    mockReadJson.mockResolvedValueOnce({ data: cached, cachedAt: cached.cachedAt })

    const result = await analyzeIntent('plombier toulouse')

    expect(result).toEqual(cached)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls SERP Advanced + Claude on cache miss and caches result', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    const serpResult = makeSerpResult(['local_pack', 'organic', 'people_also_ask', 'organic'])
    mockFetch.mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await analyzeIntent('plombier toulouse')

    // Verify SERP Advanced was called
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/serp/google/organic/live/advanced')
    expect(JSON.parse(opts.body)[0].keyword).toBe('plombier toulouse')

    // Verify classification from Claude mock
    expect(result.dominantIntent).toBe('transactional_local')
    expect(result.classification.confidence).toBe(0.85)
    expect(result.keyword).toBe('plombier toulouse')

    // Verify cache write (CacheEntry format: { data: ..., cachedAt: ... })
    expect(mockWriteJson).toHaveBeenCalledTimes(1)
    expect(mockWriteJson.mock.calls[0][1].data.keyword).toBe('plombier toulouse')
  })

  it('extracts SERP modules correctly', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    const serpResult = makeSerpResult([
      'local_pack', 'featured_snippet', 'organic', 'video', 'images', 'organic',
    ])
    mockFetch.mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await analyzeIntent('test keyword')

    const presentModules = result.modules.filter(m => m.present).map(m => m.type)
    expect(presentModules).toContain('local_pack')
    expect(presentModules).toContain('featured_snippet')
    expect(presentModules).toContain('video')
    expect(presentModules).toContain('images')
    expect(presentModules).not.toContain('shopping')
    expect(presentModules).not.toContain('knowledge_graph')

    // Verify all 8 module types are represented
    expect(result.modules).toHaveLength(8)
  })

  it('extracts top organic results (max 5)', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    const serpResult = makeSerpResult([
      'organic', 'organic', 'organic', 'organic', 'organic', 'organic', 'organic',
    ])
    mockFetch.mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await analyzeIntent('test keyword')

    expect(result.topOrganicResults).toHaveLength(5)
    expect(result.topOrganicResults[0].domain).toBe('example.com')
  })

  it('generates scores and recommendations for present modules', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    const serpResult = makeSerpResult(['local_pack', 'people_also_ask', 'organic'])
    mockFetch.mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await analyzeIntent('test keyword')

    // Scores for present modules + organic density base
    expect(result.scores).toHaveLength(3) // local_pack + people_also_ask + organic density
    expect(result.scores.find(s => s.category === 'Local')).toBeTruthy()
    expect(result.scores.find(s => s.category === 'Informationnel')).toBeTruthy()
    expect(result.scores.find(s => s.category === 'Résultats organiques')).toBeTruthy()

    // Recommendations for present modules
    expect(result.recommendations).toHaveLength(2)
    expect(result.recommendations.find(r => r.module === 'local_pack')?.priority).toBe('high')
  })

  it('falls back to module-based classification when Claude returns invalid JSON', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    // Override Claude to return invalid JSON for this test
    mockClaudeCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'NOT VALID JSON' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    })

    const serpResult = makeSerpResult(['local_pack', 'organic'])
    mockFetch.mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await analyzeIntent('plombier toulouse')

    // Fallback: local_pack present => transactional_local
    expect(result.dominantIntent).toBe('transactional_local')
    expect(result.classification.confidence).toBe(0.3)
    expect(result.classification.reasoning).toContain('par défaut')
  })

  it('falls back to informational when Claude returns invalid JSON and no local_pack', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    mockClaudeCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '---broken---' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    })

    const serpResult = makeSerpResult(['featured_snippet', 'organic'])
    mockFetch.mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await analyzeIntent('comment reparer un robinet')

    expect(result.dominantIntent).toBe('informational')
    expect(result.classification.confidence).toBe(0.3)
  })
})

// ============================================================
// compareLocalNational
// ============================================================

describe('compareLocalNational', () => {
  it('returns cached result on cache hit', async () => {
    const cached = makeCachedComparison('plombier toulouse')
    mockReadJson.mockResolvedValueOnce({ data: cached, cachedAt: cached.cachedAt })

    const result = await compareLocalNational('plombier toulouse')

    expect(result).toEqual(cached)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('makes parallel requests for national and local keyword overview', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    const nationalResult = makeKwOverviewResult(5000, 60, 1.2, 0.7)
    const localResult = makeKwOverviewResult(200, 25, 0.4, 0.2)

    mockFetch
      .mockResolvedValueOnce(makeDfsResponse(nationalResult))
      .mockResolvedValueOnce(makeDfsResponse(localResult))

    const result = await compareLocalNational('plombier toulouse')

    expect(mockFetch).toHaveBeenCalledTimes(2)

    // In sandbox mode (DATAFORSEO_SANDBOX=true), both calls use 2250
    // In production they would use 2742 (France) and 1006157 (Toulouse)
    const body0 = JSON.parse(mockFetch.mock.calls[0][1].body)
    const body1 = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(body0[0].location_code).toBe(2250)
    expect(body1[0].location_code).toBe(2250)

    expect(result.keyword).toBe('plombier toulouse')
    expect(result.national.searchVolume).toBe(5000)
    expect(result.local.searchVolume).toBe(200)
  })

  it('calculates opportunity index correctly', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    // local volume=200, local KD=25, national KD=60
    // opportunityIndex = round((200 * (100 - 25)) / 60) = round(15000 / 60) = 250
    const nationalResult = makeKwOverviewResult(5000, 60)
    const localResult = makeKwOverviewResult(200, 25)

    mockFetch
      .mockResolvedValueOnce(makeDfsResponse(nationalResult))
      .mockResolvedValueOnce(makeDfsResponse(localResult))

    const result = await compareLocalNational('plombier toulouse')

    expect(result.opportunityIndex).toBe(250)
    expect(mockWriteJson).toHaveBeenCalledTimes(1)
  })

  it('generates alert when opportunity index >= threshold', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))
    vi.stubEnv('LOCAL_OPPORTUNITY_THRESHOLD', '60')

    // opportunityIndex = round((200 * 75) / 60) = 250 >= 60
    const nationalResult = makeKwOverviewResult(5000, 60)
    const localResult = makeKwOverviewResult(200, 25)

    mockFetch
      .mockResolvedValueOnce(makeDfsResponse(nationalResult))
      .mockResolvedValueOnce(makeDfsResponse(localResult))

    const result = await compareLocalNational('plombier toulouse')

    expect(result.alert).not.toBeNull()
    expect(result.alert!.type).toBe('opportunity')
    expect(result.alert!.index).toBe(250)
    expect(result.alert!.message).toContain('opportunité locale')
  })

  it('does not generate alert when opportunity index < threshold', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))
    vi.stubEnv('LOCAL_OPPORTUNITY_THRESHOLD', '500')

    // opportunityIndex = round((10 * (100 - 80)) / 90) = round(200 / 90) = 2
    const nationalResult = makeKwOverviewResult(50000, 90)
    const localResult = makeKwOverviewResult(10, 80)

    mockFetch
      .mockResolvedValueOnce(makeDfsResponse(nationalResult))
      .mockResolvedValueOnce(makeDfsResponse(localResult))

    const result = await compareLocalNational('javascript tutorial')

    expect(result.opportunityIndex).toBe(2)
    expect(result.alert).toBeNull()
  })
})

// ============================================================
// validateAutocomplete
// ============================================================

describe('validateAutocomplete', () => {
  it('returns cached result on cache hit', async () => {
    const cached = makeCachedAutocomplete('plombier toulouse')
    mockReadJson.mockResolvedValueOnce({ data: cached, cachedAt: cached.cachedAt })

    const result = await validateAutocomplete('plombier toulouse')

    expect(result).toEqual(cached)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches autocomplete and validates keyword existence', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    const autocompleteItems = makeAutocompleteResult([
      'plombier toulouse', 'plombier toulouse pas cher', 'plombier toulouse urgence',
    ])
    const volumeResult = makeKwOverviewResult(300, 25)
    const serpResult = makeSerpResult(['organic', 'organic'])

    mockFetch
      .mockResolvedValueOnce(makeDfsResponse(autocompleteItems))
      .mockResolvedValueOnce(makeDfsResponse(volumeResult))
      .mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await validateAutocomplete('plombier toulouse')

    expect(result.validated).toBe(true)
    expect(result.suggestions).toHaveLength(3)
    expect(result.certaintyIndex.autocompleteExists).toBe(1)
    // total includes volume and serp now
    expect(result.certaintyIndex.total).toBeGreaterThanOrEqual(0.4)
  })

  it('returns validated=false when keyword is not in autocomplete results', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    // Use suggestions with NO word overlap with "consultant seo toulouse"
    const autocompleteItems = makeAutocompleteResult([
      'avocat divorce paris', 'restaurant gastronomique lyon', 'dentiste urgence marseille',
    ])
    const volumeResult = makeKwOverviewResult(0, 0)
    const serpResult = makeSerpResult([])

    mockFetch
      .mockResolvedValueOnce(makeDfsResponse(autocompleteItems))
      .mockResolvedValueOnce(makeDfsResponse(volumeResult))
      .mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await validateAutocomplete('consultant seo toulouse')

    expect(result.validated).toBe(false)
    expect(result.certaintyIndex.autocompleteExists).toBe(0)
    // With 0 volume and 0 serp density, total should be 0
    expect(result.certaintyIndex.total).toBe(0)
  })

  it('fetches autocomplete for prefixes and deduplicates suggestions', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    // Main keyword fetch
    const mainResult = makeAutocompleteResult([
      'plombier toulouse', 'plombier toulouse avis',
    ])
    // Prefix fetch with a duplicate
    const prefixResult = makeAutocompleteResult([
      'plombier toulouse', 'plombier toulouse tarif', 'plombier toulouse centre',
    ])
    // Volume enrichment (keyword overview)
    const volumeResult = makeKwOverviewResult(200, 30)
    // SERP density enrichment
    const serpResult = makeSerpResult(['organic', 'organic', 'organic'])

    mockFetch
      .mockResolvedValueOnce(makeDfsResponse(mainResult))
      .mockResolvedValueOnce(makeDfsResponse(prefixResult))
      .mockResolvedValueOnce(makeDfsResponse(volumeResult))
      .mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await validateAutocomplete('plombier toulouse', ['plombier toulouse '])

    expect(mockFetch).toHaveBeenCalledTimes(4) // 2 autocomplete + 1 volume + 1 SERP
    // 'plombier toulouse' appears in both but should be deduplicated
    const keywords = result.suggestions.map(s => s.keyword)
    const uniqueCount = new Set(keywords.map(k => k.toLowerCase())).size
    expect(keywords).toHaveLength(uniqueCount) // no duplicates
    expect(keywords).toHaveLength(4) // plombier toulouse + avis + tarif + centre
  })

  it('calculates certainty index with all three dimensions', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    const autocompleteItems = makeAutocompleteResult([
      'plombier toulouse urgence',
    ])
    // Volume enrichment: 500 searches → normalized 0.5
    const volumeResult = makeKwOverviewResult(500, 30)
    // SERP enrichment: 5 organic results → density 0.5
    const serpResult = makeSerpResult(['organic', 'organic', 'organic', 'organic', 'organic'])

    mockFetch
      .mockResolvedValueOnce(makeDfsResponse(autocompleteItems))
      .mockResolvedValueOnce(makeDfsResponse(volumeResult))
      .mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await validateAutocomplete('plombier toulouse')

    // 'plombier toulouse' is included in 'plombier toulouse urgence' => validated
    expect(result.validated).toBe(true)
    expect(result.certaintyIndex.autocompleteExists).toBe(1)
    expect(result.certaintyIndex.volumeNormalized).toBeCloseTo(0.5, 1)
    expect(result.certaintyIndex.serpDensity).toBeCloseTo(0.5, 1)
    // total = 0.4 (autocomplete) + 0.5*0.3 (volume) + 0.5*0.3 (serp) = 0.7
    expect(result.certaintyIndex.total).toBeCloseTo(0.7, 1)
  })

  it('limits suggestions to 20 items', async () => {
    mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

    const manySuggestions = Array.from({ length: 30 }, (_, i) => `suggestion ${i}`)
    const autocompleteItems = makeAutocompleteResult(manySuggestions)
    const volumeResult = makeKwOverviewResult(100, 20)
    const serpResult = makeSerpResult(['organic'])

    mockFetch
      .mockResolvedValueOnce(makeDfsResponse(autocompleteItems))
      .mockResolvedValueOnce(makeDfsResponse(volumeResult))
      .mockResolvedValueOnce(makeDfsResponse(serpResult))

    const result = await validateAutocomplete('suggestion')

    expect(result.suggestions).toHaveLength(20)
    expect(mockWriteJson).toHaveBeenCalledTimes(1)
  })
})
