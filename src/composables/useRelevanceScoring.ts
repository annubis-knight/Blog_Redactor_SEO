import { ref, computed, type ComputedRef, type Ref } from 'vue'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { DiscoveredKeyword } from '@shared/types/discovery-tab.types'

const RELEVANCE_THRESHOLD = 0.5
const MAX_RELEVANCE_SCORES = 500
const SCORE_BATCH_SIZE = 40
const SCORE_CONCURRENCY = 3

function normalizeToken(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export interface RelevanceScoringDeps {
  lastSeed: Ref<string>
  lastArticleContext: Ref<{ title?: string; painPoint?: string }>
  allKeywordsFlat: ComputedRef<DiscoveredKeyword[]>
  uniqueKeywordCount: ComputedRef<number>
}

export function useRelevanceScoring(deps: RelevanceScoringDeps) {
  const relevanceScores = ref<Map<string, number>>(new Map())
  const semanticLoading = ref(false)
  const scoringProgress = ref({ scored: 0, total: 0, pass: 0 })
  const relevanceFilterEnabled = ref(true)
  const filteringSuspect = ref(false)

  let _scoringInProgress = false
  let _scoreQueuePending = false

  const seedTokens = computed<string[]>(() => {
    if (!deps.lastSeed.value) return []
    return deps.lastSeed.value.trim().split(/\s+/).filter(w => w.length >= 3).map(normalizeToken)
  })

  function checkRelevance(keyword: string): boolean {
    if (seedTokens.value.length === 0) return true
    const score = relevanceScores.value.get(keyword.toLowerCase())
    if (score !== undefined) return score >= RELEVANCE_THRESHOLD
    return true
  }

  function matchesRelevance(keyword: string): boolean {
    if (!relevanceFilterEnabled.value) return true
    return checkRelevance(keyword)
  }

  function toggleRelevanceFilter() {
    relevanceFilterEnabled.value = !relevanceFilterEnabled.value
  }

  function isRelevant(keyword: string): boolean {
    return checkRelevance(keyword)
  }

  function getRelevanceScore(keyword: string): number | null {
    return relevanceScores.value.get(keyword.toLowerCase()) ?? null
  }

  const irrelevantCount = computed(() => {
    if (!relevanceFilterEnabled.value) return 0
    return deps.allKeywordsFlat.value.filter(kw => !matchesRelevance(kw.keyword)).length
  })

  const relevantCount = computed(() => {
    if (!relevanceFilterEnabled.value) return deps.uniqueKeywordCount.value
    const seen = new Set<string>()
    for (const kw of deps.allKeywordsFlat.value) {
      const key = kw.keyword.toLowerCase()
      if (!seen.has(key) && matchesRelevance(kw.keyword)) seen.add(key)
    }
    return seen.size
  })

  // --- Scoring API ---

  async function scoreBatch(
    seed: string,
    keywords: string[],
    strict: boolean,
  ): Promise<Record<string, number> | null> {
    try {
      const result = await apiPost<{ scores: Record<string, number>; fallback: boolean }>(
        '/keywords/relevance-score',
        { seed, keywords, strict, articleContext: deps.lastArticleContext.value },
      )
      return result.fallback ? null : result.scores
    } catch (err) {
      log.warn(`Relevance batch failed: ${(err as Error).message}`)
      return null
    }
  }

  function mergeScores(scores: Record<string, number>) {
    const next = new Map(relevanceScores.value)
    for (const [kw, score] of Object.entries(scores)) {
      next.set(kw, score)
    }
    if (next.size > MAX_RELEVANCE_SCORES) {
      const entries = [...next.entries()]
      relevanceScores.value = new Map(entries.slice(entries.length - MAX_RELEVANCE_SCORES))
      return
    }
    relevanceScores.value = next
  }

  async function scoreBatchesConcurrently(
    seed: string,
    keywords: string[],
    strict: boolean,
    pass: number,
  ): Promise<void> {
    const batches: string[][] = []
    for (let i = 0; i < keywords.length; i += SCORE_BATCH_SIZE) {
      batches.push(keywords.slice(i, i + SCORE_BATCH_SIZE))
    }

    let completed = 0
    const total = keywords.length
    const queue = [...batches]
    const workers = Array.from({ length: Math.min(SCORE_CONCURRENCY, queue.length) }, async () => {
      while (queue.length > 0) {
        const batch = queue.shift()!
        const scores = await scoreBatch(seed, batch, strict)
        if (scores) mergeScores(scores)
        completed += batch.length
        scoringProgress.value = { scored: Math.min(completed, total), total, pass }
      }
    })

    await Promise.all(workers)
  }

  async function fetchRelevanceScores() {
    const seed = deps.lastSeed.value
    if (!seed) return

    if (_scoringInProgress) {
      _scoreQueuePending = true
      return
    }

    const unscored = [...new Set(
      deps.allKeywordsFlat.value
        .map(kw => kw.keyword.toLowerCase())
        .filter(kw => !relevanceScores.value.has(kw)),
    )]
    if (unscored.length === 0) return

    _scoringInProgress = true
    semanticLoading.value = true
    scoringProgress.value = { scored: 0, total: unscored.length, pass: 1 }
    try {
      await scoreBatchesConcurrently(seed, unscored, false, 1)
      log.info(`Relevance pass-1: ${unscored.length} keywords scored`)

      const relevant = [...relevanceScores.value.entries()]
        .filter(([_, score]) => score >= RELEVANCE_THRESHOLD)
        .map(([kw]) => kw)

      if (relevant.length > 0) {
        scoringProgress.value = { scored: 0, total: relevant.length, pass: 2 }
        await scoreBatchesConcurrently(seed, relevant, true, 2)
        const downgraded = relevant.filter(kw => (relevanceScores.value.get(kw) ?? 1) < RELEVANCE_THRESHOLD)
        log.info(`Relevance pass-2 (strict): ${relevant.length} re-checked, ${downgraded.length} downgraded`)
      }
    } catch (err) {
      log.warn(`Relevance scoring failed: ${(err as Error).message}`)
    } finally {
      _scoringInProgress = false
      semanticLoading.value = false

      const totalUnique = deps.uniqueKeywordCount.value
      const totalRelevant = relevantCount.value
      if (totalUnique >= 20 && totalRelevant / totalUnique > 0.9) {
        filteringSuspect.value = true
        log.warn(
          `[Relevance] Sanity check FAILED: ${totalRelevant}/${totalUnique} keywords passed ` +
          `(${Math.round((totalRelevant / totalUnique) * 100)}%). ` +
          `Filtering likely had no effect — API calls may have failed.`,
        )
      } else {
        filteringSuspect.value = false
      }

      if (_scoreQueuePending) {
        _scoreQueuePending = false
        fetchRelevanceScores()
      }
    }
  }

  function resetScores() {
    relevanceFilterEnabled.value = true
    relevanceScores.value = new Map()
    semanticLoading.value = false
    scoringProgress.value = { scored: 0, total: 0, pass: 0 }
    _scoringInProgress = false
    _scoreQueuePending = false
    filteringSuspect.value = false
  }

  return {
    relevanceScores,
    relevanceFilterEnabled,
    semanticLoading,
    scoringProgress,
    filteringSuspect,
    irrelevantCount,
    relevantCount,
    fetchRelevanceScores,
    checkRelevance,
    matchesRelevance,
    toggleRelevanceFilter,
    isRelevant,
    getRelevanceScore,
    resetScores,
  }
}
