import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiGet, apiPost } from '../../../src/services/api.service'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('api.service — apiGet', () => {
  it('calls fetch with correct URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    })
    await apiGet('/cocoons')
    expect(mockFetch).toHaveBeenCalledWith('/api/cocoons', { signal: undefined })
  })

  it('returns data from successful response', async () => {
    const cocoons = [{ id: 0, name: 'Test' }]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: cocoons }),
    })
    const result = await apiGet('/cocoons')
    expect(result).toEqual(cocoons)
  })

  it('throws on HTTP error with API message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }),
    })
    await expect(apiGet('/cocoons')).rejects.toThrow('Server error')
  })

  it('throws with HTTP status when no body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.reject(new Error('no json')),
    })
    await expect(apiGet('/test')).rejects.toThrow('Erreur HTTP 404')
  })
})

describe('api.service — apiPost', () => {
  it('calls fetch with correct URL, method and body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { result: 'ok' } }),
    })
    await apiPost('/dataforseo/brief', { keyword: 'test' })
    expect(mockFetch).toHaveBeenCalledWith('/api/dataforseo/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: 'test' }),
      signal: undefined,
    })
  })

  it('returns data from successful response', async () => {
    const responseData = { keyword: 'test', serp: [] }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: responseData }),
    })
    const result = await apiPost('/dataforseo/brief', { keyword: 'test' })
    expect(result).toEqual(responseData)
  })

  it('throws on HTTP error with API message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: { code: 'DATAFORSEO_ERROR', message: 'API failed' } }),
    })
    await expect(apiPost('/dataforseo/brief', { keyword: 'test' })).rejects.toThrow('API failed')
  })

  it('throws with HTTP status when no body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('no json')),
    })
    await expect(apiPost('/test', {})).rejects.toThrow('Erreur HTTP 500')
  })
})
