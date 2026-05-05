/**
 * AUTHORITY: PostgreSQL `api_cache` (clé : `discovery:<seed|domain>`) + DataForSEO
 * READS FROM: POST /api/keywords/discover (depuis seed)
 *             POST /api/keywords/discover-from-site (depuis domaine)
 * WRITES TO:  (rien — discovery est read-only, l'utilisateur valide via keyword-audit.store.addKeyword)
 * CONSUMERS: DiscoveryPanel.vue (sélection + ajout au cocoon),
 *            KeywordDiscoveryTab.vue (affichage filtré)
 * RELATED FR: FR-INFRA-API-WRAPPER, NFR-INT-API-WRAPPER, NFR-OBS-COST-LOG,
 *             NFR-OBS-KNOWN-ERRORS, FR-INFRA-KPI-CONSISTENCY (filtres null-safe)
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { log } from '@/utils/logger'
import { apiPost } from '@/services/api.service'
import type { ClassifiedKeyword, KeywordDiscoveryResult, DomainDiscoveryResult, KeywordType } from '@shared/types/index.js'

export const useKeywordDiscoveryStore = defineStore('keywordDiscovery', () => {
  const results = ref<ClassifiedKeyword[]>([])
  const isLoadingSeed = ref(false)
  const isLoadingDomain = ref(false)
  const loading = computed(() => isLoadingSeed.value || isLoadingDomain.value)
  const error = ref<string | null>(null)
  let currentController: AbortController | null = null
  const seed = ref('')
  const domain = ref('')
  const apiCost = ref(0)
  const totalBeforeDedup = ref(0)
  const totalAfterDedup = ref(0)

  // Filters
  const typeFilter = ref<string | null>(null)
  const intentFilter = ref<string | null>(null)
  const minVolume = ref(0)
  const maxDifficulty = ref(100)
  const minScore = ref(0)

  const filteredResults = computed(() => {
    return results.value.filter(kw => {
      if (typeFilter.value && kw.type !== typeFilter.value) return false
      if (intentFilter.value && kw.intent !== intentFilter.value) return false
      // KPI absent : on n'exclut que si l'utilisateur exige un seuil > 0.
      // Affichage cohérent avec FR-INFRA-KPI-CONSISTENCY (null = inconnu, pas 0).
      if (kw.searchVolume === null) {
        if (minVolume.value > 0) return false
      } else if (kw.searchVolume < minVolume.value) return false
      if (kw.difficulty === null) {
        if (maxDifficulty.value < 100) return false
      } else if (kw.difficulty > maxDifficulty.value) return false
      if (kw.compositeScore.total === null) {
        if (minScore.value > 0) return false
      } else if (kw.compositeScore.total < minScore.value) return false
      return true
    })
  })

  const resultsByType = computed(() => {
    const groups: Record<string, ClassifiedKeyword[]> = {
      'Pilier': [],
      'Moyenne traine': [],
      'Longue traine': [],
    }
    for (const kw of filteredResults.value) {
      groups[kw.type]?.push(kw)
    }
    return groups
  })

  const intents = computed(() => {
    const set = new Set<string>()
    for (const kw of results.value) {
      if (kw.intent) set.add(kw.intent)
    }
    return [...set].sort()
  })

  async function discoverFromSeed(keyword: string, maxResults?: number) {
    currentController?.abort()
    const myController = currentController = new AbortController()
    isLoadingSeed.value = true
    error.value = null
    seed.value = keyword
    domain.value = ''

    try {
      const data = await apiPost<KeywordDiscoveryResult>(
        '/keywords/discover',
        { keyword, options: maxResults ? { maxResults } : undefined },
        { signal: myController.signal },
      )
      log.info(`Discovered ${data.keywords.length} keywords for "${keyword}"`)
      results.value = data.keywords
      apiCost.value = data.apiCost
      totalBeforeDedup.value = data.totalBeforeDedup
      totalAfterDedup.value = data.totalAfterDedup
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      error.value = (err as Error).message
      results.value = []
    } finally {
      if (currentController === myController) {
        isLoadingSeed.value = false
      }
    }
  }

  async function discoverFromDomain(domainName: string, maxResults?: number) {
    currentController?.abort()
    const myController = currentController = new AbortController()
    isLoadingDomain.value = true
    error.value = null
    domain.value = domainName
    seed.value = ''

    try {
      const data = await apiPost<DomainDiscoveryResult>(
        '/keywords/discover-from-site',
        { domain: domainName, options: maxResults ? { maxResults } : undefined },
        { signal: myController.signal },
      )
      log.info(`Discovered ${data.keywords.length} keywords from "${domainName}"`)
      results.value = data.keywords
      apiCost.value = data.apiCost
      totalBeforeDedup.value = data.total
      totalAfterDedup.value = data.keywords.length
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      error.value = (err as Error).message
      results.value = []
    } finally {
      if (currentController === myController) {
        isLoadingDomain.value = false
      }
    }
  }

  function resetFilters() {
    typeFilter.value = null
    intentFilter.value = null
    minVolume.value = 0
    maxDifficulty.value = 100
    minScore.value = 0
  }

  function updateKeywordType(keyword: string, newType: KeywordType) {
    const kw = results.value.find(r => r.keyword === keyword)
    if (kw) kw.type = newType
  }

  function clearResults() {
    results.value = []
    seed.value = ''
    domain.value = ''
    apiCost.value = 0
    totalBeforeDedup.value = 0
    totalAfterDedup.value = 0
    error.value = null
    resetFilters()
  }

  return {
    results,
    loading,
    isLoadingSeed,
    isLoadingDomain,
    error,
    seed,
    domain,
    apiCost,
    totalBeforeDedup,
    totalAfterDedup,
    typeFilter,
    intentFilter,
    minVolume,
    maxDifficulty,
    minScore,
    filteredResults,
    resultsByType,
    intents,
    discoverFromSeed,
    discoverFromDomain,
    updateKeywordType,
    resetFilters,
    clearResults,
  }
})
