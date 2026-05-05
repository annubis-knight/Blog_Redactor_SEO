/**
 * HTTP client wrapper for e2e/integration/contract tests.
 *
 * Assume le serveur dev est lancé en parallèle (AI_PROVIDER=mock conseillé).
 * URL configurable via TEST_BASE_URL (défaut: http://localhost:3400/api — NFR-CFG-APP-PORTS).
 *
 * Les fonctions lèvent une erreur claire si le serveur n'est pas joignable ou
 * si un endpoint renvoie un status inattendu.
 */
import { TEST_API_BASE_URL } from './base-url'

const BASE_URL = TEST_API_BASE_URL

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
  const hasBody = method !== 'GET' && body !== undefined
  const res = await fetch(url, {
    method,
    headers: hasBody ? { 'Content-Type': 'application/json' } : {},
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
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
 * Codes d'erreur "non-déterministes" tolérés par les tests qui dépendent
 * d'APIs externes (DataForSEO, Claude, Tavily…). Quand un test reçoit l'un
 * de ces codes, il est autorisé à skipper ses assertions de succès — mais il
 * DOIT vérifier que le serveur a renvoyé une erreur structurée (sinon
 * c'est un faux positif silencieux).
 *
 * Usage type :
 *   const res = await apiPost('/keyword/validate', { ... })
 *   if (!expectSuccessOrKnownError(res)) return  // env limité, skip propre
 *   // ... assertions de succès ...
 */
export const TOLERATED_ENV_ERROR_CODES = new Set<string>([
  // Cost-guard / rate-limit DataForSEO
  'DATAFORSEO_COST_BUDGET',
  'DATAFORSEO_RATE_LIMITED',
  'RATE_LIMITED',
  // Erreurs métier qui ENCAPSULENT une erreur externe (DataForSEO 402/429,
  // Tavily key absente, etc.). Le message contient le détail amont.
  'INTENT_ANALYSIS_ERROR',
  'MAPS_ANALYSIS_ERROR',
  'COMPARISON_ERROR',
  'CONTENT_GAP_ERROR',
  'SERP_ANALYSIS_ERROR',
  'KEYWORD_VALIDATE_ERROR',
  // IA providers indispo
  'AI_PROVIDER_UNAVAILABLE',
  'AI_PARSE_ERROR',         // Claude/Gemini répond du non-JSON
  // Réseau amont
  'EXTERNAL_API_TIMEOUT',
])

/**
 * Mots-clés dans le message d'erreur qui indiquent une cause externe
 * (clé API absente, payment required, rate-limit). Heuristique de fallback
 * quand le code seul ne suffit pas à diagnostiquer.
 */
const EXTERNAL_CAUSE_KEYWORDS = [
  'DataForSEO',
  'Tavily',
  'TAVILY_API_KEY',
  'CLAUDE_API_KEY',
  'OPENROUTER',
  '402',     // Payment required
  '429',     // Too Many Requests
] as const

function messageMatchesExternalCause(message: string | undefined): boolean {
  if (!message) return false
  return EXTERNAL_CAUSE_KEYWORDS.some(kw => message.includes(kw))
}

/**
 * Retourne `true` si la réponse est un succès (200 + data non null) → le test
 * peut continuer ses assertions de succès.
 *
 * Retourne `false` si la réponse est une erreur tolérée (code dans
 * TOLERATED_ENV_ERROR_CODES OU message contenant un mot-clé "cause externe")
 * → le test peut skipper proprement.
 *
 * **Throw** sinon — c'est ce qui distingue ce helper du vieux pattern
 * `if (status === 200)` qui passait silencieusement les autres cas. Un 404,
 * un 500 sans code d'erreur structurée, un 401, etc. font ECHOUER le test.
 */
export function expectSuccessOrKnownError<T>(res: ApiResponse<T>): boolean {
  if (res.status === 200 && res.data !== null) return true

  const code = res.error?.code
  const message = res.error?.message

  // Code explicitement dans la whitelist
  if (code && TOLERATED_ENV_ERROR_CODES.has(code)) return false

  // Sinon, fallback heuristique : message qui mentionne une cause externe
  if (messageMatchesExternalCause(message)) return false

  // Toute autre situation = vraie erreur. On laisse vitest échouer avec un
  // message clair (status + code + message).
  throw new Error(
    `Expected 200+data ou code d'erreur env tolere. ` +
    `Recu : status=${res.status}, code=${code ?? '(aucun)'}, message=${message ?? '(aucun)'}.\n` +
    `Codes toleres : ${[...TOLERATED_ENV_ERROR_CODES].join(', ')}.\n` +
    `Mots-cles message toleres : ${EXTERNAL_CAUSE_KEYWORDS.join(', ')}.`,
  )
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
