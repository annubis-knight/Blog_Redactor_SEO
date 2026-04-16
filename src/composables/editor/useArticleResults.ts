import { ref } from 'vue'
import { apiGet } from '@/services/api.service'
import { useIntentStore } from '@/stores/intent.store'
import { useLocalStore } from '@/stores/local.store'
import { useKeywordDiscoveryStore } from '@/stores/keyword-discovery.store'
import { log } from '@/utils/logger'

interface CachedResults {
  intent: unknown | null
  local: unknown | null
  contentGap: unknown | null
  autocomplete: unknown | null
  comparison: unknown | null
  radar: { scanResult?: { globalScore: number; heatLevel: string } } | null
}

export interface ArticleResultsOptions {
  onRadarLoaded?: (scanResult: { globalScore: number; heatLevel: string }) => void
}

export function useArticleResults(options: ArticleResultsOptions = {}) {
  const intentStore = useIntentStore()
  const localStore = useLocalStore()
  const discoveryStore = useKeywordDiscoveryStore()
  const isLoading = ref(false)
  const currentArticleId = ref<number | null>(null)

  /** Clear all analysis stores (intent, local, discovery) */
  function clearResults() {
    intentStore.reset()
    localStore.reset()
    discoveryStore.clearResults()
    currentArticleId.value = null
    log.debug('[useArticleResults] Cleared all analysis stores')
  }

  /** Load cached results for an article and populate stores */
  async function loadCachedResults(articleId: number): Promise<void> {
    currentArticleId.value = articleId
    isLoading.value = true

    try {
      const cached = await apiGet<CachedResults>(`/articles/${articleId}/cached-results`)
      log.debug('[useArticleResults] Cached results received', {
        articleId,
        intent: !!cached.intent,
        local: !!cached.local,
        contentGap: !!cached.contentGap,
        autocomplete: !!cached.autocomplete,
        comparison: !!cached.comparison,
        radar: !!cached.radar,
      })

      // Guard against race condition: if user switched articles during fetch, discard
      if (currentArticleId.value !== articleId) {
        log.debug('[useArticleResults] Article changed during fetch, discarding results', {
          expected: articleId,
          current: currentArticleId.value,
        })
        return
      }

      // Populate intent store
      if (cached.intent) {
        intentStore.intentData = cached.intent as any
      }
      if (cached.comparison) {
        intentStore.comparisonData = cached.comparison as any
      }
      if (cached.autocomplete) {
        intentStore.autocompleteData = cached.autocomplete as any
      }

      // Populate local store
      if (cached.local) {
        localStore.mapsData = cached.local as any
      }

      // Notify radar callback
      if (cached.radar?.scanResult && options.onRadarLoaded) {
        options.onRadarLoaded(cached.radar.scanResult)
      }
    } catch (err) {
      log.warn(`[useArticleResults] Failed to load cached results for articleId=${articleId}: ${(err as Error).message}`)
      // Graceful degradation — stores stay empty, user can run analyses manually
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    currentArticleId,
    clearResults,
    loadCachedResults,
  }
}
