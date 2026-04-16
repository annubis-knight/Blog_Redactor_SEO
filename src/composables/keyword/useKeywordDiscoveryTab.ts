import { ref, computed } from 'vue'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import type { ApiUsage } from '@shared/types/index.js'
import type { DiscoveredKeyword, DiscoverySource, WordGroup, SuggestAllResult, AnalyzedKeyword, AnalysisResult } from '@shared/types/discovery-tab.types'
import { toRadarKeywords } from '@shared/types/discovery-tab.types'
import type { KeywordRadarGenerateResult } from '@shared/types/intent.types'
import type { KeywordDiscoveryResult } from '@shared/types/keyword-discovery.types'
import type { RadarKeyword } from '@shared/types/intent.types'
import type { DiscoveryContext } from '@shared/types/discovery-cache.types'
import { useDiscoveryCache } from './useDiscoveryCache'
import { useRelevanceScoring } from './useRelevanceScoring'
import { useDiscoverySelection } from './useDiscoverySelection'

// Re-export types for backward compatibility
export type { AnalyzedKeyword, AnalysisResult } from '@shared/types/discovery-tab.types'

// --- Source colors for multi-source indicator ---
const SOURCE_COLORS: Record<DiscoverySource, string> = {
  'suggest-alphabet': '#2563eb',
  'suggest-questions': '#15803d',
  'suggest-intents': '#ea580c',
  'suggest-prepositions': '#7c3aed',
  'ai': '#db2777',
  'dataforseo': '#b45309',
  'autocomplete': '#64748b',
}

// --- Module-level state (singleton) — persists across tab switches ---

const lastSeed = ref('')
const lastArticleContext = ref<{ title?: string; painPoint?: string }>({})

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

// Word groups
const wordGroups = ref<WordGroup[]>([])
const wordGroupsLoading = ref(false)
const activeGroupFilter = ref<string | null>(null)

// AI Analysis
const analysisResult = ref<AnalysisResult | null>(null)
const analysisLoading = ref(false)

// Cache key
const lastFetchKey = ref('')

function buildFetchKey(seed: string, articleTitle?: string, articleKeyword?: string, painPoint?: string): string {
  return [seed, articleTitle ?? '', articleKeyword ?? '', painPoint ?? ''].join('|').toLowerCase()
}

