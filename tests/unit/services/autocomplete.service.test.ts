import { describe, it, expect, vi, beforeEach } from 'vitest'

// Sprint 15.3 — autocomplete now reads/writes keyword_metrics (DB) instead of api_cache.
const mockGetKeywordMetrics = vi.fn()
const mockUpsertKeywordAutocomplete = vi.fn()
const mockIsKeywordMetricsFresh = vi.fn()

vi.mock('../../../server/services/keyword/keyword-metrics.service', () => ({
  getKeywordMetrics: (...args: unknown[]) => mockGetKeywordMetrics(...args),
  upsertKeywordAutocomplete: (...args: unknown[]) => mockUpsertKeywordAutocomplete(...args),
  isKeywordMetricsFresh: (...args: unknown[]) => mockIsKeywordMetricsFresh(...args),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { fetchAutocomplete } from '../../../server/services/keyword/autocomplete.service'

beforeEach(() => {
  mockFetch.mockReset()
  mockGetKeywordMetrics.mockReset()
  mockUpsertKeywordAutocomplete.mockReset()
  mockIsKeywordMetricsFresh.mockReset()
  mockGetKeywordMetrics.mockResolvedValue(null)
  mockIsKeywordMetricsFresh.mockReturnValue(false)
  mockUpsertKeywordAutocomplete.mockResolvedValue(undefined)
})

// --- Helper: create a Google Autocomplete response ---
function makeAutocompleteResponse(query: string, suggestions: string[]) {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify([query, suggestions])),
  }
}

describe('autocomplete.service — fetchAutocomplete', () => {
  it('calls endpoint with correct parameters (hl=fr, gl=fr)', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)
    mockFetch.mockResolvedValue(makeAutocompleteResponse('fuite', ['fuite eau', 'fuite gaz']))

    await fetchAutocomplete('fuite')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('q=fuite')
    expect(calledUrl).toContain('hl=fr')
    expect(calledUrl).toContain('gl=fr')
    expect(calledUrl).toContain('client=chrome')
    expect(calledUrl).toContain('google.com/complete/search')
  })

  it('parses [query, suggestions[]] response correctly', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)
    const suggestions = ['fuite chauffe-eau', 'fuite chauffe-eau prix', 'fuite ballon eau chaude']
    mockFetch.mockResolvedValue(makeAutocompleteResponse('fuite chauffe-eau', suggestions))

    const result = await fetchAutocomplete('fuite chauffe-eau')

    expect(result.suggestionsCount).toBe(3)
    expect(result.suggestions).toEqual(suggestions)
    expect(result.hasKeyword).toBe(true)
    expect(result.position).toBe(1)
  })

  it('detects when keyword is NOT in suggestions', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)
    mockFetch.mockResolvedValue(makeAutocompleteResponse('test', ['test covid', 'test grossesse']))

    const result = await fetchAutocomplete('test')

    expect(result.hasKeyword).toBe(false)
    expect(result.position).toBeNull()
  })

  it('returns empty signal on error without throwing', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await fetchAutocomplete('failing')

    expect(result.suggestionsCount).toBe(0)
    expect(result.suggestions).toEqual([])
    expect(result.hasKeyword).toBe(false)
    expect(result.position).toBeNull()
  })

  it('returns empty signal on 429 after retry fails', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 429 })

    const result = await fetchAutocomplete('rate-limited')

    expect(result.suggestionsCount).toBe(0)
    expect(result.suggestions).toEqual([])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('returns DB-first signal when keyword_metrics is fresh (no fetch call)', async () => {
    // Sprint 15.3 — fresh row reconstructs the signal from
    // keyword_metrics.autocomplete_suggestions + autocomplete_source.
    mockGetKeywordMetrics.mockResolvedValue({
      keyword: 'cached',
      lang: 'fr',
      country: 'fr',
      searchVolume: null,
      keywordDifficulty: null,
      cpc: null,
      competition: null,
      intentRaw: null,
      autocompleteSuggestions: [
        { text: 'a', position: 1 },
        { text: 'cached', position: 2 },
        { text: 'c', position: 3 },
      ],
      autocompleteSource: 'google',
      paaQuestions: [],
      fetchedAt: new Date().toISOString(),
    })
    mockIsKeywordMetricsFresh.mockReturnValue(true)

    const result = await fetchAutocomplete('cached')

    expect(result.suggestions).toEqual(['a', 'cached', 'c'])
    expect(result.suggestionsCount).toBe(3)
    expect(result.hasKeyword).toBe(true)
    expect(result.position).toBe(2)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('retries once on 429 then succeeds', async () => {
    mockGetKeywordMetrics.mockResolvedValue(null)
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce(makeAutocompleteResponse('test', ['test 1', 'test 2']))

    const result = await fetchAutocomplete('test')

    expect(result.suggestionsCount).toBe(2)
    expect(result.suggestions).toEqual(['test 1', 'test 2'])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
