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
}

export function useArticleResults() {
  const intentStore = useIntentStore()
  const localStore = useLocalStore()
  const discoveryStore = useKeywordDiscoveryStore()
  const isLoading = ref(false)
  const currentSlug = ref<string | null>(null)

  /** Clear all analysis stores (intent, local, discovery) */
  function clearResults() {
    intentStore.reset()
    localStore.reset()
    discoveryStore.clearResults()
    currentSlug.value = null
    log.debug('[useArticleResults] Cleared all analysis stores')
  }

  /** Load cached results for an article and populate stores */
  async function loadCachedResults(slug: string): Promise<void> {
    currentSlug.value = slug
    isLoading.value = true

    try {
      const cached = await apiGet<CachedResults>(`/articles/${encodeURIComponent(slug)}/cached-results`)
      log.debug('[useArticleResults] Cached results received', {
        slug,
        intent: !!cached.intent,
        local: !!cached.local,
        contentGap: !!cached.contentGap,
        autocomplete: !!cached.autocomplete,
        comparison: !!cached.comparison,
      })

      // Guard against race condition: if user switched articles during fetch, discard
      if (currentSlug.value !== slug) {
        log.debug('[useArticleResults] Slug changed during fetch, discarding results', {
          expected: slug,
          current: currentSlug.value,
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
    } catch (err) {
      log.warn(`[useArticleResults] Failed to load cached results for "${slug}": ${(err as Error).message}`)
      // Graceful degradation — stores stay empty, user can run analyses manually
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    currentSlug,
    clearResults,
    loadCachedResults,
  }
}
