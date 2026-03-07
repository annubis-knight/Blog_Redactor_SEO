import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet } from '@/services/api.service'
import type { Article } from '@shared/types/index.js'

export const useArticlesStore = defineStore('articles', () => {
  const articles = ref<Article[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const cocoonId = ref<number | null>(null)

  async function fetchArticlesByCocoon(id: number) {
    isLoading.value = true
    error.value = null
    cocoonId.value = id
    try {
      articles.value = await apiGet<Article[]>(`/cocoons/${id}/articles`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      isLoading.value = false
    }
  }

  return { articles, isLoading, error, cocoonId, fetchArticlesByCocoon }
})
