import { log } from '@/utils/logger'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import { labelFromUrl } from '@/utils/api-label'
import type { ApiUsage, DbOp } from '@shared/types/index.js'

interface ApiOptions {
  signal?: AbortSignal
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
export async function apiGet<T>(path: string, options?: ApiOptions): Promise<T> {
  const res = await fetch(`/api${path}`, { signal: options?.signal })
  if (!res.ok) await handleApiError(res, 'GET', path)
  const json = await res.json()
  log.debug(`GET /api${path}`, json.data)
  // Sprint 16b — Surface DB reads in the pile too (previously only writes were).
  pushDbOpsIfPresent(path, json.data)
  pushDbOpsIfPresent(path, json)
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
  pushUsageIfPresent(path, json.data)
  pushUsageIfPresent(path, json)
  pushDbOpsIfPresent(path, json.data)
  pushDbOpsIfPresent(path, json)
  return json.data as T
}

/** Fetch wrapper for the backend API — DELETE */
export async function apiDelete<T>(path: string, options?: ApiOptions): Promise<T> {
  const res = await fetch(`/api${path}`, { method: 'DELETE', signal: options?.signal })
  if (!res.ok) await handleApiError(res, 'DELETE', path)
  const json = await res.json()
  log.debug(`DELETE /api${path}`, json.data)
  pushDbOpsIfPresent(path, json.data)
  pushDbOpsIfPresent(path, json)
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
  pushDbOpsIfPresent(path, json.data)
  pushDbOpsIfPresent(path, json)
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
  pushDbOpsIfPresent(path, json.data)
  pushDbOpsIfPresent(path, json)
  return json.data as T
}
