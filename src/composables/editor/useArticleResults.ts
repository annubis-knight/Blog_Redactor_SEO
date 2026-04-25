import { ref } from 'vue'
import { apiGet } from '@/services/api.service'
import { useIntentStore } from '@/stores/keyword/intent.store'
import { useLocalStore } from '@/stores/external/local.store'
import { useKeywordDiscoveryStore } from '@/stores/keyword/keyword-discovery.store'
import { log } from '@/utils/logger'

// Sprint 14 — Response shapes from the split endpoints introduced in Sprint 10.
interface ExplorationsResponse {
  intent?: { capitaine: unknown | null; all: unknown[] }
  local?: { capitaine: { hasLocalPack?: boolean; listings?: unknown[]; reviewGap?: unknown; comparison?: unknown } | null; all: unknown[] }
  contentGap?: { capitaine: { data?: unknown } | null; all: unknown[] }
  radar?: { scanResult?: { globalScore: number; heatLevel: string } } | null
}
interface ExternalCacheResponse {
  autocomplete: unknown | null
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
      // Sprint 14 — split endpoints: DB-scoped explorations + cross-article external cache.
      const [explorations, external] = await Promise.all([
        apiGet<ExplorationsResponse>(`/articles/${articleId}/explorations`),
        apiGet<ExternalCacheResponse>(`/articles/${articleId}/external-cache`).catch(() => ({ autocomplete: null } as ExternalCacheResponse)),
      ])

      log.debug('[useArticleResults] Split endpoints received', {
        articleId,
        intent: !!explorations.intent?.capitaine,
        local: !!explorations.local?.capitaine,
        contentGap: !!explorations.contentGap?.capitaine,
        autocomplete: !!external.autocomplete,
        radar: !!explorations.radar,
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
      if (explorations.intent?.capitaine) {
        intentStore.intentData = explorations.intent.capitaine as any
      }
      if (explorations.local?.capitaine?.comparison) {
        intentStore.comparisonData = explorations.local.capitaine.comparison as any
      }
      if (external.autocomplete) {
        intentStore.autocompleteData = external.autocomplete as any
      }

      // Populate local store — reconstruct MapsResult shape from DB row
      if (explorations.local?.capitaine) {
        const lc = explorations.local.capitaine
        localStore.mapsData = {
          keyword: '',
          locationCode: 0,
          hasLocalPack: !!lc.hasLocalPack,
          listings: (lc.listings as any[]) ?? [],
          reviewGap: lc.reviewGap as any,
          cachedAt: '',
        } as any
      }

      // Notify radar callback
      const radarScan = explorations.radar?.scanResult
      if (radarScan && options.onRadarLoaded) {
        options.onRadarLoaded(radarScan)
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
