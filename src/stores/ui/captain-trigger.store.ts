import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ValidateResponse, ArticleLevel, CaptainValidationEntry } from '@shared/types/index.js'

/**
 * Sprint 16 refinement — Global Pinia store for the Discovery→Captain pre-validation.
 *
 * Why a store (not just a composable): the Gmail-style "Sending... Undo" toast lives
 * globally (rendered near the cost log), but the click happens inside a specific
 * component. A shared store is the cleanest way to have both sides see the same
 * pending list.
 *
 * Behavior: schedule() adds a pending item that fires a validation after
 * SCHEDULED_MS. Clicking cancel() (either from the keyword item or the toast)
 * removes it before it fires.
 */

const SCHEDULED_MS = 5_000

export interface PendingValidation {
  keyword: string
  articleId: number
  articleLevel: ArticleLevel
  /** ms epoch when the timeout will fire */
  firesAt: number
}

export const useCaptainTriggerStore = defineStore('captain-trigger', () => {
  const pending = ref<Map<string, PendingValidation>>(new Map())
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const recentlyFired = ref<string[]>([])

  function schedule(keyword: string, articleId: number, articleLevel: ArticleLevel) {
    const key = keyword.toLowerCase()
    if (pending.value.has(key)) return

    const firesAt = Date.now() + SCHEDULED_MS
    pending.value = new Map(pending.value).set(key, { keyword, articleId, articleLevel, firesAt })

    const timeoutId = setTimeout(() => {
      timers.delete(key)
      const entry = pending.value.get(key)
      if (!entry) return
      pending.value.delete(key)
      pending.value = new Map(pending.value)
      runValidation(entry)
    }, SCHEDULED_MS)
    timers.set(key, timeoutId)
    log.debug('[captainTrigger] scheduled', { keyword, articleId, firesAt })
  }

  function cancel(keyword: string) {
    const key = keyword.toLowerCase()
    const timeoutId = timers.get(key)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timers.delete(key)
    }
    if (pending.value.has(key)) {
      pending.value.delete(key)
      pending.value = new Map(pending.value)
      log.debug('[captainTrigger] cancelled', { keyword })
    }
  }

  function cancelAll() {
    for (const timeoutId of timers.values()) clearTimeout(timeoutId)
    timers.clear()
    pending.value = new Map()
  }

  function hasPending(keyword: string): boolean {
    return pending.value.has(keyword.toLowerCase())
  }

  async function runValidation(entry: PendingValidation) {
    try {
      const response = await apiPost<ValidateResponse>(
        `/keywords/${encodeURIComponent(entry.keyword)}/validate`,
        { level: entry.articleLevel },
      )
      const exploration: CaptainValidationEntry = {
        keyword: response.keyword,
        articleLevel: entry.articleLevel,
        kpis: response.kpis.map(k => ({ name: k.name, rawValue: k.rawValue })),
        rootKeywords: [],
        paaQuestions: response.paaQuestions,
      }
      await apiPost(`/articles/${entry.articleId}/captain-explorations`, exploration)
      // Surface in a short-lived list so the toast can briefly display a success line.
      recentlyFired.value = [entry.keyword, ...recentlyFired.value].slice(0, 5)
      setTimeout(() => {
        recentlyFired.value = recentlyFired.value.filter(k => k !== entry.keyword)
      }, 4000)
      log.info('[captainTrigger] validated & persisted', { keyword: entry.keyword, articleId: entry.articleId })
    } catch (err) {
      log.warn('[captainTrigger] validation failed (silent)', { keyword: entry.keyword, error: (err as Error).message })
    }
  }

  return { pending, recentlyFired, schedule, cancel, cancelAll, hasPending }
})
