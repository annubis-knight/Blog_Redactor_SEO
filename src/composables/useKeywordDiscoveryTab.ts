import { ref, computed } from 'vue'
import { apiGet, apiPost, apiDelete } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { DiscoveredKeyword, DiscoverySource, WordGroup, SuggestAllResult } from '@shared/types/discovery-tab.types'
import { toRadarKeywords } from '@shared/types/discovery-tab.types'
import type { KeywordRadarGenerateResult } from '@shared/types/intent.types'
import type { KeywordDiscoveryResult } from '@shared/types/keyword-discovery.types'
import type { RadarKeyword } from '@shared/types/intent.types'
import type { DiscoveryCacheEntry, DiscoveryCacheStatus, DiscoveryContext } from '@shared/types/discovery-cache.types'

// --- Helpers (stemmer ported from server/services/intent-scan.service.ts) ---

const TOKEN_RE = /[\s\-_.,;:!?'"()\[\]{}/\\]+/

function normalizeToken(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const STEM_SUFFIXES = [
  'issements', 'issement', 'alisations', 'alisation', 'ifications', 'ification',
  'issantes', 'issante', 'issants', 'issant', 'issaient',
  'ements', 'ement', 'ations', 'ation', 'ances', 'ance', 'ences', 'ence',
  'ments', 'ment', 'ibles', 'ible', 'ables', 'able', 'iques', 'ique',
  'euses', 'euse', 'eurs', 'eur', 'ions', 'ion', 'ites', 'ite',
  'ants', 'ant', 'ents', 'ent', 'eaux', 'aux',
  'ees', 'ee', 'ies', 'ie', 'er', 'ir', 're',
  'fs', 'if', 'es', 's', 'e',
]

function stemFrench(word: string): string {
  if (word.length <= 3) return word
  for (const suffix of STEM_SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length)
    }
  }
  return word
}

function stemsMatch(a: string, b: string): boolean {
  if (a === b) return true
  const stemA = stemFrench(a)
  const stemB = stemFrench(b)
  if (stemA === stemB) return true
  if (stemA.length >= 4 && stemB.length >= 4) {
    if (stemA.includes(stemB) || stemB.includes(stemA)) return true
  }
  return false
}

// --- Module-level state (singleton) — persists across tab switches ---

// Relevance filter
const lastSeed = ref('')
const lastArticleContext = ref<{ title?: string; painPoint?: string }>({})
const relevanceFilterEnabled = ref(true)

// Semantic relevance scores (keyword lowercase → 0 or 1)
const relevanceScores = ref<Map<string, number>>(new Map())
const semanticLoading = ref(false)
const scoringProgress = ref({ scored: 0, total: 0, pass: 0 })
const RELEVANCE_THRESHOLD = 0.5
let _scoringInProgress = false
let _scoreQueuePending = false

// Post-filter sanity check
const filteringSuspect = ref(false)

// AI Analysis
export interface AnalyzedKeyword {
  keyword: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
}
export interface AnalysisResult {
  keywords: AnalyzedKeyword[]
  summary: string
}
const analysisResult = ref<AnalysisResult | null>(null)
const analysisLoading = ref(false)

// Discovery cache
const cacheStatus = ref<DiscoveryCacheStatus | null>(null)
const cacheLoading = ref(false)

// Source colors for multi-source indicator
const SOURCE_COLORS: Record<DiscoverySource, string> = {
  'suggest-alphabet': '#2563eb',
  'suggest-questions': '#15803d',
  'suggest-intents': '#ea580c',
  'suggest-prepositions': '#7c3aed',
  'ai': '#db2777',
  'dataforseo': '#b45309',
  'autocomplete': '#64748b',
}

