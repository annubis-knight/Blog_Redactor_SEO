import { ref } from 'vue'

/**
 * Composable for consuming SSE streams from POST endpoints.
 * Cannot use EventSource for POST — uses fetch() with ReadableStream.
 */
export interface StreamingCallbacks<T> {
  onChunk?: (accumulated: string) => void
  onDone?: (data: T) => void
  onError?: (message: string) => void
}

export function useStreaming<T>() {
  const chunks = ref('')
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const result = ref<T | null>(null) as { value: T | null }
  let abortController: AbortController | null = null

  async function startStream(url: string, body: unknown, callbacks?: StreamingCallbacks<T>) {
    abortController = new AbortController()
    isStreaming.value = true
    error.value = null
    chunks.value = ''
    result.value = null

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error?.message ?? `Erreur HTTP ${res.status}`)
      }

      if (!res.body) {
        throw new Error('La réponse ne contient pas de body streamable')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // Keep incomplete line in buffer

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (eventType === 'chunk') {
                chunks.value += parsed.content
                callbacks?.onChunk?.(chunks.value)
              } else if (eventType === 'done') {
                result.value = parsed.outline ?? parsed.metadata ?? parsed
                callbacks?.onDone?.(result.value as T)
              } else if (eventType === 'error') {
                const msg = parsed.message ?? 'Erreur inconnue'
                error.value = msg
                callbacks?.onError?.(msg)
              }
            } catch {
              // Ignore malformed JSON lines
            }
            eventType = ''
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      error.value = err instanceof Error ? err.message : 'Erreur de streaming'
    } finally {
      isStreaming.value = false
      abortController = null
    }
  }

  function abort() {
    abortController?.abort()
  }

  return { chunks, isStreaming, error, result, startStream, abort }
}
