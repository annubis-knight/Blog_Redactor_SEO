/**
 * AUTHORITY: mémoire de la découverte en cours (`relevanceScores`, un jugement
 *            par mot-clé en minuscules), sauvegardée avec la découverte
 *            (`keyword_discoveries.sources_json`, via useDiscoveryCache).
 * READS FROM: POST /keywords/relevance-score (jugement IA par lots).
 * WRITES TO: rien directement (la sauvegarde passe par useDiscoveryPanel).
 * CONSUMERS: useDiscoveryPanel (filtre des sections, compteurs, analyse IA,
 *            sauvegarde), DiscoveryPanel.vue (ligne « Filtre de pertinence »).
 * RELATED FR: FR-DIS-RELEVANCE-FILTER, FR-DIS-CACHE.
 */
import { ref, computed, type ComputedRef, type Ref } from 'vue'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import { relevanceScoreContract } from '@shared/contracts/discovery.contract.js'
import type { DiscoveredKeyword } from '@shared/types/discovery-tab.types'

const RELEVANCE_THRESHOLD = 0.5

// Why: Claude handles a numbered list of 120 items well; the prompt is short,
// the bottleneck was call count not input tokens. Also raises concurrency to 4.
const SCORE_BATCH_SIZE = 120
const SCORE_CONCURRENCY = 4
// Skip the strict pass-2 when pass-1 only filtered out <10% of keywords —
// the strict check is redundant on cohesive topics and was doubling cost.
const STRICT_PASS_TRIGGER_RATIO = 0.10

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
      const result = await apiPost(
        '/keywords/relevance-score',
        { seed, keywords, strict, articleContext: deps.lastArticleContext.value },
        { contract: relevanceScoreContract },
      )
      return result.fallback ? null : result.scores
    } catch (err) {
      log.warn(`Relevance batch failed: ${(err as Error).message}`)
      return null
    }
  }

  /**
   * Garde TOUS les jugements de la découverte en cours (remis à zéro à chaque
   * nouvelle racine, `resetScores`). L'ancien plafond de 500 oubliait les
   * premiers jugés dès qu'une découverte dépassait 500 mots-clés (cas courant :
   * 644, 1004 en recette) : ils repassaient pour « pertinents » faute de note,
   * et étaient rejugés, donc repayés en réel, à chaque ajout de mots-clés
   * (recette 2026-09-30, DIS-5 / DIS-6, FR-DIS-RELEVANCE-FILTER).
   */
  function mergeScores(scores: Record<string, number>) {
    const next = new Map(relevanceScores.value)
    for (const [kw, score] of Object.entries(scores)) {
      next.set(kw, score)
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

      // Passe stricte : seulement les mots-clés jugés pendant CETTE passe. Elle
      // reprenait tous les pertinents déjà connus, et les rejugeait (et les
      // repayait) à chaque arrivée de nouveaux mots-clés.
      const scoredThisRun = unscored.filter(kw => relevanceScores.value.has(kw))
      const relevant = scoredThisRun.filter(kw => (relevanceScores.value.get(kw) ?? 0) >= RELEVANCE_THRESHOLD)

      // least STRICT_PASS_TRIGGER_RATIO of keywords. Cohesive topics where
      // pass-1 rejects almost nothing don't benefit from the strict recheck
      // and the extra call is pure cost.
      const pass1Rejected = scoredThisRun.length - relevant.length
      const pass1RejectRatio = scoredThisRun.length > 0 ? pass1Rejected / scoredThisRun.length : 0

      if (relevant.length > 0 && pass1RejectRatio >= STRICT_PASS_TRIGGER_RATIO) {
        scoringProgress.value = { scored: 0, total: relevant.length, pass: 2 }
        await scoreBatchesConcurrently(seed, relevant, true, 2)
        const downgraded = relevant.filter(kw => (relevanceScores.value.get(kw) ?? 1) < RELEVANCE_THRESHOLD)
        log.info(`Relevance pass-2 (strict): ${relevant.length} re-checked, ${downgraded.length} downgraded`)
      } else if (relevant.length > 0) {
        log.info(`Relevance pass-2 skipped: pass-1 reject ratio ${(pass1RejectRatio * 100).toFixed(1)}% below threshold ${(STRICT_PASS_TRIGGER_RATIO * 100).toFixed(0)}%`)
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
