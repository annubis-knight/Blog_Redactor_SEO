import { log } from '../../utils/logger.js'
import {
  getKeywordMetrics,
  upsertKeywordPaa,
  isKeywordMetricsFresh,
} from '../keyword/keyword-metrics.service.js'
import type { PaaCacheEntry } from '../../../shared/types/intent.types.js'

// Sprint 15.3 — PAA storage moved to `keyword_metrics.paa_questions`.
// Same keyword = same PAA regardless of article: Google's PAA depends only on
// the search query. Freshness: 1 day for non-empty, 30 min for empty.

export async function readPaaCache(keyword: string, requiredDepth: number = 1): Promise<PaaCacheEntry | null> {
  const metrics = await getKeywordMetrics(keyword)
  if (!metrics || metrics.paaQuestions.length === 0) return null

  // Freshness check: 1 day for non-empty (always the case here given the guard above).
  if (!isKeywordMetricsFresh(metrics.fetchedAt, 1)) {
    log.debug(`PAA DB hit but stale for "${keyword}"`)
    return null
  }

  const maxCachedDepth = Math.max(...metrics.paaQuestions.map(q => q.depth ?? 1), 1)
  if (maxCachedDepth < requiredDepth) {
    log.debug(`PAA DB depth mismatch for "${keyword}": stored=${maxCachedDepth}, requested=${requiredDepth}`)
    return null
  }

  log.debug(`PAA DB hit for "${keyword}" (${metrics.paaQuestions.length} questions, depth=${maxCachedDepth})`)
  return {
    keyword,
    paaItems: metrics.paaQuestions.map(q => ({
      question: q.question,
      answer: q.answer ?? undefined,
      depth: q.depth ?? 1,
      parentQuestion: q.parentQuestion,
    })),
    maxDepth: maxCachedDepth,
    isEmpty: false,
    cachedAt: metrics.fetchedAt,
  }
}

export async function writePaaCache(entry: PaaCacheEntry): Promise<void> {
  await upsertKeywordPaa(entry.keyword, entry.paaItems)
  log.debug(`PAA DB written for "${entry.keyword}" (${entry.paaItems.length} questions)`)
}

