import { ref, computed } from 'vue'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ValidateResponse, ArticleLevel } from '@shared/types/index.js'
import type { ArticleType } from '@shared/types/article.types.js'
import type { RadarCard, KeywordRadarScanResult } from '@shared/types/intent.types.js'
import { FRENCH_STOPWORDS } from '@/constants/french-nlp'

export { FRENCH_STOPWORDS }

/** Map ArticleType (display) to ArticleLevel (API) */
const LEVEL_MAP: Record<ArticleType, ArticleLevel> = {
  'Pilier': 'pilier',
  'Intermédiaire': 'intermediaire',
  'Spécialisé': 'specifique',
}

export function articleTypeToLevel(type: ArticleType): ArticleLevel {
  return LEVEL_MAP[type] ?? 'intermediaire'
}

/** Generate all progressive truncations from longest (N-1 words) to shortest (2 words min, ≥2 significant) */
export function extractRoots(keyword: string): string[] {
  const words = keyword.trim().split(/\s+/)
  if (words.length < 3) return []
  const roots: string[] = []
  for (let len = words.length - 1; len >= 2; len--) {
    const significant = words.slice(0, len).filter(w => !FRENCH_STOPWORDS.has(w.toLowerCase()))
    if (significant.length >= 2) roots.push(words.slice(0, len).join(' '))
  }
  return roots
}

/** Extract root keyword (first 2 significant words) for long-tail keywords (3+ words) — retro-compatible alias */
export function extractRoot(keyword: string): string | null {
  const roots = extractRoots(keyword)
  return roots.length > 0 ? roots[roots.length - 1]! : null
}

export function useCapitaineValidation() {
  const result = ref<ValidateResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const history = ref<ValidateResponse[]>([])
  const historyIndex = ref(-1)
  const rootResult = ref<ValidateResponse | null>(null)
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

  async function validateKeyword(keyword: string, level: ArticleLevel, articleTitle?: string) {
    const thisVersion = ++validationVersion
    isLoading.value = true
    error.value = null
    rootResult.value = null
    radarCard.value = null

    // Launch validate + radar scan in parallel
    const validatePromise = apiPost<ValidateResponse>(
      `/keywords/${encodeURIComponent(keyword)}/validate`,
      { level },
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
      },
    ).then(scanResult => {
      if (thisVersion !== validationVersion) return
      radarCard.value = scanResult.cards?.[0] ?? null
      log.debug('[useCapitaineValidation] Radar card loaded', { keyword, score: radarCard.value?.combinedScore })
    }).catch(err => {
      log.warn('[useCapitaineValidation] Radar scan failed (best-effort)', { keyword, error: (err as Error).message })
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

      log.debug('[useCapitaineValidation] Validation result', {
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
          const rootResponse = await apiPost<ValidateResponse>(
            `/keywords/${encodeURIComponent(root)}/validate`,
            { level },
          )
          if (thisVersion !== validationVersion) return // stale root
          rootResult.value = rootResponse
          log.debug('[useCapitaineValidation] Root analysis', { root, verdict: rootResponse.verdict.level })
        } catch {
          // Root analysis is best-effort
          log.warn('[useCapitaineValidation] Root analysis failed', { root })
        } finally {
          if (thisVersion === validationVersion) isLoadingRoot.value = false
        }
      }
    } catch (err) {
      if (thisVersion !== validationVersion) return
      error.value = (err as Error).message
      log.error('[useCapitaineValidation] Validation failed', { keyword, error: error.value })
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
    validateKeyword,
    navigateHistory,
    reset,
  }
}