export function useKeywordDiscoveryTab() {
  const isAnyLoading = computed(() =>
    suggestLoading.value || aiLoading.value || dataforseoLoading.value,
  )

  const hasResults = computed(() =>
    suggestAlphabetKw.value.length > 0 ||
    suggestQuestionsKw.value.length > 0 ||
    suggestIntentsKw.value.length > 0 ||
    suggestPrepositionsKw.value.length > 0 ||
    aiKeywords.value.length > 0 ||
    dataforseoKeywords.value.length > 0,
  )

  const allKeywordsFlat = computed(() => [
    ...suggestAlphabetKw.value,
    ...suggestQuestionsKw.value,
    ...suggestIntentsKw.value,
    ...suggestPrepositionsKw.value,
    ...aiKeywords.value,
    ...dataforseoKeywords.value,
  ])

  const uniqueKeywordCount = computed(() => {
    const seen = new Set<string>()
    for (const kw of allKeywordsFlat.value) seen.add(kw.keyword.toLowerCase())
    return seen.size
  })

  // --- Compose extracted composables ---

  const relevance = useRelevanceScoring({
    lastSeed,
    lastArticleContext,
    allKeywordsFlat,
    uniqueKeywordCount,
  })

  const cache = useDiscoveryCache()

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

  // --- Group filter ---
  function setGroupFilter(word: string | null) {
    activeGroupFilter.value = word
  }

  function matchesGroupFilter(keyword: string): boolean {
    if (!activeGroupFilter.value) return true
    const target = activeGroupFilter.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const tokens = keyword.toLowerCase().split(/[\s\-_.,;:!?'"()\[\]{}/\\]+/)
    return tokens.some(t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === target)
  }

  // --- Unified filter (group + relevance) + sort multi-source first ---
  function filteredList(list: DiscoveredKeyword[]): DiscoveredKeyword[] {
    return list
      .filter(kw => matchesGroupFilter(kw.keyword) && relevance.matchesRelevance(kw.keyword))
      .sort((a, b) => {
        const aCount = crossSourceMap.value.get(a.keyword.toLowerCase())?.size ?? 0
        const bCount = crossSourceMap.value.get(b.keyword.toLowerCase())?.size ?? 0
        return bCount - aCount
      })
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

  const selection = useDiscoverySelection({
    allKeywordsFlat,
    matchesGroupFilter,
    matchesRelevance: relevance.matchesRelevance,
    filteredList,
    getSourceList,
    analysisResult,
  })

  // --- Word groups (computed on backend from all keywords) ---
  function fetchWordGroups() {
    const allKw = allKeywordsFlat.value.map(k => k.keyword)
    if (allKw.length < 5) return

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
    relevance.resetScores()
    suggestAlphabetKw.value = []
    suggestQuestionsKw.value = []
    suggestIntentsKw.value = []
    suggestPrepositionsKw.value = []
    aiKeywords.value = []
    dataforseoKeywords.value = []
    wordGroups.value = []
    activeGroupFilter.value = null
    selection.resetSelection()
    error.value = null

    // 1. Google Suggest — all 4 strategies in one call
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

        fetchWordGroups()
        relevance.fetchRelevanceScores()
      })
      .catch(err => {
        log.warn(`Discovery suggest failed: ${(err as Error).message}`)
      })
      .finally(() => { suggestLoading.value = false })

    // 2. AI generation via Claude Haiku
    if (articleTitle || articleKeyword) {
      aiLoading.value = true
      apiPost<KeywordRadarGenerateResult & { _apiUsage?: ApiUsage }>('/keywords/radar/generate', {
        title: articleTitle || seed,
        keyword: articleKeyword || seed,
        painPoint: painPoint || seed,
      })
        .then(data => {
          if (data._apiUsage) {
            try { useCostLogStore().addEntry('Génération keywords radar', data._apiUsage) } catch { /* noop */ }
          }
          aiKeywords.value = data.keywords.map(k => ({
            keyword: k.keyword,
            source: 'ai' as const,
            reasoning: k.reasoning,
          }))
          log.info(`Discovery: ${data.keywords.length} AI-generated keywords`)
          relevance.fetchRelevanceScores()
        })
        .catch(err => {
          log.warn(`Discovery AI generation failed: ${(err as Error).message}`)
          aiKeywords.value = []
        })
        .finally(() => { aiLoading.value = false })
    }

    // 3. DataForSEO discovery
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

        fetchWordGroups()
        relevance.fetchRelevanceScores()
      })
      .catch(err => {
        log.warn(`Discovery DataForSEO failed: ${(err as Error).message}`)
        dataforseoKeywords.value = []
      })
      .finally(() => { dataforseoLoading.value = false })
  }

  // --- Cache: load/save wrappers that hydrate/collect module state ---
  async function loadFromCacheAndHydrate(seed: string): Promise<boolean> {
    const entry = await cache.loadFromCache(seed)
    if (!entry) return false

    lastSeed.value = entry.seed
    lastFetchKey.value = buildFetchKey(entry.seed, entry.context.articleTitle, entry.context.articleKeyword, entry.context.painPoint)
    lastArticleContext.value = { title: entry.context.articleTitle, painPoint: entry.context.painPoint }
    suggestAlphabetKw.value = entry.suggestAlphabet
    suggestQuestionsKw.value = entry.suggestQuestions
    suggestIntentsKw.value = entry.suggestIntents
    suggestPrepositionsKw.value = entry.suggestPrepositions
    aiKeywords.value = entry.aiKeywords
    dataforseoKeywords.value = entry.dataforseoKeywords
    wordGroups.value = entry.wordGroups
    analysisResult.value = entry.analysisResult
    selection.resetSelection()
    error.value = null
    relevance.resetScores()
    relevance.relevanceScores.value = new Map(Object.entries(entry.relevanceScores))

    return true
  }

  async function saveToCacheFromState(context: DiscoveryContext): Promise<void> {
    await cache.saveToCache(lastSeed.value, context, {
      suggestAlphabet: suggestAlphabetKw.value,
      suggestQuestions: suggestQuestionsKw.value,
      suggestIntents: suggestIntentsKw.value,
      suggestPrepositions: suggestPrepositionsKw.value,
      aiKeywords: aiKeywords.value,
      dataforseoKeywords: dataforseoKeywords.value,
      relevanceScores: Object.fromEntries(relevance.relevanceScores.value),
      wordGroups: wordGroups.value,
      analysisResult: analysisResult.value,
    })
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
    ].filter(kw => selection.selected.value.has(kw.keyword.toLowerCase()))

    const result = toRadarKeywords(all)

    if (analysisResult.value) {
      const seen = new Set(result.map(r => r.keyword.toLowerCase()))
      for (const kw of analysisResult.value.keywords) {
        if (selection.selected.value.has(kw.keyword.toLowerCase()) && !seen.has(kw.keyword.toLowerCase())) {
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
        if (!relevance.matchesRelevance(kw.keyword)) continue
        if (seen.has(key)) {
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

      const result = await apiPost<AnalysisResult & { usage?: ApiUsage }>(
        '/keywords/analyze-discovery',
        {
          seed: lastSeed.value,
          keywords: kwList,
          wordGroups: wordGroups.value.map(g => ({ word: g.word, count: g.count })),
          articleContext: lastArticleContext.value,
        },
      )
      if (result.usage) {
        try { useCostLogStore().addEntry('Analyse discovery', result.usage as ApiUsage) } catch { /* noop */ }
      }
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
    selection.resetSelection()
    error.value = null
    lastFetchKey.value = ''
    lastSeed.value = ''
    lastArticleContext.value = {}
    relevance.resetScores()
    analysisResult.value = null
    analysisLoading.value = false
    cache.resetCache()
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
    selected: selection.selected,
    selectedCount: selection.selectedCount,
    hasResults,
    // Relevance filter
    relevanceFilterEnabled: relevance.relevanceFilterEnabled,
    semanticLoading: relevance.semanticLoading,
    irrelevantCount: relevance.irrelevantCount,
    scoringProgress: relevance.scoringProgress,
    uniqueKeywordCount,
    relevantCount: relevance.relevantCount,
    toggleRelevanceFilter: relevance.toggleRelevanceFilter,
    isRelevant: relevance.isRelevant,
    getRelevanceScore: relevance.getRelevanceScore,
    filteringSuspect: relevance.filteringSuspect,
    // Multi-source
    SOURCE_COLORS,
    getKeywordSources,
    isMultiSource,
    // Actions
    discover,
    filteredList,
    toggleSelect: selection.toggleSelect,
    isSelected: selection.isSelected,
    selectAllInSource: selection.selectAllInSource,
    deselectAllInSource: selection.deselectAllInSource,
    isAllSourceSelected: selection.isAllSourceSelected,
    selectAll: selection.selectAll,
    deselectAll: selection.deselectAll,
    setGroupFilter,
    matchesGroupFilter,
    getRadarKeywords,
    // AI Analysis
    analysisResult,
    analysisLoading,
    analyzeResults,
    // Analysis selection
    selectAllAnalysis: selection.selectAllAnalysis,
    deselectAllAnalysis: selection.deselectAllAnalysis,
    isAllAnalysisSelected: selection.isAllAnalysisSelected,
    // Cache
    cacheStatus: cache.cacheStatus,
    cacheLoading: cache.cacheLoading,
    checkCacheForSeed: cache.checkCacheForSeed,
    loadFromCache: loadFromCacheAndHydrate,
    saveToCache: saveToCacheFromState,
    clearCacheForSeed: cache.clearCacheForSeed,
    reset,
  }
}
