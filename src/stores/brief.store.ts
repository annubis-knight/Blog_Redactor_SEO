import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
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

  const pilierKeyword = computed(() =>
    briefData.value?.keywords.find(kw => kw.type === 'Pilier') ?? null,
  )

  async function fetchBrief(slug: string) {
    isLoading.value = true
    error.value = null
    try {
      // 1. Fetch article details
      const { article, cocoonName } = await apiGet<{ article: Article; cocoonName: string }>(`/articles/${slug}`)
      const articleWithCocoon = { ...article, cocoonName }

      // 2. Fetch keywords for the cocoon
      const keywords = await apiGet<Keyword[]>(`/keywords/${encodeURIComponent(cocoonName)}`)

      // 3. Fetch DataForSEO data (if pilier keyword exists)
      const pilier = keywords.find(kw => kw.type === 'Pilier')
      let dataForSeo: DataForSeoCacheEntry | null = null
      if (pilier) {
        dataForSeo = await apiPost<DataForSeoCacheEntry>('/dataforseo/brief', { keyword: pilier.keyword })
      }

      // 4. Calculate content length recommendation
      const contentLengthRecommendation = calculateContentLength(article.type)

      briefData.value = { article: articleWithCocoon, keywords, dataForSeo, contentLengthRecommendation }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      isLoading.value = false
    }
  }

  async function refreshDataForSeo() {
    if (!briefData.value || !pilierKeyword.value) return

    isRefreshing.value = true
    try {
      const dataForSeo = await apiPost<DataForSeoCacheEntry>('/dataforseo/brief', {
        keyword: pilierKeyword.value.keyword,
        forceRefresh: true,
      })
      briefData.value = { ...briefData.value, dataForSeo }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      isRefreshing.value = false
    }
  }

  return { briefData, isLoading, error, isRefreshing, pilierKeyword, fetchBrief, refreshDataForSeo }
})
