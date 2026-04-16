import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStreaming } from '../../../src/composables/editor/useStreaming'

// Helper to create a fake ReadableStream from SSE text
function createSseStream(events: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(events))
      controller.close()
    },
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('useStreaming', () => {
  it('parses chunk events and accumulates text', async () => {
    const sseData = [
      'event: chunk',
      'data: {"content":"Hello"}',
      '',
      'event: chunk',
      'data: {"content":" world"}',
      '',
      'event: done',
      'data: {"outline":{"sections":[]}}',
      '',
    ].join('\n')

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: createSseStream(sseData),
    } as unknown as Response)

    const { chunks, result, isStreaming, startStream } = useStreaming<{ sections: unknown[] }>()

    await startStream('/api/test', { data: true })

    expect(chunks.value).toBe('Hello world')
    expect(result.value).toEqual({ sections: [] })
    expect(isStreaming.value).toBe(false)
  })

  it('sets error on SSE error event', async () => {
    const sseData = [
      'event: error',
      'data: {"code":"CLAUDE_API_ERROR","message":"Rate limited"}',
      '',
    ].join('\n')

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: createSseStream(sseData),
    } as unknown as Response)

    const { error, startStream } = useStreaming()

    await startStream('/api/test', {})

    expect(error.value).toBe('Rate limited')
  })

  it('sets error on HTTP failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: { message: 'Internal error' } }),
    } as unknown as Response)

    const { error, startStream } = useStreaming()

    await startStream('/api/test', {})

    expect(error.value).toBe('Internal error')
  })

  it('sends POST with JSON body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: createSseStream(''),
    } as unknown as Response)

    const { startStream } = useStreaming()
    await startStream('/api/generate/outline', { keyword: 'test' })

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/generate/outline',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: 'test' }),
      }),
    )
  })

  it('resets state on new stream', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: createSseStream('event: chunk\ndata: {"content":"first"}\n\n'),
    } as unknown as Response)

    const { chunks, startStream } = useStreaming()
    await startStream('/api/test', {})
    expect(chunks.value).toBe('first')

    // Second call
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: createSseStream('event: chunk\ndata: {"content":"second"}\n\n'),
    } as unknown as Response)

    await startStream('/api/test', {})
    expect(chunks.value).toBe('second')
  })

  it('does not set error on abort', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError)

    const { error, startStream } = useStreaming()
    await startStream('/api/test', {})

    expect(error.value).toBeNull()
  })
})
