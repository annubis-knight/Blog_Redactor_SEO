import { ref } from 'vue'
import { log } from '@/utils/logger'
import { useCostLogStore } from '@/stores/cost-log.store'
import type { ApiUsage } from '@shared/types/index.js'

/** Derive a human-readable label from the SSE endpoint URL for cost tracking. */
const URL_LABELS: [RegExp, string][] = [
  [/\/generate\/outline/, 'Génération sommaire'],
  [/\/generate\/article/, 'Génération article'],
  [/\/generate\/reduce/, 'Réduction article'],
  [/\/generate\/humanize-section/, 'Humanisation section'],
  [/\/generate\/action/, 'Action IA'],
  [/\/generate\/micro-context-suggest/, 'Suggestion micro-contexte'],
  [/\/generate\/brief-explain/, 'Analyse brief IA'],
  [/\/keywords\/[^/]+\/ai-lexique-upfront/, 'Pré-analyse lexique'],
  [/\/keywords\/[^/]+\/ai-lexique/, 'Analyse lexique'],
  [/\/keywords\/[^/]+\/ai-hn-structure/, 'Structure Hn'],
  [/\/keywords\/[^/]+\/ai-panel/, 'Analyse IA capitaine'],
  [/\/keywords\/[^/]+\/propose-lieutenants/, 'Proposition lieutenants'],
  [/\/strategy\/.*\/suggest/, 'Suggestion stratégie'],
  [/\/strategy\/.*\/deepen/, 'Approfondissement stratégie'],
  [/\/strategy\/.*\/consolidate/, 'Consolidation stratégie'],
  [/\/strategy\/.*\/enrich/, 'Enrichissement stratégie'],
  [/\/theme\/config\/parse/, 'Parsing thème'],
  [/\/keywords\/.*\/relevance-score/, 'Score pertinence'],
  [/\/keywords\/.*\/analyze-discovery/, 'Analyse discovery'],
]

function labelFromUrl(url: string): string {
  for (const [re, label] of URL_LABELS) {
    if (re.test(url)) return label
  }
  return url.split('/').pop() ?? 'Appel API'
}

function pushCostEntry(url: string, usage: ApiUsage): void {
  try {
    const costLogStore = useCostLogStore()
    costLogStore.addEntry(labelFromUrl(url), usage)
  } catch {
    // Store may not be available outside component scope — silently skip
  }
}

/**
 * Composable for consuming SSE streams from POST endpoints.
 * Cannot use EventSource for POST — uses fetch() with ReadableStream.
 */
export interface SectionStartInfo {
  index: number
  total: number
  title: string
}

export interface StreamingCallbacks<T> {
  onChunk?: (accumulated: string) => void
  onDone?: (data: T) => void
  onError?: (message: string) => void
  onUsage?: (usage: ApiUsage) => void
  onSectionStart?: (info: SectionStartInfo) => void
  onSectionDone?: (info: { index: number }) => void
}

/**
 * Internal helper — parses an SSE body reader, dispatches events via callbacks,
 * and resolves with a final result envelope. Used by both the stateful
 * `useStreaming` composable and the stateless `startStreamOnce` helper so
 * sequential humanization loops (cf editor.store.humanizeArticle) don't
 * share refs across iterations (finding F25).
 */
