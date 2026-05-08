import { log } from '../../../utils/logger.js'
import { costGuard, CostBudgetError } from '../dataforseo-cost-guard.js'
import { getRuntimeMode } from '../../infra/runtime-mode.service.js'

// --- Shared constants ---

export const DEFAULT_LOCATION_CODE = 2250 // France
export const DEFAULT_LANGUAGE_CODE = 'fr'
const MAX_RETRIES = 3
const MAX_RETRIES_50000 = 1 // 50000 = DataForSEO internal error; retry once only to avoid runaway cost
const INITIAL_RETRY_DELAY_MS = 1000
export const AUDIT_INTER_REQUEST_DELAY_MS = 200
export const KEYWORD_OVERVIEW_BATCH_MAX = 700
export const SEARCH_INTENT_BATCH_MAX = 1000

export const CACHE_TYPE = 'dataforseo'
export const DATAFORSEO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/** Marker error thrown when DataForSEO returns 429 (quota / rate limit) after all retries. */
export class DataForSeoQuotaError extends Error {
  constructor(message = 'DataForSEO quota exceeded') {
    super(message)
    this.name = 'DataForSeoQuotaError'
  }
}

// Re-export so callers can distinguish a budget trip from a real API quota trip.
export { CostBudgetError }

// --- Sandbox / Production URL ---

/**
 * Sandbox detection — EXPLICIT opt-in only.
 *
 * Why: previously we inferred sandbox from NODE_ENV. `npm run dev:server` does
 * NOT set NODE_ENV, so the inference silently failed and dev traffic hit the
 * paid production API. Default route: `DATAFORSEO_SANDBOX=true` in `.env`.
 *
 * Runtime override : if the user toggled navbar mock/real, that takes
 * precedence over `.env` so a single switch covers AI + DataForSEO.
 */
export function isSandbox(): boolean {
  const override = getRuntimeMode()
  if (override === 'mock') return true
  if (override === 'real') return false
  return process.env.DATAFORSEO_SANDBOX === 'true'
}

let baseUrlLogged = false

/** Returns sandbox URL when DATAFORSEO_SANDBOX=true, production URL otherwise */
export function getBaseUrl(): string {
  const url = isSandbox()
    ? 'https://sandbox.dataforseo.com/v3'
    : 'https://api.dataforseo.com/v3'
  if (!baseUrlLogged) {
    baseUrlLogged = true
    if (isSandbox()) {
      log.info('DataForSEO: using SANDBOX (free, fake data)')
    } else {
      log.warn('DataForSEO: using PRODUCTION — calls will be billed. Set DATAFORSEO_SANDBOX=true in .env to switch.')
    }
  }
  return url
}

// --- Auth ---

export function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) {
    throw new Error('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set in environment variables')
  }
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`
}

// --- Retry with backoff ---

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchDataForSeo<T>(endpoint: string, body: unknown[]): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`
  const auth = getAuthHeader()

  await costGuard.reserve(endpoint, body)

  let lastError: Error | null = null
  let count50000 = 0

  log.debug(`DataForSEO request → ${endpoint}`, { url, bodyItems: body.length })

  const start = Date.now()

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500)
      log.warn(`DataForSEO retry ${attempt}/${MAX_RETRIES} for ${endpoint}`, { delay, ms: Date.now() - start })
      await sleep(delay)
    }

    // External API call — bypass wrapper by design (DataForSEO).
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      const json = await response.json() as { status_code: number; tasks: Array<{ status_code: number; result: T[] }> }
      if (json.status_code !== 20000) {
        if (json.status_code >= 50000 && json.status_code < 60000) {
          count50000++
          if (count50000 > MAX_RETRIES_50000) {
            log.error(`DataForSEO API 50000 error persisted for ${endpoint} — giving up (saves credits)`, { retries: count50000 })
            throw new Error(`DataForSEO error: status ${json.status_code} (persistent, aborted after ${count50000} attempts)`)
          }
          log.warn(`DataForSEO API transient error ${json.status_code} for ${endpoint}, will retry`, { attempt, count50000 })
          lastError = new Error(`DataForSEO error: status ${json.status_code}`)
          continue
        }
        log.error(`DataForSEO API error status ${json.status_code} for ${endpoint}`, { ms: Date.now() - start })
        throw new Error(`DataForSEO error: status ${json.status_code}`)
      }
      if (!json.tasks?.[0]?.result?.[0]) {
        log.warn(`DataForSEO empty result for ${endpoint}`, { ms: Date.now() - start })
        throw new Error('DataForSEO: empty result')
      }
      costGuard.commit(endpoint, body)
      log.debug(`DataForSEO response OK ← ${endpoint}`, { ms: Date.now() - start, resultCount: json.tasks[0].result.length })
      return json.tasks[0].result[0] as T
    }

    if (response.status === 429 || response.status === 500 || response.status === 503) {
      log.warn(`DataForSEO HTTP ${response.status} for ${endpoint}, will retry`, { attempt, ms: Date.now() - start })
      lastError = new Error(`DataForSEO HTTP ${response.status}: ${response.statusText}`)
      continue
    }

    log.error(`DataForSEO HTTP ${response.status} for ${endpoint}`, { ms: Date.now() - start, status: response.status })
    throw new Error(`DataForSEO HTTP ${response.status}: ${response.statusText}`)
  }

  log.error(`DataForSEO max retries exceeded for ${endpoint}`, { ms: Date.now() - start, retries: MAX_RETRIES })
  if (lastError?.message.includes('HTTP 429')) {
    throw new DataForSeoQuotaError(`DataForSEO quota atteint pour ${endpoint}`)
  }
  throw lastError ?? new Error('DataForSEO: max retries exceeded')
}

