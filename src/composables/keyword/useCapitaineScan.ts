import { ref, computed } from 'vue'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ScanResponse, ArticleLevel } from '@shared/types/index.js'
import type { ArticleType } from '@shared/types/article.types.js'
import type { RadarCard, KeywordRadarScanResult } from '@shared/types/intent.types.js'
import { FRENCH_STOPWORDS, extractRoots as extractRootsShared } from '@shared/utils/keyword-roots.js'

export { FRENCH_STOPWORDS, extractRootsShared as extractRoots }

/** Map ArticleType (display) to ArticleLevel (API) */
const LEVEL_MAP: Record<ArticleType, ArticleLevel> = {
  'Pilier': 'pilier',
  'Intermédiaire': 'intermediaire',
  'Spécialisé': 'specifique',
}

export function articleTypeToLevel(type: ArticleType): ArticleLevel {
  return LEVEL_MAP[type] ?? 'intermediaire'
}

/** Extract root keyword (first 2 significant words) for long-tail keywords (3+ words) — retro-compatible alias */
export function extractRoot(keyword: string): string | null {
  const roots = extractRootsShared(keyword)
  return roots.length > 0 ? roots[roots.length - 1]! : null
}

export function useCapitaineScan() {
  const result = ref<ScanResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const history = ref<ScanResponse[]>([])
  const historyIndex = ref(-1)
  const rootResult = ref<ScanResponse | null>(null)
  const isLoadingRoot = ref(false)
  const radarCard = ref<RadarCard | null>(null)
  const isLoadingRadar = ref(false)
  let validationVersion = 0

  /** Current displayed result = history[historyIndex] or latest result */
  const currentResult = computed(() => {
    if (historyIndex.value >= 0 && historyIndex.value < history.value.length) {
      return history.value[historyIndex.value]
    }
    return result.value
  })

  async function scanKeyword(
    keyword: string,
    level: ArticleLevel,
    articleTitle?: string,
    articlePainPoint?: string,
    articleId?: number,
  ) {
    const thisVersion = ++validationVersion
    isLoading.value = true
    error.value = null
    rootResult.value = null
    radarCard.value = null

    // Bloc 5 — `painPoint` + `articleId` envoyés à /validate pour permettre
    // au backend de calculer relevanceScore à la volée même sans cache Radar.
    const validatePromise = apiPost<ScanResponse>(
      `/keywords/${encodeURIComponent(keyword)}/scan`,
      { level, articleTitle, articleId, painPoint: articlePainPoint },
    )

    // Radar scan: best-effort, non-blocking
    isLoadingRadar.value = true
    const radarPromise = apiPost<KeywordRadarScanResult>(
      '/keywords/radar/scan',
      {
        broadKeyword: keyword,
        specificTopic: articleTitle ?? keyword,
        keywords: [{ keyword, reasoning: '' }],
        depth: 1,
        painPoint: articlePainPoint,
      },
    ).then(scanResult => {
      if (thisVersion !== validationVersion) return
      radarCard.value = scanResult.cards?.[0] ?? null
      log.debug('[useCapitaineScan] Radar card loaded', { keyword, score: radarCard.value?.combinedScore })
    }).catch(err => {
      log.warn('[useCapitaineScan] Radar scan failed (best-effort)', { keyword, error: (err as Error).message })
    }).finally(() => {
      if (thisVersion === validationVersion) isLoadingRadar.value = false
    })

    try {
      const response = await validatePromise
      if (thisVersion !== validationVersion) return // stale call

      result.value = response

      // Unshift to history (newest first), dedup by keyword, cap at 20
      history.value = [response, ...history.value.filter(h => h.keyword !== response.keyword)].slice(0, 20)
      historyIndex.value = 0

      log.debug('[useCapitaineScan] Validation result', {
        keyword,
        level,
        verdict: response.verdict.level,
        historyLength: history.value.length,
      })

      // Auto-check root for long-tail keywords with weak volume
      const root = extractRoot(keyword)
      if (root && response.kpis.find(k => k.name === 'volume')?.color !== 'green') {
        isLoadingRoot.value = true
        try {
          const rootResponse = await apiPost<ScanResponse>(
            `/keywords/${encodeURIComponent(root)}/scan`,
            { level, articleTitle, articleId, painPoint: articlePainPoint },
          )
          if (thisVersion !== validationVersion) return // stale root
          rootResult.value = rootResponse
          log.debug('[useCapitaineScan] Root analysis', { root, verdict: rootResponse.verdict.level })
        } catch {
          // Root analysis is best-effort
          log.warn('[useCapitaineScan] Root analysis failed', { root })
        } finally {
          if (thisVersion === validationVersion) isLoadingRoot.value = false
        }
      }
    } catch (err) {
      if (thisVersion !== validationVersion) return
      error.value = (err as Error).message
      log.error('[useCapitaineScan] Validation failed', { keyword, error: error.value })
    } finally {
      if (thisVersion === validationVersion) isLoading.value = false
    }

    // Wait for radar to finish too (don't leave dangling promise)
    await radarPromise
  }

  function navigateHistory(index: number) {
    if (index >= 0 && index < history.value.length) {
      historyIndex.value = index
      result.value = history.value[index] ?? null
      rootResult.value = null
    }
  }

  function reset() {
    result.value = null
    isLoading.value = false
    error.value = null
    history.value = []
    historyIndex.value = -1
    rootResult.value = null
    isLoadingRoot.value = false
    radarCard.value = null
    isLoadingRadar.value = false
  }

  return {
    result,
    currentResult,
    isLoading,
    error,
    history,
    historyIndex,
    rootResult,
    isLoadingRoot,
    radarCard,
    isLoadingRadar,
    scanKeyword,
    navigateHistory,
    reset,
  }
}
