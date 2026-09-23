import { log } from '@/utils/logger'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import { labelFromUrl } from '@/utils/api-label'
import type { ApiUsage, DbOp } from '@shared/types/index.js'
import { ContractViolationError, parseContract, type DisplayContract } from '@shared/contracts/core.js'

export interface ApiOptions<T = unknown> {
  signal?: AbortSignal
  /**
   * Contrat d'affichage (NFR-INT-DISPLAY-CONTRACTS) : met la réponse dans la
   * forme attendue par l'écran. Une réponse inutilisable rejette la promesse,
   * comme une erreur réseau : le chemin d'erreur existant de l'écran s'applique.
   */
  contract?: DisplayContract<T>
}

/** Temps « mise en format » côté client : sans contrat, la réponse passe telle quelle. */
function conform<T>(data: unknown, options?: ApiOptions<T>): T {
  return options?.contract ? parseContract(options.contract, data, 'client') : (data as T)
}

/**
 * Si la réponse d'un endpoint contient un `usage` (coût API Claude/Gemini/etc.),
 * on le pousse dans la pile d'activité. Permet d'afficher le coût de chaque
 * requête IA (non-streamée) dès qu'elle a retourné son résultat.
 *
 * Les routes SSE passent par useStreaming qui fait la même chose via le sentinel.
 */
function pushUsageIfPresent(path: string, data: unknown): void {
  if (!data || typeof data !== 'object') return
  const maybeUsage = (data as { usage?: unknown }).usage
  if (!maybeUsage || typeof maybeUsage !== 'object') return
  const usage = maybeUsage as ApiUsage
  // Un usage valide a au minimum un model + inputTokens
  if (typeof usage.model !== 'string' || typeof usage.inputTokens !== 'number') return
  try {
    const store = useCostLogStore()
    store.addEntry(labelFromUrl(path), usage)
  } catch {
    // Store not available outside Pinia context — silently skip
  }
}

/**
 * Backend routes may attach `dbOps: DbOp[]` to their JSON envelope (at root or
 * under `data`) when they perform writes. Surface each one in the activity pile.
 */
function pushDbOpsIfPresent(path: string, container: unknown): void {
  if (!container || typeof container !== 'object') return
  const maybeOps = (container as { dbOps?: unknown }).dbOps
  if (!Array.isArray(maybeOps)) return
  try {
    const store = useCostLogStore()
    const label = labelFromUrl(path)
    for (const op of maybeOps) {
      if (!op || typeof op !== 'object') continue
      const dbOp = op as DbOp
      if (typeof dbOp.operation !== 'string' || typeof dbOp.table !== 'string') continue
      store.addDbEntry(label, dbOp)
    }
  } catch {
    // Store not available outside Pinia context — silently skip
  }
}

/** Tracks known API error codes that should surface in the activity log. */
const KNOWN_ERROR_CODES: Record<string, { label: string; detail: string }> = {
  DATAFORSEO_QUOTA_EXCEEDED: {
    label: 'Quota DataForSEO atteint',
    detail: 'Rechargez vos crédits sur dataforseo.com, puis relancez votre action.',
  },
  AI_PROVIDER_QUOTA_EXCEEDED: {
    label: 'Quota IA atteint',
    detail: 'Attendez quelques secondes ou basculez AI_PROVIDER dans votre .env (claude, gemini, openrouter).',
  },
  AI_PROVIDER_OVERLOADED: {
    label: 'Modèle IA surchargé',
    detail: 'Le modèle est temporairement indisponible. Nouvelle tentative dans quelques instants.',
  },
}

function reportKnownError(code: string | undefined, path: string): void {
  if (!code || !KNOWN_ERROR_CODES[code]) return
  try {
    const store = useCostLogStore()
    const { label, detail } = KNOWN_ERROR_CODES[code]
    store.addMessage('error', label, `${detail} (${path})`)
  } catch {
    // Store not available outside Pinia context — silently skip
  }
}

async function handleApiError(res: Response, method: string, path: string): Promise<never> {
  const json = await res.json().catch((err: unknown) => {
    if (err instanceof Error && err.name === 'AbortError') throw err
    return null
  })
  const code = json?.error?.code as string | undefined
  const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
  log.error(`${method} /api${path} — ${message}`)
  reportKnownError(code, path)
  throw new Error(message)
}

