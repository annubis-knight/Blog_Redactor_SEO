import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiGet, apiPost, apiStream } from '../../../src/services/api.service'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
  setActivePinia(createPinia())
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

// ============================================================
// FR-INFRA-API-STREAM — wrapper SSE
// ============================================================

function makeSseStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(event))
      controller.close()
    },
  })
}

describe('api.service — apiStream (FR-INFRA-API-STREAM)', () => {
  it('appelle POST /api<path> avec headers et body JSON', async () => {
    mockFetch.mockResolvedValue({ ok: true, body: makeSseStream([]) })
    await apiStream('/generate/action', { foo: 'bar' })
    expect(mockFetch).toHaveBeenCalledWith('/api/generate/action', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' }),
    }))
  })

  it('appelle onChunk avec le payload accumulé', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: makeSseStream([
        'event: chunk\ndata: {"content":"Bon"}\n\n',
        'event: chunk\ndata: {"content":"jour"}\n\n',
      ]),
    })
    const chunks: string[] = []
    await apiStream('/generate/action', {}, { onChunk: (acc) => chunks.push(acc) })
    expect(chunks).toEqual(['Bon', 'Bonjour'])
  })

  it('appelle onDone avec le payload final + onUsage', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: makeSseStream([
        'event: done\ndata: {"outline":{"sections":["S1"]},"usage":{"model":"claude-opus-4","inputTokens":100,"outputTokens":50}}\n\n',
      ]),
    })
    const onDone = vi.fn()
    const onUsage = vi.fn()
    const out = await apiStream('/generate/article', {}, { onDone, onUsage })
    expect(onDone).toHaveBeenCalledWith({ sections: ['S1'] })
    expect(onUsage).toHaveBeenCalledWith({ model: 'claude-opus-4', inputTokens: 100, outputTokens: 50 })
    expect(out.usage?.inputTokens).toBe(100)
  })

  it('relaie section-start et section-done', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: makeSseStream([
        'event: section-start\ndata: {"index":0,"total":2,"title":"Intro"}\n\n',
        'event: section-done\ndata: {"index":0}\n\n',
      ]),
    })
    const onSectionStart = vi.fn()
    const onSectionDone = vi.fn()
    await apiStream('/generate/article', {}, { onSectionStart, onSectionDone })
    expect(onSectionStart).toHaveBeenCalledWith({ index: 0, total: 2, title: 'Intro' })
    expect(onSectionDone).toHaveBeenCalledWith({ index: 0 })
  })

  it('appelle onError sur event SSE error', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      body: makeSseStream(['event: error\ndata: {"message":"Quota dépassé"}\n\n']),
    })
    const onError = vi.fn()
    const out = await apiStream('/generate/action', {}, { onError })
    expect(onError).toHaveBeenCalledWith('Quota dépassé')
    expect(out.errorMessage).toBe('Quota dépassé')
  })

  it('renvoie aborted=true sur AbortError', async () => {
    const abortErr = new Error('Aborted')
    abortErr.name = 'AbortError'
    mockFetch.mockRejectedValue(abortErr)
    const out = await apiStream('/generate/action', {})
    expect(out.aborted).toBe(true)
    expect(out.errorMessage).toBeNull()
  })

  it('NFR-OBS-KNOWN-ERRORS — surface DATAFORSEO_QUOTA_EXCEEDED en toast', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { code: 'DATAFORSEO_QUOTA_EXCEEDED', message: 'rate limit' } }),
    })
    // L'erreur est levée → on attend qu'elle soit transformée en errorMessage par le catch
    const out = await apiStream('/keywords/test/ai-panel', {})
    expect(out.errorMessage).toBe('rate limit')
    expect(out.aborted).toBe(false)
  })
})
