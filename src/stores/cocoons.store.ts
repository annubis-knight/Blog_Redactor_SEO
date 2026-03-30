import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGet } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { Cocoon } from '@shared/types/index.js'

export const useCocoonsStore = defineStore('cocoons', () => {
  const cocoons = ref<Cocoon[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const totalArticles = computed(() =>
    cocoons.value.reduce((sum, c) => sum + c.stats.totalArticles, 0),
  )

  async function fetchCocoons() {
    isLoading.value = true
    error.value = null
    try {
      cocoons.value = await apiGet<Cocoon[]>('/cocoons')
      log.debug(`[cocoons] fetched ${cocoons.value.length} cocoons`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error('[cocoons] fetchCocoons failed', { error: error.value })
    } finally {
      isLoading.value = false
    }
  }

  return { cocoons, isLoading, error, totalArticles, fetchCocoons }
})