/** Fetch wrapper for the backend API — GET */
export async function apiGet<T>(path: string, options?: ApiOptions<T>): Promise<T> {
  const res = await fetch(`/api${path}`, { signal: options?.signal })
  if (!res.ok) await handleApiError(res, 'GET', path)
  const json = await res.json()
  log.debug(`GET /api${path}`, json.data)

  pushDbOpsIfPresent(path, json.data)
  pushDbOpsIfPresent(path, json)
  return conform(json.data, options)
}

/** Fetch wrapper for the backend API — POST */
export async function apiPost<T>(path: string, body: unknown, options?: ApiOptions<T>): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options?.signal,
  })
  if (!res.ok) await handleApiError(res, 'POST', path)
  const json = await res.json()
  log.debug(`POST /api${path}`, json.data)
  pushUsageIfPresent(path, json.data)
  pushUsageIfPresent(path, json)
  pushDbOpsIfPresent(path, json.data)
  pushDbOpsIfPresent(path, json)
  return conform(json.data, options)
}

/** Fetch wrapper for the backend API — DELETE */
export async function apiDelete<T>(path: string, options?: ApiOptions<T>): Promise<T> {
  const res = await fetch(`/api${path}`, { method: 'DELETE', signal: options?.signal })
  if (!res.ok) await handleApiError(res, 'DELETE', path)
  const json = await res.json()
  log.debug(`DELETE /api${path}`, json.data)
  pushDbOpsIfPresent(path, json.data)
  pushDbOpsIfPresent(path, json)
  return conform(json.data, options)
}

/** Fetch wrapper for the backend API — PATCH */
export async function apiPatch<T>(path: string, body: unknown, options?: ApiOptions<T>): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options?.signal,
  })
  if (!res.ok) await handleApiError(res, 'PATCH', path)
  const json = await res.json()
  log.debug(`PATCH /api${path}`, json.data)
  pushDbOpsIfPresent(path, json.data)
  pushDbOpsIfPresent(path, json)
  return conform(json.data, options)
}

/** Fetch wrapper for the backend API — PUT */
export async function apiPut<T>(path: string, body: unknown, options?: ApiOptions<T>): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options?.signal,
  })
  if (!res.ok) await handleApiError(res, 'PUT', path)
  const json = await res.json()
  log.debug(`PUT /api${path}`, json.data)
  pushDbOpsIfPresent(path, json.data)
  pushDbOpsIfPresent(path, json)
  return conform(json.data, options)
}

// ============================================================
// FR-INFRA-API-STREAM — wrapper SSE pour POST → ReadableStream
// ============================================================

export interface SectionStartInfo {
  index: number
  total: number
  title: string
}

export interface ApiStreamCallbacks<T> {
  /** Cumulative payload as chunks arrive (handy for incremental rendering). */
  onChunk?: (accumulated: string) => void
  /** Each individual chunk text (no accumulation). Useful when callers want to control aggregation themselves. */
  onChunkRaw?: (chunk: string) => void
  /** Final structured payload from the `done` SSE event. */
  onDone?: (data: T) => void
  /** Cost / token usage attached to the `done` SSE event. */
  onUsage?: (usage: ApiUsage) => void
  /** A new section is starting (multi-section streaming, e.g. article generation). */
  onSectionStart?: (info: SectionStartInfo) => void
  /** A section finished. */
  onSectionDone?: (info: { index: number }) => void
  /** Server-side error event during the stream. */
  onError?: (message: string) => void
}

export interface ApiStreamResult<T> {
  result: T | null
  usage: ApiUsage | null
  errorMessage: string | null
  aborted: boolean
}

