/**
 * AUTHORITY: PostgreSQL `radar_explorations`, `keyword_metrics.local_analysis`
 *            (dont `comparison`) via GET /articles/:id/explorations ;
 *            `external_api_cache` (autocomplete) via GET /articles/:id/external-cache.
 * READS FROM: GET /articles/:id/explorations (contrat `explorations`),
 *             GET /articles/:id/external-cache
 * WRITES TO: useIntentStore (comparisonData, autocompleteData), useLocalStore
 *            (mapsData) ; callback `onRadarLoaded` (thermomètre Radar).
 *            Plus de `intentData` (M3, épopée qualité SEO) : le groupe `intent`
 *            des explorations est supprimé, `keyword_intent_analyses` n'a plus
 *            de producteur.
 * CONSUMERS: MoteurView (montage et changement d'article)
 * RELATED FR: FR-MOT-EXPLORATIONS-HYDRATATION, NFR-INT-DISPLAY-CONTRACTS
 */
import { ref } from 'vue'
import { apiGet } from '@/services/api.service'
import { useIntentStore } from '@/stores/keyword/intent.store'
import { useLocalStore } from '@/stores/external/local.store'
import { useKeywordDiscoveryStore } from '@/stores/keyword/keyword-discovery.store'
import { log } from '@/utils/logger'
import { articleExplorationsContract } from '@shared/contracts/article-explorations.contract.js'
import type { KeywordRadarScanResult } from '@shared/types/intent.types.js'

interface ExternalCacheResponse {
  autocomplete: unknown | null
}

export interface ArticleResultsOptions {
  /** Thermomètre Radar relu en base : score et chaleur absents → `null` (« En attente — »). */
  onRadarLoaded?: (scanResult: Pick<KeywordRadarScanResult, 'globalScore' | 'heatLevel'>) => void
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

      const [explorations, external] = await Promise.all([
        apiGet(`/articles/${articleId}/explorations`, { contract: articleExplorationsContract }),
        apiGet<ExternalCacheResponse>(`/articles/${articleId}/external-cache`).catch(() => ({ autocomplete: null } as ExternalCacheResponse)),
      ])

      log.debug('[useArticleResults] Split endpoints received', {
        articleId,
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

      // Populate intent store (comparaison locale + autocomplete)
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
