/**
 * HTTP client wrapper for e2e/integration/contract tests.
 *
 * Assume le serveur dev est lancé en parallèle (AI_PROVIDER=mock conseillé).
 * URL configurable via TEST_BASE_URL (défaut: http://localhost:3005/api).
 *
 * Les fonctions lèvent une erreur claire si le serveur n'est pas joignable ou
 * si un endpoint renvoie un status inattendu.
 */
const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3005/api'

export interface ApiResponse<T = unknown> {
  status: number
  data: T | null
  error: { code: string; message: string } | null
  raw: unknown
}

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let json: unknown = null
  try { json = await res.json() } catch { /* non-JSON response */ }

  const obj = (json ?? {}) as Record<string, unknown>
  return {
    status: res.status,
    data: (obj.data ?? null) as T | null,
    error: (obj.error ?? null) as { code: string; message: string } | null,
    raw: json,
  }
}

export const apiGet = <T>(path: string) => apiRequest<T>('GET', path)
export const apiPost = <T>(path: string, body?: unknown) => apiRequest<T>('POST', path, body)
export const apiPut = <T>(path: string, body?: unknown) => apiRequest<T>('PUT', path, body)
export const apiPatch = <T>(path: string, body?: unknown) => apiRequest<T>('PATCH', path, body)
export const apiDelete = <T>(path: string) => apiRequest<T>('DELETE', path)

/**
 * Health check — confirme que le serveur dev tourne. À appeler dans
 * beforeAll pour skipper les tests proprement si le serveur n'est pas up.
 */
export async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Consomme un stream SSE/texte et retourne le texte concaténé. Utilisé pour
 * les endpoints qui streament (translate-pain, generate/article, etc.).
 */
export async function consumeStream(path: string, body?: unknown): Promise<string> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.body) return ''
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
  }
  return text
}