async function consumeSseBody<T>(
  path: string,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks?: ApiStreamCallbacks<T>,
  options?: ApiOptions<T>,
): Promise<ApiStreamResult<T>> {
  const decoder = new TextDecoder()
  let buffer = ''
  let result: T | null = null
  let usage: ApiUsage | null = null
  let errorMessage: string | null = null
  let accumulated = ''
  // Le type d'événement survit d'une lecture à l'autre : un message SSE se
  // découpe librement en paquets réseau. Déclaré dans la boucle, il repartait
  // à zéro dès que `event: done` et ses données tombaient dans deux paquets
  // distincts — ce qui arrive systématiquement au-delà de quelques kilo-octets.
  // La rédaction d'un article long ne se terminait donc jamais côté écran : le
  // texte s'affichait, puis plus rien — ni méta, ni accès à l'éditeur.
  let eventType = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        let parsed
        try {
          parsed = JSON.parse(line.slice(6))
        } catch {
          // Ignore malformed JSON lines
          eventType = ''
          continue
        }
        try {
          if (eventType === 'chunk') {
            // Support legacy `content` key (generate/article) and unified `html` key (generate/reduce, humanize-section)
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
            // Temps « mise en format » : le résultat final passe le contrat de l'écran.
            // Inutilisable → même chemin qu'une erreur du serveur, onDone n'est pas appelé.
            const done = conformStreamResult(path, parsed.outline ?? parsed.metadata ?? parsed, options)
            if (done.ok) {
              result = done.value
              callbacks?.onDone?.(done.value)
            } else {
              errorMessage = done.message
              callbacks?.onError?.(done.message)
            }
          } else if (eventType === 'section-start') {
            callbacks?.onSectionStart?.(parsed as SectionStartInfo)
          } else if (eventType === 'section-done') {
            callbacks?.onSectionDone?.(parsed as { index: number })
          } else if (eventType === 'error') {
            const msg = parsed.message ?? 'Erreur inconnue'
            errorMessage = msg
            callbacks?.onError?.(msg)
          }
        } catch (err) {
          // Une erreur dans un callback de l'écran ne coupe pas le flux, mais se voit dans le journal.
          log.error(`SSE /api${path} — traitement de l'événement « ${eventType} » impossible : ${(err as Error).message}`)
        }
        eventType = ''
      }
    }
  }

  return { result, usage, errorMessage, aborted: false }
}

type StreamConformity<T> = { ok: true; value: T } | { ok: false; message: string }

function conformStreamResult<T>(path: string, data: unknown, options?: ApiOptions<T>): StreamConformity<T> {
  try {
    return { ok: true, value: conform(data, options) }
  } catch (err) {
    if (!(err instanceof ContractViolationError)) throw err
    log.error(`SSE /api${path} — ${err.message}`, { issues: err.issues })
    return { ok: false, message: err.message }
  }
}

/**
 * SSE wrapper — POST to a streaming endpoint and consume `chunk`/`done`/
 * `section-*`/`error` events. Mirrors the cost-log + known-error semantics of
 * the JSON wrappers above (cf. FR-INFRA-API-WRAPPER), so callers don't need to
 * reinvent error handling for streaming routes.
 *
 * On HTTP error before the stream starts: handles known error codes and throws.
 * On AbortError: returns `{ aborted: true }` (callbacks not called).
 */
export async function apiStream<T>(
  path: string,
  body: unknown,
  callbacks?: ApiStreamCallbacks<T>,
  options?: ApiOptions<T>,
): Promise<ApiStreamResult<T>> {
  log.debug(`SSE stream start → /api${path}`)
  try {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    })

    if (!res.ok) {
      // Réutilise le pipeline KNOWN_ERROR_CODES + toast du wrapper JSON.
      await handleApiError(res, 'POST (SSE)', path)
    }

    if (!res.body) {
      return { result: null, usage: null, errorMessage: 'La réponse ne contient pas de body streamable', aborted: false }
    }

    const reader = res.body.getReader()
    const out = await consumeSseBody<T>(path, reader, callbacks, options)
    if (out.usage) {
      try {
        const store = useCostLogStore()
        store.addEntry(labelFromUrl(path), out.usage)
      } catch {
        // Store not available outside Pinia context — silently skip
      }
    }
    return out
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      log.debug(`SSE stream-once aborted ← /api${path}`)
      return { result: null, usage: null, errorMessage: null, aborted: true }
    }
    const message = err instanceof Error ? err.message : 'Erreur de streaming'
    log.error(`SSE stream failed ← /api${path} — ${message}`)
    return { result: null, usage: null, errorMessage: message, aborted: false }
  }
}
