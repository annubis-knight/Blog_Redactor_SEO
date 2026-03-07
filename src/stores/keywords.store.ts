import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet } from '@/services/api.service'
import type { Keyword } from '@shared/types/index.js'

export const useKeywordsStore = defineStore('keywords', () => {
  const keywords = ref<Keyword[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchKeywordsByCocoon(cocoonName: string) {
    isLoading.value = true
    error.value = null
    try {
      keywords.value = await apiGet<Keyword[]>(`/keywords/${encodeURIComponent(cocoonName)}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      isLoading.value = false
    }
  }

  return { keywords, isLoading, error, fetchKeywordsByCocoon }
})