async function consumeSseBody<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks?: StreamingCallbacks<T> & { onChunkRaw?: (text: string) => void },
): Promise<{ result: T | null; usage: ApiUsage | null; errorMessage: string | null }> {
  const decoder = new TextDecoder()
  let buffer = ''
  let result: T | null = null
  let usage: ApiUsage | null = null
  let errorMessage: string | null = null
  let accumulated = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    let eventType = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6)
        try {
          const parsed = JSON.parse(data)
          if (eventType === 'chunk') {
            // Support both legacy `content` key (generate/article) and
            // unified `html` key (generate/reduce, humanize-section — F9)
            const piece: string = typeof parsed.content === 'string'
              ? parsed.content
              : typeof parsed.html === 'string'
                ? parsed.html
                : ''
            if (piece) {
              accumulated += piece
              callbacks?.onChunkRaw?.(piece)
              callbacks?.onChunk?.(accumulated)
            }
          } else if (eventType === 'done') {
            if (parsed.usage) {
              usage = parsed.usage as ApiUsage
              callbacks?.onUsage?.(parsed.usage as ApiUsage)
            }
            result = (parsed.outline ?? parsed.metadata ?? parsed) as T
            callbacks?.onDone?.(result as T)
          } else if (eventType === 'section-start') {
            callbacks?.onSectionStart?.(parsed as SectionStartInfo)
          } else if (eventType === 'section-done') {
            callbacks?.onSectionDone?.(parsed as { index: number })
          } else if (eventType === 'error') {
            const msg = parsed.message ?? 'Erreur inconnue'
            errorMessage = msg
            callbacks?.onError?.(msg)
          }
        } catch {
          // Ignore malformed JSON lines
        }
        eventType = ''
      }
    }
  }

  return { result, usage, errorMessage }
}

export function useStreaming<T>() {
  const chunks = ref('')
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const result = ref<T | null>(null) as { value: T | null }
  const usage = ref<ApiUsage | null>(null)
  let abortController: AbortController | null = null

  async function startStream(url: string, body: unknown, callbacks?: StreamingCallbacks<T>) {
    log.debug(`SSE stream start → ${url}`)
    abortController = new AbortController()
    isStreaming.value = true
    error.value = null
    chunks.value = ''
    result.value = null
    usage.value = null

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
      const { result: finalResult, usage: finalUsage, errorMessage } = await consumeSseBody<T>(reader, {
        ...callbacks,
        onChunkRaw: (piece) => { chunks.value += piece },
      })

      if (finalResult) result.value = finalResult
      if (finalUsage) {
        usage.value = finalUsage
        pushCostEntry(url, finalUsage)
      }
      if (errorMessage) error.value = errorMessage
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        log.debug(`SSE stream aborted ← ${url}`)
        return
      }
      log.error(`SSE stream failed ← ${url} — ${(err as Error).message}`)
      error.value = err instanceof Error ? err.message : 'Erreur de streaming'
    } finally {
      isStreaming.value = false
      abortController = null
    }
  }

  function abort() {
    abortController?.abort()
  }

  return { chunks, isStreaming, error, result, usage, startStream, abort }
}

/**
 * Stateless, promise-returning SSE client. Use this when you need to chain
 * multiple streams sequentially (e.g. humanizing each H2 section in a loop)
 * without ambiguity on shared refs between iterations (finding F25).
 *
 * Accepts an optional `signal` for cancellation from a parent AbortController.
 * The caller is responsible for aggregating results across iterations.
 */
export interface StreamOnceOptions<T> {
  signal?: AbortSignal
  callbacks?: StreamingCallbacks<T>
}

export interface StreamOnceResult<T> {
  result: T | null
  usage: ApiUsage | null
  errorMessage: string | null
  aborted: boolean
}

export async function startStreamOnce<T>(
  url: string,
  body: unknown,
  options?: StreamOnceOptions<T>,
): Promise<StreamOnceResult<T>> {
  log.debug(`SSE stream-once start → ${url}`)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    })

    if (!res.ok) {
      const json = await res.json().catch(() => null)
      const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
      return { result: null, usage: null, errorMessage: message, aborted: false }
    }

    if (!res.body) {
      return { result: null, usage: null, errorMessage: 'La réponse ne contient pas de body streamable', aborted: false }
    }

    const reader = res.body.getReader()
    const { result, usage, errorMessage } = await consumeSseBody<T>(reader, options?.callbacks)
    if (usage) pushCostEntry(url, usage)
    return { result, usage, errorMessage, aborted: false }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      log.debug(`SSE stream-once aborted ← ${url}`)
      return { result: null, usage: null, errorMessage: null, aborted: true }
    }
    const message = err instanceof Error ? err.message : 'Erreur de streaming'
    log.error(`SSE stream-once failed ← ${url} — ${message}`)
    return { result: null, usage: null, errorMessage: message, aborted: false }
  }
}
