import { ref } from 'vue'
import { log } from '@/utils/logger'
import { apiStream, type ApiStreamCallbacks, type SectionStartInfo as ApiSectionStartInfo } from '@/services/api.service'
import type { ApiUsage } from '@shared/types/index.js'

/**
 * Composable for consuming SSE streams from POST endpoints.
 *
 * Depuis le chantier fetch→wrapper migration, ce composable est un thin
 * wrapper autour de `apiStream` (FR-INFRA-API-STREAM). Il ajoute la couche
 * réactive (refs Vue) au-dessus du helper stateless.
 */
export type SectionStartInfo = ApiSectionStartInfo

export type StreamingCallbacks<T> = ApiStreamCallbacks<T>

/**
 * Convertit une URL absolue type "/api/foo/bar" en path relatif "/foo/bar"
 * pour s'aligner avec la convention du wrapper apiX (qui prefixe par /api).
 * Garde l'API publique de useStreaming compatible avec l'historique.
 */
function urlToApiPath(url: string): string {
  return url.startsWith('/api') ? url.slice(4) : url
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

    const out = await apiStream<T>(
      urlToApiPath(url),
      body,
      {
        ...callbacks,
        // chunks réactif : on accumule via onChunkRaw pour ne pas écraser
        // l'éventuel onChunk du caller.
        onChunkRaw: (piece) => {
          chunks.value += piece
          callbacks?.onChunkRaw?.(piece)
        },
        onUsage: (u) => {
          usage.value = u
          callbacks?.onUsage?.(u)
        },
        onDone: (data) => {
          result.value = data
          callbacks?.onDone?.(data)
        },
      },
      { signal: abortController.signal },
    )

    if (out.errorMessage) error.value = out.errorMessage
    isStreaming.value = false
    abortController = null
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
 *
 * Depuis FR-INFRA-API-STREAM, c'est un thin wrapper autour de apiStream.
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
  return apiStream<T>(urlToApiPath(url), body, options?.callbacks, { signal: options?.signal })
}
