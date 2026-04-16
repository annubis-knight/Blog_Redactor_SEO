import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { log } from '@/utils/logger'
import { apiGet, apiPost } from '@/services/api.service'
import type { Article, ArticleType, Keyword, DataForSeoCacheEntry, BriefData } from '@shared/types/index.js'

/** Calculate content length recommendation based on article type */
export function calculateContentLength(articleType: ArticleType): number {
  const baseByType: Record<string, number> = {
    'Pilier': 2500,
    'Intermédiaire': 1800,
    'Spécialisé': 1200,
  }
  return baseByType[articleType] ?? 1500
}

export const useBriefStore = defineStore('brief', () => {
  const briefData = ref<BriefData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isRefreshing = ref(false)
  const dataForSeoFromCache = ref<boolean | null>(null)
  const currentId = ref<number | null>(null)
  let fetchController: AbortController | null = null

  const pilierKeyword = computed(() =>
    briefData.value?.keywords.find(kw => kw.type === 'Pilier') ?? null,
  )

  async function fetchBrief(id: number) {
    fetchController?.abort()
    fetchController = new AbortController()
    const signal = fetchController.signal
    currentId.value = id

    log.info(`Fetching brief for article ${id}`)
    isLoading.value = true
    error.value = null
    try {
      // 1. Fetch article details
      const { article, cocoonName } = await apiGet<{ article: Article; cocoonName: string }>(`/articles/${id}`, { signal })
      if (id !== currentId.value) return // id changed during fetch

      const articleWithCocoon = { ...article, cocoonName }

      // 2. Fetch keywords for the cocoon (non-blocking: empty array on failure)
      let keywords: Keyword[] = []
      try {
        keywords = await apiGet<Keyword[]>(`/keywords/${encodeURIComponent(cocoonName)}`, { signal })
      } catch (err) {
        if ((err as Error).name === 'AbortError') throw err
        // Keywords unavailable — continue with empty list
      }
      if (id !== currentId.value) return

      // 3. Fetch DataForSEO data (if pilier keyword exists, non-blocking)
      const pilier = keywords.find(kw => kw.type === 'Pilier')
      let dataForSeo: DataForSeoCacheEntry | null = null
      if (pilier) {
        try {
          const result = await apiPost<DataForSeoCacheEntry & { fromCache?: boolean }>('/dataforseo/brief', { keyword: pilier.keyword }, { signal })
          dataForSeoFromCache.value = result.fromCache ?? null
          dataForSeo = result
        } catch (err) {
          if ((err as Error).name === 'AbortError') throw err
          // DataForSEO unavailable — continue without
        }
      }
      if (id !== currentId.value) return

      // 4. Calculate content length recommendation
      const contentLengthRecommendation = calculateContentLength(article.type)

      briefData.value = { article: articleWithCocoon, keywords, dataForSeo, contentLengthRecommendation }
      log.info(`Brief loaded for article ${id}`, { keywords: keywords.length, hasDataForSeo: !!dataForSeo })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      log.error(`Brief fetch failed for article ${id} — ${(err as Error).message}`)
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      if (id === currentId.value) {
        isLoading.value = false
      }
    }
  }

  async function refreshDataForSeo() {
    if (!briefData.value || !pilierKeyword.value) return

    isRefreshing.value = true
    try {
      const result = await apiPost<DataForSeoCacheEntry & { fromCache?: boolean }>('/dataforseo/brief', {
        keyword: pilierKeyword.value.keyword,
        forceRefresh: true,
      })
      dataForSeoFromCache.value = result.fromCache ?? false
      briefData.value = { ...briefData.value, dataForSeo: result }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      isRefreshing.value = false
    }
  }

  return { briefData, isLoading, error, isRefreshing, pilierKeyword, dataForSeoFromCache, fetchBrief, refreshDataForSeo }
})
