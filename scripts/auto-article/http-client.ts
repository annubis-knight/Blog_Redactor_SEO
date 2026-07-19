/**
 * Client HTTP mince vers l'API du projet (`http://localhost:PORT/api`).
 *
 * - `apiGet` / `apiPost` : JSON classique, déballe `{ data: T }`, relève `{ error }`.
 * - `consumeSse` : POST qui streame en `text/event-stream`, décode via le parser
 *   pur `parseSseBuffer` et pousse chaque événement vers `onEvent`.
 *
 * Le CLI est un client réseau externe (comme le front) : aucun import de
 * `server/` — on ne viole pas la règle d'isolation §3.1.
 */

import { parseSseBuffer } from './sse.js'
import type { SseEvent } from './types.js'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface HttpClient {
  apiGet: <T>(path: string) => Promise<T>
  apiPost: <T>(path: string, body?: unknown) => Promise<T>
  apiPut: <T>(path: string, body?: unknown) => Promise<T>
  apiPatch: <T>(path: string, body?: unknown) => Promise<T>
  apiDelete: <T>(path: string) => Promise<T>
  consumeSse: (
    path: string,
    body: unknown,
    onEvent: (event: SseEvent) => void,
  ) => Promise<void>
  baseUrl: string
}

export function createHttpClient(baseUrl: string): HttpClient {
  const root = baseUrl.replace(/\/$/, '')

  async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(root + path)
    return unwrap<T>(res)
  }

  function withBody(method: string) {
    return async <T>(path: string, body?: unknown): Promise<T> => {
      const res = await fetch(root + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      })
      return unwrap<T>(res)
    }
  }

  const apiPost = withBody('POST')
  const apiPut = withBody('PUT')
  const apiPatch = withBody('PATCH')

  async function apiDelete<T>(path: string): Promise<T> {
    const res = await fetch(root + path, { method: 'DELETE' })
    return unwrap<T>(res)
  }

  async function consumeSse(
    path: string,
    body: unknown,
    onEvent: (event: SseEvent) => void,
  ): Promise<void> {
    const res = await fetch(root + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body ?? {}),
    })

    if (!res.ok || !res.body) {
      // Erreur avant l'ouverture du stream → corps JSON classique.
      await unwrap(res)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { events, rest } = parseSseBuffer(buffer)
      buffer = rest
      for (const event of events) onEvent(event)
    }

    // Flush d'une éventuelle trame finale sans `\n\n` terminal.
    const tail = parseSseBuffer(buffer + '\n\n')
    for (const event of tail.events) onEvent(event)
  }

  return { apiGet, apiPost, apiPut, apiPatch, apiDelete, consumeSse, baseUrl: root }
}

async function unwrap<T>(res: Response): Promise<T> {
  let payload: unknown = null
  try {
    payload = await res.json()
  } catch {
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`, 'HTTP_ERROR', res.status)
    return null as T
  }

  const obj = payload as { data?: T; error?: { code?: string; message?: string } }
  if (obj?.error) {
    throw new ApiError(
      obj.error.message ?? 'Erreur API',
      obj.error.code ?? 'API_ERROR',
      res.status,
    )
  }
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`, 'HTTP_ERROR', res.status)
  }
  return obj.data as T
}
