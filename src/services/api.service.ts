import { log } from '@/utils/logger'

interface ApiOptions {
  signal?: AbortSignal
}

async function handleApiError(res: Response, method: string, path: string): Promise<never> {
  const json = await res.json().catch((err: unknown) => {
    if (err instanceof Error && err.name === 'AbortError') throw err
    return null
  })
  const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
  log.error(`${method} /api${path} — ${message}`)
  throw new Error(message)
}

/** Fetch wrapper for the backend API — GET */
export async function apiGet<T>(path: string, options?: ApiOptions): Promise<T> {
  const res = await fetch(`/api${path}`, { signal: options?.signal })
  if (!res.ok) await handleApiError(res, 'GET', path)
  const json = await res.json()
  log.debug(`GET /api${path}`, json.data)
  return json.data as T
}

/** Fetch wrapper for the backend API — POST */
export async function apiPost<T>(path: string, body: unknown, options?: ApiOptions): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options?.signal,
  })
  if (!res.ok) await handleApiError(res, 'POST', path)
  const json = await res.json()
  log.debug(`POST /api${path}`, json.data)
  return json.data as T
}

/** Fetch wrapper for the backend API — DELETE */
export async function apiDelete<T>(path: string, options?: ApiOptions): Promise<T> {
  const res = await fetch(`/api${path}`, { method: 'DELETE', signal: options?.signal })
  if (!res.ok) await handleApiError(res, 'DELETE', path)
  const json = await res.json()
  log.debug(`DELETE /api${path}`, json.data)
  return json.data as T
}

/** Fetch wrapper for the backend API — PATCH */
export async function apiPatch<T>(path: string, body: unknown, options?: ApiOptions): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options?.signal,
  })
  if (!res.ok) await handleApiError(res, 'PATCH', path)
  const json = await res.json()
  log.debug(`PATCH /api${path}`, json.data)
  return json.data as T
}

/** Fetch wrapper for the backend API — PUT */
export async function apiPut<T>(path: string, body: unknown, options?: ApiOptions): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: options?.signal,
  })
  if (!res.ok) await handleApiError(res, 'PUT', path)
  const json = await res.json()
  log.debug(`PUT /api${path}`, json.data)
  return json.data as T
}
