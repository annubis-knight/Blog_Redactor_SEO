import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { Theme, Silo, Cocoon } from '@shared/types/index.js'

export const useSilosStore = defineStore('silos', () => {
  const theme = ref<Theme | null>(null)
  const silos = ref<Silo[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const totalArticles = computed(() =>
    silos.value.reduce((sum, s) => sum + (s.stats?.totalArticles ?? 0), 0),
  )

  const totalCocoons = computed(() =>
    silos.value.reduce((sum, s) => sum + s.cocons.length, 0),
  )

  const globalCompletion = computed(() => {
    const total = totalArticles.value
    if (total === 0) return 0
    const completed = silos.value.reduce(
      (sum, s) => sum + Math.round(((s.stats?.completionPercent ?? 0) / 100) * (s.stats?.totalArticles ?? 0)),
      0,
    )
    return Math.round((completed / total) * 100)
  })

  async function fetchSilos() {
    isLoading.value = true
    error.value = null
    try {
      const [themeData, silosData] = await Promise.all([
        apiGet<Theme>('/theme'),
        apiGet<Silo[]>('/silos'),
      ])
      theme.value = themeData
      silos.value = silosData
      log.debug(`[silos] fetched ${silosData.length} silos`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error('[silos] fetchSilos failed', { error: error.value })
    } finally {
      isLoading.value = false
    }
  }

  async function addCocoon(siloName: string, cocoonName: string): Promise<Cocoon | null> {
    try {
      const cocoon = await apiPost<Cocoon>(`/silos/${encodeURIComponent(siloName)}/cocoons`, { name: cocoonName })
      // Insert into local state
      const silo = silos.value.find(s => s.nom === siloName)
      if (silo) {
        silo.cocons.push(cocoon)
      }
      log.info(`[silos] cocoon "${cocoonName}" added to silo "${siloName}"`)
      return cocoon
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur création cocon'
      log.error('[silos] addCocoon failed', { siloName, cocoonName, error: error.value })
      return null
    }
  }

  return { theme, silos, isLoading, error, totalArticles, totalCocoons, globalCompletion, fetchSilos, addCocoon }
})