/** Variant that returns ALL result items instead of just the first one (for batch endpoints) */
export async function fetchDataForSeoBatch<T>(endpoint: string, body: unknown[]): Promise<T[]> {
  const url = `${getBaseUrl()}${endpoint}`
  const auth = getAuthHeader()

  await costGuard.reserve(endpoint, body)

  let lastError: Error | null = null
  let count50000 = 0

  log.debug(`DataForSEO batch request → ${endpoint}`, { url, bodyItems: body.length })

  const start = Date.now()

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500)
      log.warn(`DataForSEO batch retry ${attempt}/${MAX_RETRIES} for ${endpoint}`, { delay, ms: Date.now() - start })
      await sleep(delay)
    }

    // External API call — bypass wrapper by design (DataForSEO).
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (response.ok) {
      const json = await response.json() as { status_code: number; tasks: Array<{ status_code: number; result: T[] }> }
      if (json.status_code !== 20000) {
        if (json.status_code >= 50000 && json.status_code < 60000) {
          count50000++
          if (count50000 > MAX_RETRIES_50000) {
            log.error(`DataForSEO batch 50000 error persisted for ${endpoint} — giving up (saves credits)`, { retries: count50000 })
            throw new Error(`DataForSEO error: status ${json.status_code} (persistent, aborted after ${count50000} attempts)`)
          }
          log.warn(`DataForSEO batch API transient error ${json.status_code} for ${endpoint}, will retry`, { attempt, count50000 })
          lastError = new Error(`DataForSEO error: status ${json.status_code}`)
          continue
        }
        log.error(`DataForSEO batch API error ${json.status_code} for ${endpoint}`, { ms: Date.now() - start })
        throw new Error(`DataForSEO error: status ${json.status_code}`)
      }
      const results = json.tasks?.[0]?.result ?? []
      costGuard.commit(endpoint, body)
      log.debug(`DataForSEO batch response OK ← ${endpoint}`, { ms: Date.now() - start, resultCount: results.length })
      return results
    }

    if (response.status === 429 || response.status === 500 || response.status === 503) {
      log.warn(`DataForSEO batch HTTP ${response.status} for ${endpoint}, will retry`, { attempt, ms: Date.now() - start })
      lastError = new Error(`DataForSEO HTTP ${response.status}: ${response.statusText}`)
      continue
    }

    log.error(`DataForSEO batch HTTP ${response.status} for ${endpoint}`, { ms: Date.now() - start, status: response.status })
    throw new Error(`DataForSEO HTTP ${response.status}: ${response.statusText}`)
  }

  log.error(`DataForSEO batch max retries exceeded for ${endpoint}`, { ms: Date.now() - start, retries: MAX_RETRIES })
  if (lastError?.message.includes('HTTP 429')) {
    throw new DataForSeoQuotaError(`DataForSEO quota atteint pour ${endpoint}`)
  }
  throw lastError ?? new Error('DataForSEO: max retries exceeded')
}
