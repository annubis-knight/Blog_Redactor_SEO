/**
 * Sliding-window cost guard for DataForSEO.
 *
 * Why: an accidental production run consumed a lot of credits in minutes — mainly
 * on keyword_overview_live and related_keywords_live (the two most expensive endpoints
 * we call). This module caps spend in a rolling window (default 0.50 USD / 30 min).
 *
 * How to apply: `await costGuard.reserve(endpoint, body)` before every DataForSEO call;
 * `costGuard.commit(endpoint, body)` only on success. reserve() throws CostBudgetError
 * if the *projected* spend would exceed the budget — the call is never made.
 */

import { log } from '../../utils/logger.js'

export class CostBudgetError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly attemptedCostUsd: number,
    public readonly spentUsd: number,
    public readonly budgetUsd: number,
    public readonly windowMin: number,
  ) {
    super(
      `DataForSEO cost budget exceeded — would spend $${attemptedCostUsd.toFixed(4)} on ${endpoint}, ` +
      `already spent $${spentUsd.toFixed(4)} in the last ${windowMin}min (budget $${budgetUsd.toFixed(2)})`,
    )
    this.name = 'CostBudgetError'
  }
}

// --- Endpoint unit pricing (USD) ---

/**
 * Base pricing (per call). For endpoints that accept arrays, the cost scales with
 * the item count via a per-item surcharge (see perItemCostUsd).
 *
 * Values are DataForSEO public reference prices and MAY drift — treat as an upper
 * bound / safety estimate, not billing truth. Refresh when DFSeo changes tariffs.
 */
const ENDPOINT_BASE_COST: Record<string, number> = {
  '/serp/google/organic/live/regular': 0.0006,
  '/serp/google/organic/live/advanced': 0.002,
  '/dataforseo_labs/google/keyword_overview/live': 0.01,
  '/dataforseo_labs/google/related_keywords/live': 0.01,
  '/dataforseo_labs/google/keyword_suggestions/live': 0.01,
  '/dataforseo_labs/google/search_intent/live': 0.01,
  '/dataforseo_labs/google/keyword_ideas/live': 0.01,
  '/keywords_data/google_ads/search_volume/live': 0.05,
}

/** Per-item surcharge for batch endpoints that accept an array of keywords. */
const ENDPOINT_PER_ITEM_COST: Record<string, number> = {
  '/dataforseo_labs/google/keyword_overview/live': 0.0001,
  '/dataforseo_labs/google/search_intent/live': 0.0001,
}

const DEFAULT_UNKNOWN_ENDPOINT_COST = 0.005

function countItems(endpoint: string, body: unknown[]): number {
  const first = body?.[0] as Record<string, unknown> | undefined
  if (!first) return 1
  const arr = first.keywords
  if (Array.isArray(arr)) return arr.length
  return 1
}

export function estimateCallCostUsd(endpoint: string, body: unknown[]): number {
  const base = ENDPOINT_BASE_COST[endpoint]
  if (base === undefined) {
    log.warn(`costGuard: unknown endpoint ${endpoint} — charging default $${DEFAULT_UNKNOWN_ENDPOINT_COST}`)
    return DEFAULT_UNKNOWN_ENDPOINT_COST
  }
  const perItem = ENDPOINT_PER_ITEM_COST[endpoint] ?? 0
  const n = countItems(endpoint, body)
  return base + perItem * Math.max(0, n - 1)
}

// --- Sliding-window accounting ---

interface Entry {
  ts: number // ms epoch
  costUsd: number
  endpoint: string
}

function budgetUsd(): number {
  const raw = process.env.DATAFORSEO_COST_BUDGET_USD
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 0.5
}

function windowMs(): number {
  const raw = process.env.DATAFORSEO_COST_WINDOW_MIN
  const n = raw ? Number(raw) : NaN
  const min = Number.isFinite(n) && n > 0 ? n : 30
  return min * 60 * 1000
}

class CostGuard {
  private entries: Entry[] = []

  private prune(now: number): void {
    const cutoff = now - windowMs()
    while (this.entries.length > 0 && this.entries[0].ts < cutoff) {
      this.entries.shift()
    }
  }

  private spentUsd(now: number): number {
    this.prune(now)
    return this.entries.reduce((acc, e) => acc + e.costUsd, 0)
  }

  /**
   * Record the projected cost BEFORE sending the request. Throws CostBudgetError
   * if the spend would push us over the budget — the caller must NOT send.
   *
   * We charge on reserve (not commit) so that in-flight retries can't burst past
   * the limit. commit() is a no-op; kept as a hook for future refinement.
   */
  async reserve(endpoint: string, body: unknown[]): Promise<void> {
    const now = Date.now()
    const cost = estimateCallCostUsd(endpoint, body)
    const spent = this.spentUsd(now)
    const budget = budgetUsd()
    if (spent + cost > budget) {
      throw new CostBudgetError(endpoint, cost, spent, budget, windowMs() / 60000)
    }
    this.entries.push({ ts: now, costUsd: cost, endpoint })
    log.debug(`costGuard: +$${cost.toFixed(4)} on ${endpoint} (spent $${(spent + cost).toFixed(4)} / $${budget.toFixed(2)})`)
  }

  commit(_endpoint: string, _body: unknown[]): void {
    // noop — cost is reserved at call time. Refund logic could go here.
  }

  /** Inspect current usage. Handy for a future status endpoint or UI banner. */
  getStatus(): { spentUsd: number; budgetUsd: number; windowMin: number; entries: number } {
    const now = Date.now()
    return {
      spentUsd: this.spentUsd(now),
      budgetUsd: budgetUsd(),
      windowMin: windowMs() / 60000,
      entries: this.entries.length,
    }
  }

  /** Reset — test helper, do not use in production paths. */
  _reset(): void {
    this.entries = []
  }
}

export const costGuard = new CostGuard()
