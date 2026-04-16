import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock json-storage before importing the service
vi.mock('../../../server/utils/json-storage', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
}))

// Mock dataforseo.service for slugify only
vi.mock('../../../server/services/external/dataforseo.service', () => ({
  slugify: vi.fn((kw: string) =>
    kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  ),
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { readJson, writeJson } from '../../../server/utils/json-storage'
import { fetchAutocomplete } from '../../../server/services/keyword/autocomplete.service'
import type { AutocompleteSignal } from '../../../server/services/keyword/autocomplete.service'

const mockReadJson = vi.mocked(readJson)
const mockWriteJson = vi.mocked(writeJson)

beforeEach(() => {
  mockFetch.mockReset()
  mockReadJson.mockReset()
  mockWriteJson.mockReset()
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
    mockReadJson.mockRejectedValue(new Error('no cache'))
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
    mockReadJson.mockRejectedValue(new Error('no cache'))
    const suggestions = ['fuite chauffe-eau', 'fuite chauffe-eau prix', 'fuite ballon eau chaude']
    mockFetch.mockResolvedValue(makeAutocompleteResponse('fuite chauffe-eau', suggestions))

    const result = await fetchAutocomplete('fuite chauffe-eau')

    expect(result.suggestionsCount).toBe(3)
    expect(result.suggestions).toEqual(suggestions)
    expect(result.hasKeyword).toBe(true) // 'fuite chauffe-eau' is in suggestions
    expect(result.position).toBe(1) // first position
  })

  it('detects when keyword is NOT in suggestions', async () => {
    mockReadJson.mockRejectedValue(new Error('no cache'))
    mockFetch.mockResolvedValue(makeAutocompleteResponse('test', ['test covid', 'test grossesse']))

    const result = await fetchAutocomplete('test')

    // 'test' exact is not in the suggestions
    expect(result.hasKeyword).toBe(false)
    expect(result.position).toBeNull()
  })

  it('returns empty signal on error without throwing', async () => {
    mockReadJson.mockRejectedValue(new Error('no cache'))
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await fetchAutocomplete('failing')

    expect(result.suggestionsCount).toBe(0)
    expect(result.suggestions).toEqual([])
    expect(result.hasKeyword).toBe(false)
    expect(result.position).toBeNull()
  })

  it('returns empty signal on 429 after retry fails', async () => {
    mockReadJson.mockRejectedValue(new Error('no cache'))
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 429 })

    const result = await fetchAutocomplete('rate-limited')

    expect(result.suggestionsCount).toBe(0)
    expect(result.suggestions).toEqual([])
    expect(mockFetch).toHaveBeenCalledTimes(2) // initial + 1 retry
  })

  it('returns cached signal when cache is fresh (no fetch call)', async () => {
    const cachedSignal: AutocompleteSignal = {
      suggestionsCount: 5,
      suggestions: ['a', 'b', 'c', 'd', 'e'],
      hasKeyword: true,
      position: 2,
    }

    mockReadJson.mockResolvedValue({
      data: cachedSignal,
      cachedAt: new Date().toISOString(), // fresh — CacheEntry format
    })

    const result = await fetchAutocomplete('cached')

    expect(result).toEqual(cachedSignal)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('retries once on 429 then succeeds', async () => {
    mockReadJson.mockRejectedValue(new Error('no cache'))
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce(makeAutocompleteResponse('test', ['test 1', 'test 2']))

    const result = await fetchAutocomplete('test')

    expect(result.suggestionsCount).toBe(2)
    expect(result.suggestions).toEqual(['test 1', 'test 2'])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
