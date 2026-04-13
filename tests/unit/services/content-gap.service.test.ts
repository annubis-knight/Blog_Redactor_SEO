// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks (must be declared before imports) ---

vi.mock('../../../server/utils/json-storage', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
}))

vi.mock('../../../server/services/dataforseo.service', () => ({
  slugify: (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
}))

const claudeAnalysisResult = {
  competitors: [
    { url: 'https://a.com', headings: ['H2: Topic'], wordCount: 1500, localEntities: ['Toulouse'] },
    { url: 'https://b.com', headings: ['H2: Another'], wordCount: 1200, localEntities: [] },
  ],
  themes: [
    { theme: 'référencement local', frequency: 4 },
    { theme: 'Google Maps', frequency: 3 },
    { theme: 'rare topic', frequency: 1 },
  ],
  localEntities: [{ entity: 'Toulouse', frequency: 4 }],
}

const { mockCreateFn } = vi.hoisted(() => ({
  mockCreateFn: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreateFn }
  },
}))

import { readJson, writeJson } from '../../../server/utils/json-storage'
import { analyzeContentGap } from '../../../server/services/content-gap.service'

const mockReadJson = vi.mocked(readJson)
const mockWriteJson = vi.mocked(writeJson)

let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('TAVILY_API_KEY', 'test_key')
  vi.stubEnv('ANTHROPIC_API_KEY', 'test_anthropic_key')

  mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)

  // Default: no cache
  mockReadJson.mockRejectedValue(new Error('no cache'))
  mockWriteJson.mockResolvedValue(undefined)

  // Default Claude response
  mockCreateFn.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(claudeAnalysisResult) }],
    usage: { input_tokens: 100, output_tokens: 50 },
  })
})

function setupTavilyMock() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        results: [
          { url: 'https://a.com', title: 'Competitor 1', raw_content: 'Long content about topic' },
          { url: 'https://b.com', title: 'Competitor 2', content: 'Another competitor content' },
        ],
      }),
  })
}

describe('content-gap.service — analyzeContentGap', () => {
  it('returns cached data when available', async () => {
    const cached = {
      keyword: 'seo local toulouse',
      competitors: [],
      themes: [],
      gaps: [],
      averageWordCount: 0,
      localEntitiesFromCompetitors: [],
      cachedAt: '2026-01-01T00:00:00Z',
    }
    mockReadJson.mockResolvedValueOnce({
      data: cached,
      cachedAt: cached.cachedAt,
    })

    const result = await analyzeContentGap('seo local toulouse')

    expect(result).toEqual(cached)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls Tavily API with correct params on cache miss', async () => {
    setupTavilyMock()

    await analyzeContentGap('seo local toulouse')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: 'test_key',
          query: 'seo local toulouse',
          search_depth: 'advanced',
          include_raw_content: true,
          max_results: 5,
        }),
      }),
    )
  })

  it('passes Tavily results to Claude for analysis', async () => {
    setupTavilyMock()

    const result = await analyzeContentGap('seo local toulouse')

    // Claude messages.create was called with the Tavily results
    expect(mockCreateFn).toHaveBeenCalledTimes(1)
    const callArgs = mockCreateFn.mock.calls[0][0]
    expect(callArgs.messages[0].content).toContain('Competitor 1')
    expect(callArgs.messages[0].content).toContain('https://a.com')

    // Result contains competitor data from Claude's analysis
    expect(result.competitors).toHaveLength(2)
    expect(result.competitors[0].url).toBe('https://a.com')
    expect(result.competitors[1].url).toBe('https://b.com')
  })

  it('identifies gaps (themes in competitors but not in article) with frequency >= 3', async () => {
    setupTavilyMock()

    // No currentContent => no theme is presentInArticle => gaps are those with freq >= 3
    const result = await analyzeContentGap('seo local toulouse')

    // gaps should include 'référencement local' (freq 4) and 'Google Maps' (freq 3)
    // but NOT 'rare topic' (freq 1)
    expect(result.gaps).toHaveLength(2)
    expect(result.gaps.map((g) => g.theme)).toContain('référencement local')
    expect(result.gaps.map((g) => g.theme)).toContain('Google Maps')
    expect(result.gaps.map((g) => g.theme)).not.toContain('rare topic')
  })

  it('marks themes as presentInArticle when found in currentContent', async () => {
    setupTavilyMock()

    const result = await analyzeContentGap(
      'seo local toulouse',
      'Notre stratégie de référencement local à Toulouse...',
    )

    const refLocal = result.themes.find((t) => t.theme === 'référencement local')
    expect(refLocal?.presentInArticle).toBe(true)

    const googleMaps = result.themes.find((t) => t.theme === 'Google Maps')
    expect(googleMaps?.presentInArticle).toBe(false)

    // 'référencement local' is present in article, so it should NOT be in gaps
    // even though frequency >= 3
    expect(result.gaps.map((g) => g.theme)).not.toContain('référencement local')
    expect(result.gaps).toHaveLength(1)
    expect(result.gaps[0].theme).toBe('Google Maps')
  })

  it('calculates average word count from competitors', async () => {
    setupTavilyMock()

    const result = await analyzeContentGap('seo local toulouse')

    // (1500 + 1200) / 2 = 1350
    expect(result.averageWordCount).toBe(1350)
  })

  it('writes result to cache', async () => {
    setupTavilyMock()

    const result = await analyzeContentGap('seo local toulouse')

    expect(mockWriteJson).toHaveBeenCalledTimes(1)
    const [path, wrappedData] = mockWriteJson.mock.calls[0]
    expect(path).toContain('content-gap-')
    expect(wrappedData.data).toEqual(result)
    expect(result.cachedAt).toBeDefined()
  })

  it('handles Tavily API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    })

    await expect(analyzeContentGap('seo local toulouse')).rejects.toThrow(
      'Tavily API error: 429',
    )
  })
})