// Source results
const suggestAlphabetKw = ref<DiscoveredKeyword[]>([])
const suggestQuestionsKw = ref<DiscoveredKeyword[]>([])
const suggestIntentsKw = ref<DiscoveredKeyword[]>([])
const suggestPrepositionsKw = ref<DiscoveredKeyword[]>([])
const aiKeywords = ref<DiscoveredKeyword[]>([])
const dataforseoKeywords = ref<DiscoveredKeyword[]>([])

// Loading states
const suggestLoading = ref(false)
const aiLoading = ref(false)
const dataforseoLoading = ref(false)

const error = ref<string | null>(null)

// Selection (by lowercase keyword string)
const selected = ref<Set<string>>(new Set())

// Word groups (computed from all results)
const wordGroups = ref<WordGroup[]>([])
const wordGroupsLoading = ref(false)

// Active word group filter (null = show all)
const activeGroupFilter = ref<string | null>(null)

// Cache key
const lastFetchKey = ref('')

function buildFetchKey(seed: string, articleTitle?: string, articleKeyword?: string, painPoint?: string): string {
  return [seed, articleTitle ?? '', articleKeyword ?? '', painPoint ?? ''].join('|').toLowerCase()
}

export function useKeywordDiscoveryTab() {
  const isAnyLoading = computed(() =>
    suggestLoading.value || aiLoading.value || dataforseoLoading.value,
  )

  const selectedCount = computed(() => selected.value.size)

  const hasResults = computed(() =>
    suggestAlphabetKw.value.length > 0 ||
    suggestQuestionsKw.value.length > 0 ||
    suggestIntentsKw.value.length > 0 ||
    suggestPrepositionsKw.value.length > 0 ||
    aiKeywords.value.length > 0 ||
    dataforseoKeywords.value.length > 0,
  )

  // All keywords flat (for word group computation)
  const allKeywordsFlat = computed(() => [
    ...suggestAlphabetKw.value,
    ...suggestQuestionsKw.value,
    ...suggestIntentsKw.value,
    ...suggestPrepositionsKw.value,
    ...aiKeywords.value,
    ...dataforseoKeywords.value,
  ])

  // --- Relevance filter (stem-based) ---
  const seedTokens = computed<string[]>(() => {
    if (!lastSeed.value) return []
    return lastSeed.value.trim().split(/\s+/).filter(w => w.length >= 3).map(normalizeToken)
  })

  /** Check relevance — uses Haiku score; unscored keywords are treated as relevant (pending) */
  function checkRelevance(keyword: string): boolean {
    if (seedTokens.value.length === 0) return true
    const score = relevanceScores.value.get(keyword.toLowerCase())
    if (score !== undefined) return score >= RELEVANCE_THRESHOLD
    // Not yet scored by Haiku — treat as relevant (will be filtered once score arrives)
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

  /** Get the semantic score for a keyword (null if not yet scored) */
  function getRelevanceScore(keyword: string): number | null {
    return relevanceScores.value.get(keyword.toLowerCase()) ?? null
  }

  const irrelevantCount = computed(() => {
    if (!relevanceFilterEnabled.value) return 0
    return allKeywordsFlat.value.filter(kw => !matchesRelevance(kw.keyword)).length
  })

  // Deduplicated unique keyword count
  const uniqueKeywordCount = computed(() => {
    const seen = new Set<string>()
    for (const kw of allKeywordsFlat.value) seen.add(kw.keyword.toLowerCase())
    return seen.size
  })

  const relevantCount = computed(() => {
    if (!relevanceFilterEnabled.value) return uniqueKeywordCount.value
    const seen = new Set<string>()
    for (const kw of allKeywordsFlat.value) {
      const key = kw.keyword.toLowerCase()
      if (!seen.has(key) && matchesRelevance(kw.keyword)) seen.add(key)
    }
    return seen.size
  })

  // --- Unified filter (group + relevance) + sort multi-source first ---
  function filteredList(list: DiscoveredKeyword[]): DiscoveredKeyword[] {
    return list
      .filter(kw => matchesGroupFilter(kw.keyword) && matchesRelevance(kw.keyword))
      .sort((a, b) => {
        const aCount = crossSourceMap.value.get(a.keyword.toLowerCase())?.size ?? 0
        const bCount = crossSourceMap.value.get(b.keyword.toLowerCase())?.size ?? 0
        return bCount - aCount // multi-source first
      })
  }

  // --- Cross-source map ---
  const crossSourceMap = computed<Map<string, Set<DiscoverySource>>>(() => {
    const map = new Map<string, Set<DiscoverySource>>()
    for (const kw of allKeywordsFlat.value) {
      const key = kw.keyword.toLowerCase()
      if (!map.has(key)) map.set(key, new Set())
      map.get(key)!.add(kw.source)
    }
    return map
  })

  function getKeywordSources(keyword: string): DiscoverySource[] {
    const sources = crossSourceMap.value.get(keyword.toLowerCase())
    return sources ? [...sources] : []
  }

  function isMultiSource(keyword: string): boolean {
    return (crossSourceMap.value.get(keyword.toLowerCase())?.size ?? 0) >= 2
  }

  // --- Launch all sources in parallel ---
  function discover(seed: string, articleTitle?: string, articleKeyword?: string, painPoint?: string) {
    const key = buildFetchKey(seed, articleTitle, articleKeyword, painPoint)

    if (key === lastFetchKey.value && hasResults.value && !isAnyLoading.value) {
      log.info('Discovery: résultats en cache, skip API calls', { seed })
      return
    }

    lastFetchKey.value = key
    lastSeed.value = seed
    lastArticleContext.value = { title: articleTitle, painPoint: painPoint }
    relevanceScores.value = new Map()
    _scoringInProgress = false
    _scoreQueuePending = false
    suggestAlphabetKw.value = []
    suggestQuestionsKw.value = []
    suggestIntentsKw.value = []
    suggestPrepositionsKw.value = []
    aiKeywords.value = []
    dataforseoKeywords.value = []
    wordGroups.value = []
    activeGroupFilter.value = null
    selected.value = new Set()
    error.value = null

    // 1. Google Suggest — all 4 strategies in one call (~5-8s, free)
    suggestLoading.value = true
    apiPost<SuggestAllResult>('/keywords/suggest-all', { keyword: seed })
      .then(data => {
        suggestAlphabetKw.value = data.alphabet.items.map(i => ({
          keyword: i.query,
          source: 'suggest-alphabet' as const,
          sourceDetail: i.source,
        }))
        suggestQuestionsKw.value = data.questions.items.map(i => ({
          keyword: i.query,
          source: 'suggest-questions' as const,
          sourceDetail: i.source,
        }))
        suggestIntentsKw.value = data.intents.items.map(i => ({
          keyword: i.query,
          source: 'suggest-intents' as const,
          sourceDetail: i.source,
        }))
        suggestPrepositionsKw.value = data.prepositions.items.map(i => ({
          keyword: i.query,
          source: 'suggest-prepositions' as const,
          sourceDetail: i.source,
        }))
        log.info(`Discovery: ${data.totalUnique} total suggest keywords (alphabet: ${data.alphabet.count}, questions: ${data.questions.count}, intents: ${data.intents.count}, prepositions: ${data.prepositions.count})`)

        // Trigger word groups + semantic scoring after suggest results arrive
        fetchWordGroups()
        fetchRelevanceScores()
      })
      .catch(err => {
        log.warn(`Discovery suggest failed: ${(err as Error).message}`)
      })
      .finally(() => { suggestLoading.value = false })

    // 2. AI generation via Claude Haiku (~2s)
    if (articleTitle || articleKeyword) {
      aiLoading.value = true
      apiPost<KeywordRadarGenerateResult>('/keywords/radar/generate', {
        title: articleTitle || seed,
        keyword: articleKeyword || seed,
        painPoint: painPoint || seed,
      })
        .then(data => {
          aiKeywords.value = data.keywords.map(k => ({
            keyword: k.keyword,
            source: 'ai' as const,
            reasoning: k.reasoning,
          }))
          log.info(`Discovery: ${data.keywords.length} AI-generated keywords`)
          fetchRelevanceScores()
        })
        .catch(err => {
          log.warn(`Discovery AI generation failed: ${(err as Error).message}`)
          aiKeywords.value = []
        })
        .finally(() => { aiLoading.value = false })
    }

    // 3. DataForSEO discovery (~5-10s, paid)
    dataforseoLoading.value = true
    apiPost<KeywordDiscoveryResult>('/keywords/discover', { keyword: seed, options: { maxResults: 100 } })
      .then(data => {
        dataforseoKeywords.value = data.keywords.map(k => ({
          keyword: k.keyword,
          source: 'dataforseo' as const,
          searchVolume: k.searchVolume,
          difficulty: k.difficulty,
          cpc: k.cpc,
          intent: k.intent,
          type: k.type,
        }))
        log.info(`Discovery: ${data.keywords.length} DataForSEO keywords`)

        // Refresh word groups + semantic scoring with DataForSEO results included
        fetchWordGroups()
        fetchRelevanceScores()
      })
      .catch(err => {
        log.warn(`Discovery DataForSEO failed: ${(err as Error).message}`)
        dataforseoKeywords.value = []
      })
      .finally(() => { dataforseoLoading.value = false })
  }

  // --- Relevance scoring via Haiku (batched + 2-pass with concurrency) ---
  const SCORE_BATCH_SIZE = 40
  const SCORE_CONCURRENCY = 3

  async function scoreBatch(
    seed: string,
    keywords: string[],
    strict: boolean,
  ): Promise<Record<string, number> | null> {
    try {
      const result = await apiPost<{ scores: Record<string, number>; fallback: boolean }>(
        '/keywords/relevance-score',
        { seed, keywords, strict, articleContext: lastArticleContext.value },
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
    relevanceScores.value = next
  }

  /** Run batches with limited concurrency, merging results as they arrive */
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

    // Process batches with concurrency pool
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
    const seed = lastSeed.value
    if (!seed) return

    if (_scoringInProgress) {
      _scoreQueuePending = true
      return
    }

    // Only score keywords not already scored
    const unscored = [...new Set(
      allKeywordsFlat.value
        .map(kw => kw.keyword.toLowerCase())
        .filter(kw => !relevanceScores.value.has(kw)),
    )]
    if (unscored.length === 0) return

    _scoringInProgress = true
    semanticLoading.value = true
    const totalToScore = unscored.length
    scoringProgress.value = { scored: 0, total: totalToScore, pass: 1 }
    try {
      // Pass 1: Score all unscored keywords (concurrent batches of 40)
      await scoreBatchesConcurrently(seed, unscored, false, 1)
      log.info(`Relevance pass-1: ${unscored.length} keywords scored`)

      // Pass 2: Re-verify keywords marked as relevant (stricter check)
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

      // Sanity check: if almost no keywords were filtered, relevance scoring likely failed
      const totalUnique = uniqueKeywordCount.value
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

  // --- Word groups (computed on backend from all keywords) ---
  function fetchWordGroups() {
    const allKw = allKeywordsFlat.value.map(k => k.keyword)
    if (allKw.length < 5) return // not enough data for meaningful groups

    wordGroupsLoading.value = true
    apiPost<{ groups: WordGroup[] }>('/keywords/word-groups', { keywords: allKw })
      .then(data => {
        wordGroups.value = data.groups
        log.info(`Discovery: ${data.groups.length} word groups`)
      })
      .catch(err => {
        log.warn(`Word groups failed: ${(err as Error).message}`)
      })
      .finally(() => { wordGroupsLoading.value = false })
  }

  // --- Filter by word group ---
  function setGroupFilter(word: string | null) {
    activeGroupFilter.value = word
  }

  function matchesGroupFilter(keyword: string): boolean {
    if (!activeGroupFilter.value) return true
    const target = activeGroupFilter.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const tokens = keyword.toLowerCase().split(/[\s\-_.,;:!?'"()\[\]{}/\\]+/)
    return tokens.some(t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === target)
  }

  // --- Selection helpers ---
  function toggleSelect(keyword: string) {
    const key = keyword.toLowerCase()
    const next = new Set(selected.value)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    selected.value = next
  }

  function isSelected(keyword: string): boolean {
    return selected.value.has(keyword.toLowerCase())
  }

  function selectAllInSource(source: DiscoverySource) {
    const list = filteredList(getSourceList(source))
    const next = new Set(selected.value)
    for (const kw of list) next.add(kw.keyword.toLowerCase())
    selected.value = next
  }

  function deselectAllInSource(source: DiscoverySource) {
    const list = getSourceList(source)
    const next = new Set(selected.value)
    for (const kw of list) next.delete(kw.keyword.toLowerCase())
    selected.value = next
  }

  function isAllSourceSelected(source: DiscoverySource): boolean {
    const list = filteredList(getSourceList(source))
    if (list.length === 0) return false
    return list.every(kw => selected.value.has(kw.keyword.toLowerCase()))
  }

  function getSourceList(source: DiscoverySource): DiscoveredKeyword[] {
    switch (source) {
      case 'suggest-alphabet': return suggestAlphabetKw.value
      case 'suggest-questions': return suggestQuestionsKw.value
      case 'suggest-intents': return suggestIntentsKw.value
      case 'suggest-prepositions': return suggestPrepositionsKw.value
      case 'ai': return aiKeywords.value
      case 'dataforseo': return dataforseoKeywords.value
      default: return []
    }
  }

  function selectAll() {
    const next = new Set(selected.value)
    for (const kw of allKeywordsFlat.value) {
      if (matchesGroupFilter(kw.keyword) && matchesRelevance(kw.keyword)) next.add(kw.keyword.toLowerCase())
    }
    selected.value = next
  }

  function deselectAll() {
    selected.value = new Set()
  }

  // --- Select All / Deselect All for AI Analysis results ---
  function selectAllAnalysis() {
    if (!analysisResult.value) return
    const next = new Set(selected.value)
    for (const kw of analysisResult.value.keywords) next.add(kw.keyword.toLowerCase())
    selected.value = next
  }

  function deselectAllAnalysis() {
    if (!analysisResult.value) return
    const next = new Set(selected.value)
    for (const kw of analysisResult.value.keywords) next.delete(kw.keyword.toLowerCase())
    selected.value = next
  }

  function isAllAnalysisSelected(): boolean {
    if (!analysisResult.value || analysisResult.value.keywords.length === 0) return false
    return analysisResult.value.keywords.every(kw => selected.value.has(kw.keyword.toLowerCase()))
  }

  // --- Discovery cache ---
  async function checkCacheForSeed(seed: string): Promise<void> {
    if (!seed.trim()) {
      cacheStatus.value = null
      return
    }
    cacheLoading.value = true
    try {
      const status = await apiGet<DiscoveryCacheStatus>(`/discovery-cache/check?seed=${encodeURIComponent(seed.trim())}`)
      cacheStatus.value = status
    } catch {
      cacheStatus.value = null
    } finally {
      cacheLoading.value = false
    }
  }

  async function loadFromCache(seed: string): Promise<boolean> {
    try {
      const entry = await apiGet<DiscoveryCacheEntry | null>(`/discovery-cache/load?seed=${encodeURIComponent(seed.trim())}`)
      if (!entry) return false

      // Hydrate all refs from cache
      lastSeed.value = entry.seed
      lastFetchKey.value = buildFetchKey(entry.seed, entry.context.articleTitle, entry.context.articleKeyword, entry.context.painPoint)
      lastArticleContext.value = { title: entry.context.articleTitle, painPoint: entry.context.painPoint }
      suggestAlphabetKw.value = entry.suggestAlphabet
      suggestQuestionsKw.value = entry.suggestQuestions
      suggestIntentsKw.value = entry.suggestIntents
      suggestPrepositionsKw.value = entry.suggestPrepositions
      aiKeywords.value = entry.aiKeywords
      dataforseoKeywords.value = entry.dataforseoKeywords
      relevanceScores.value = new Map(Object.entries(entry.relevanceScores))
      wordGroups.value = entry.wordGroups
      analysisResult.value = entry.analysisResult
      selected.value = new Set()
      error.value = null
      _scoringInProgress = false
      _scoreQueuePending = false
      semanticLoading.value = false

      log.info(`Discovery: loaded from cache for "${seed}"`)
      return true
    } catch (err) {
      log.warn(`Discovery: cache load failed: ${(err as Error).message}`)
      return false
    }
  }

  async function saveToCache(context: DiscoveryContext): Promise<void> {
    try {
      await apiPost('/discovery-cache/save', {
        seed: lastSeed.value,
        context,
        suggestAlphabet: suggestAlphabetKw.value,
        suggestQuestions: suggestQuestionsKw.value,
        suggestIntents: suggestIntentsKw.value,
        suggestPrepositions: suggestPrepositionsKw.value,
        aiKeywords: aiKeywords.value,
        dataforseoKeywords: dataforseoKeywords.value,
        relevanceScores: Object.fromEntries(relevanceScores.value),
        wordGroups: wordGroups.value,
        analysisResult: analysisResult.value,
      })
      cacheStatus.value = { cached: true, cachedAt: new Date().toISOString() }
      log.info(`Discovery: results saved to cache for "${lastSeed.value}"`)
    } catch (err) {
      log.warn(`Discovery: cache save failed: ${(err as Error).message}`)
    }
  }

  async function clearCacheForSeed(seed: string): Promise<void> {
    try {
      await apiDelete(`/discovery-cache?seed=${encodeURIComponent(seed.trim())}`)
      cacheStatus.value = null
      log.info(`Discovery: cache cleared for "${seed}"`)
    } catch (err) {
      log.warn(`Discovery: cache clear failed: ${(err as Error).message}`)
    }
  }

  // --- Convert selected to RadarKeyword[] (deduplicated) ---
  function getRadarKeywords(): RadarKeyword[] {
    const all: DiscoveredKeyword[] = [
      ...dataforseoKeywords.value,
      ...aiKeywords.value,
      ...suggestAlphabetKw.value,
      ...suggestQuestionsKw.value,
      ...suggestIntentsKw.value,
      ...suggestPrepositionsKw.value,
    ].filter(kw => selected.value.has(kw.keyword.toLowerCase()))

    const result = toRadarKeywords(all)

    // Also include keywords from AI analysis that are selected but not in source lists
    if (analysisResult.value) {
      const seen = new Set(result.map(r => r.keyword.toLowerCase()))
      for (const kw of analysisResult.value.keywords) {
        if (selected.value.has(kw.keyword.toLowerCase()) && !seen.has(kw.keyword.toLowerCase())) {
          seen.add(kw.keyword.toLowerCase())
          result.push({ keyword: kw.keyword, reasoning: kw.reasoning })
        }
      }
    }

    return result
  }

  // --- AI Analysis: curate top 20-30 keywords ---
  async function analyzeResults() {
    if (analysisLoading.value) return
    analysisLoading.value = true
    analysisResult.value = null

    try {
      // Build deduplicated keyword list with metadata + sources
      const seen = new Set<string>()
      const kwList: Array<{
        keyword: string
        sources: string[]
        searchVolume?: number
        difficulty?: number
        cpc?: number
        intent?: string
      }> = []

      for (const kw of allKeywordsFlat.value) {
        const key = kw.keyword.toLowerCase()
        if (!matchesRelevance(kw.keyword)) continue
        if (seen.has(key)) {
          // Merge source into existing entry
          const existing = kwList.find(k => k.keyword.toLowerCase() === key)
          if (existing && !existing.sources.includes(kw.source)) {
            existing.sources.push(kw.source)
          }
          continue
        }
        seen.add(key)
        kwList.push({
          keyword: kw.keyword,
          sources: [kw.source],
          searchVolume: kw.searchVolume,
          difficulty: kw.difficulty,
          cpc: kw.cpc,
          intent: kw.intent,
        })
      }

      const result = await apiPost<AnalysisResult & { usage: unknown }>(
        '/keywords/analyze-discovery',
        {
          seed: lastSeed.value,
          keywords: kwList,
          wordGroups: wordGroups.value.map(g => ({ word: g.word, count: g.count })),
          articleContext: lastArticleContext.value,
        },
      )
      analysisResult.value = { keywords: result.keywords, summary: result.summary }
      log.info(`Discovery analysis: ${result.keywords.length} keywords curated`)
    } catch (err) {
      log.warn(`Discovery analysis failed: ${(err as Error).message}`)
      error.value = 'Échec de l\'analyse IA. Réessayez.'
    } finally {
      analysisLoading.value = false
    }
  }

  function reset() {
    suggestAlphabetKw.value = []
    suggestQuestionsKw.value = []
    suggestIntentsKw.value = []
    suggestPrepositionsKw.value = []
    aiKeywords.value = []
    dataforseoKeywords.value = []
    suggestLoading.value = false
    aiLoading.value = false
    dataforseoLoading.value = false
    wordGroups.value = []
    wordGroupsLoading.value = false
    activeGroupFilter.value = null
    selected.value = new Set()
    error.value = null
    lastFetchKey.value = ''
    lastSeed.value = ''
    lastArticleContext.value = {}
    relevanceFilterEnabled.value = true
    relevanceScores.value = new Map()
    semanticLoading.value = false
    scoringProgress.value = { scored: 0, total: 0, pass: 0 }
    _scoringInProgress = false
    _scoreQueuePending = false
    analysisResult.value = null
    analysisLoading.value = false
    cacheStatus.value = null
    cacheLoading.value = false
    filteringSuspect.value = false
  }

  return {
    // Source results
    suggestAlphabetKw,
    suggestQuestionsKw,
    suggestIntentsKw,
    suggestPrepositionsKw,
    aiKeywords,
    dataforseoKeywords,
    // Loading
    suggestLoading,
    aiLoading,
    dataforseoLoading,
    isAnyLoading,
    // Word groups
    wordGroups,
    wordGroupsLoading,
    activeGroupFilter,
    // State
    error,
    selected,
    selectedCount,
    hasResults,
    // Relevance filter
    relevanceFilterEnabled,
    semanticLoading,
    irrelevantCount,
    scoringProgress,
    uniqueKeywordCount,
    relevantCount,
    toggleRelevanceFilter,
    isRelevant,
    getRelevanceScore,
    filteringSuspect,
    // Multi-source
    SOURCE_COLORS,
    getKeywordSources,
    isMultiSource,
    // Actions
    discover,
    filteredList,
    toggleSelect,
    isSelected,
    selectAllInSource,
    deselectAllInSource,
    isAllSourceSelected,
    selectAll,
    deselectAll,
    setGroupFilter,
    matchesGroupFilter,
    getRadarKeywords,
    // AI Analysis
    analysisResult,
    analysisLoading,
    analyzeResults,
    // Analysis selection
    selectAllAnalysis,
    deselectAllAnalysis,
    isAllAnalysisSelected,
    // Cache
    cacheStatus,
    cacheLoading,
    checkCacheForSeed,
    loadFromCache,
    saveToCache,
    clearCacheForSeed,
    reset,
  }
}
