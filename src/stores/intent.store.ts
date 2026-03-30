import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { IntentAnalysis, LocalNationalComparison, AutocompleteResult, ExplorationHistoryEntry } from '@shared/types/index.js'

export const useIntentStore = defineStore('intent', () => {
  // Intent Analysis (Epic 11)
  const intentData = ref<IntentAnalysis | null>(null)
  const isAnalyzingIntent = ref(false)
  const intentError = ref<string | null>(null)

  // Local vs National (Epic 12)
  const comparisonData = ref<LocalNationalComparison | null>(null)
  const isComparing = ref(false)
  const comparisonError = ref<string | null>(null)
  // Cache of local/national comparisons by keyword (Epic 23 — Keyword Switcher)
  const localComparisons = ref(new Map<string, LocalNationalComparison>())

  // Autocomplete (Epic 13)
  const autocompleteData = ref<AutocompleteResult | null>(null)
  const isValidatingAutocomplete = ref(false)
  const autocompleteError = ref<string | null>(null)

  // Exploration (Epic 18)
  const explorationKeyword = ref('')
  const explorationHistory = ref<ExplorationHistoryEntry[]>([])

  // Computed
  const hasLocalPack = computed(() =>
    intentData.value?.modules.some(m => m.type === 'local_pack' && m.present) ?? false
  )
  const dominantIntent = computed(() => intentData.value?.dominantIntent ?? null)
  const isOpportunity = computed(() => comparisonData.value?.alert != null)
  const hasExplored = computed(() => explorationHistory.value.length > 0)
  const paaQuestions = computed(() => intentData.value?.paaQuestions ?? [])

  // Actions
  function setExplorationKeyword(keyword: string) {
    explorationKeyword.value = keyword
  }

  function addToHistory(entry: ExplorationHistoryEntry) {
    // Avoid duplicates — replace if same keyword
    const idx = explorationHistory.value.findIndex(e => e.keyword === entry.keyword)
    if (idx >= 0) {
      explorationHistory.value.splice(idx, 1)
    }
    explorationHistory.value.unshift(entry)
    // Keep max 20 entries
    if (explorationHistory.value.length > 20) {
      explorationHistory.value = explorationHistory.value.slice(0, 20)
    }
  }

  async function analyzeIntent(keyword: string, locationCode?: number) {
    isAnalyzingIntent.value = true
    intentError.value = null
    log.info(`[intent] analyzeIntent "${keyword}"`, locationCode ? { locationCode } : undefined)
    try {
      intentData.value = await apiPost<IntentAnalysis>('/intent/analyze', { keyword, locationCode })
      log.debug(`[intent] analyzeIntent done`, { dominant: intentData.value?.dominantIntent })
    } catch (err) {
      intentError.value = err instanceof Error ? err.message : 'Erreur analyse intention'
      log.error(`[intent] analyzeIntent failed: ${intentError.value}`)
    } finally {
      isAnalyzingIntent.value = false
    }
  }

  async function compareLocalNational(keyword: string) {
    isComparing.value = true
    comparisonError.value = null
    log.info(`[intent] compareLocalNational "${keyword}"`)
    try {
      comparisonData.value = await apiPost<LocalNationalComparison>('/keywords/compare-local', { keyword })
      // Cache for keyword switcher (Epic 23)
      if (comparisonData.value) {
        localComparisons.value.set(keyword, comparisonData.value)
        // Cap at 50 entries to prevent memory leaks on long sessions
        if (localComparisons.value.size > 50) {
          const firstKey = localComparisons.value.keys().next().value
          if (firstKey) localComparisons.value.delete(firstKey)
        }
      }
      log.debug(`[intent] compareLocalNational done`, { alert: comparisonData.value?.alert })
    } catch (err) {
      comparisonError.value = err instanceof Error ? err.message : 'Erreur comparaison'
      log.error(`[intent] compareLocalNational failed: ${comparisonError.value}`)
    } finally {
      isComparing.value = false
    }
  }

  async function validateAutocomplete(keyword: string, prefixes?: string[]) {
    isValidatingAutocomplete.value = true
    autocompleteError.value = null
    log.info(`[intent] validateAutocomplete "${keyword}"`, prefixes ? { prefixes: prefixes.length } : undefined)
    try {
      autocompleteData.value = await apiPost<AutocompleteResult>('/keywords/autocomplete', { keyword, prefixes })
      log.debug(`[intent] validateAutocomplete done`, { certainty: autocompleteData.value?.certaintyIndex?.total })
    } catch (err) {
      autocompleteError.value = err instanceof Error ? err.message : 'Erreur autocomplete'
      log.error(`[intent] validateAutocomplete failed: ${autocompleteError.value}`)
    } finally {
      isValidatingAutocomplete.value = false
    }
  }

  /** Explore a keyword: run autocomplete + intent analysis, record in history */
  async function exploreKeyword(keyword: string, prefixes?: string[]) {
    log.info(`[intent] exploreKeyword "${keyword}"`)
    setExplorationKeyword(keyword)
    // Clear previous results
    intentData.value = null
    autocompleteData.value = null
    intentError.value = null
    autocompleteError.value = null

    // Run autocomplete first (fast), then intent analysis
    await validateAutocomplete(keyword, prefixes)
    await analyzeIntent(keyword)

    // Record in history (re-read refs after async mutations)
    const intent = intentData.value as IntentAnalysis | null
    const autocomp = autocompleteData.value as AutocompleteResult | null
    addToHistory({
      keyword,
      timestamp: new Date().toISOString(),
      hasIntent: intent != null,
      hasAutocomplete: autocomp != null,
      dominantIntent: intent?.dominantIntent,
      certaintyTotal: autocomp?.certaintyIndex.total,
    })
  }

  function reset() {
    intentData.value = null
    comparisonData.value = null
    autocompleteData.value = null
    intentError.value = null
    comparisonError.value = null
    autocompleteError.value = null
    explorationKeyword.value = ''
    explorationHistory.value = []
    localComparisons.value = new Map()
  }

  return {
    intentData, isAnalyzingIntent, intentError,
    comparisonData, isComparing, comparisonError, localComparisons,
    autocompleteData, isValidatingAutocomplete, autocompleteError,
    explorationKeyword, explorationHistory, hasExplored, paaQuestions,
    setExplorationKeyword, addToHistory, exploreKeyword,
    analyzeIntent, compareLocalNational, validateAutocomplete, reset,
    hasLocalPack, dominantIntent, isOpportunity,
  }
})
