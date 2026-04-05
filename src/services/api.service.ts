import { log } from '@/utils/logger'

/** Fetch wrapper for the backend API — GET */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.error?.message ?? `Erreur HTTP ${res.status}`
    log.error(`GET /api${path} — ${message}`)
    throw new Error(message)
  }
  const json = await res.json()
  log.debug(`GET /api${path}`, json.data)
  return json.data as T
}

/** Fetch wrapper for the backend API — POST */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
    log.error(`POST /api${path} — ${message}`)
    throw new Error(message)
  }
  const json = await res.json()
  log.debug(`POST /api${path}`, json.data)
  return json.data as T
}

/** Fetch wrapper for the backend API — DELETE */
export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { method: 'DELETE' })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
    log.error(`DELETE /api${path} — ${message}`)
    throw new Error(message)
  }
  const json = await res.json()
  log.debug(`DELETE /api${path}`, json.data)
  return json.data as T
}

/** Fetch wrapper for the backend API — PATCH */
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
    log.error(`PATCH /api${path} — ${message}`)
    throw new Error(message)
  }
  const json = await res.json()
  log.debug(`PATCH /api${path}`, json.data)
  return json.data as T
}

/** Fetch wrapper for the backend API — PUT */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => null)
    const message = json?.error?.message ?? `Erreur HTTP ${res.status}`
    log.error(`PUT /api${path} — ${message}`)
    throw new Error(message)
  }
  const json = await res.json()
  log.debug(`PUT /api${path}`, json.data)
  return json.data as T
}
