import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost, apiPut } from '@/services/api.service'
import { log } from '@/utils/logger'
import type {
  LinkingMatrix,
  LinkSuggestion,
  InternalLink,
  OrphanArticle,
  AnchorDiversityAlert,
  CrossCocoonOpportunity,
} from '@shared/types/index.js'

interface MatrixResponse {
  matrix: LinkingMatrix
  orphans: OrphanArticle[]
  anchorAlerts: AnchorDiversityAlert[]
  crossCocoonOpportunities: CrossCocoonOpportunity[]
}

export const useLinkingStore = defineStore('linking', () => {
  const matrix = ref<LinkingMatrix | null>(null)
  const suggestions = ref<LinkSuggestion[]>([])
  const orphans = ref<OrphanArticle[]>([])
  const anchorAlerts = ref<AnchorDiversityAlert[]>([])
  const crossCocoonOpportunities = ref<CrossCocoonOpportunity[]>([])
  const isLoading = ref(false)
  const isSuggesting = ref(false)
  const error = ref<string | null>(null)

  const totalLinks = computed(() => matrix.value?.links.length ?? 0)
  const orphanCount = computed(() => orphans.value.length)

  async function fetchMatrix() {
    isLoading.value = true
    error.value = null
    log.info(`[linking] fetchMatrix`)
    try {
      const data = await apiGet<MatrixResponse>('/links/matrix')
      matrix.value = data.matrix
      orphans.value = data.orphans
      anchorAlerts.value = data.anchorAlerts
      crossCocoonOpportunities.value = data.crossCocoonOpportunities
      log.debug(`[linking] matrix loaded`, { links: data.matrix.links.length, orphans: data.orphans.length })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error(`[linking] fetchMatrix failed: ${error.value}`)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchSuggestions(articleId: number, content: string) {
    isSuggesting.value = true
    error.value = null
    log.info(`[linking] fetchSuggestions for article ${articleId}`)
    try {
      suggestions.value = await apiPost<LinkSuggestion[]>('/links/suggest', {
        articleId,
        content,
      })
      log.debug(`[linking] ${suggestions.value.length} suggestions found`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error(`[linking] fetchSuggestions failed: ${error.value}`)
    } finally {
      isSuggesting.value = false
    }
  }

  async function saveLinks(links: InternalLink[]) {
    log.info(`[linking] saveLinks (${links.length} links)`)
    try {
      const data = await apiPut<LinkingMatrix>('/links', { links })
      matrix.value = data
      log.debug(`[linking] links saved`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error(`[linking] saveLinks failed: ${error.value}`)
    }
  }

  function clearSuggestions() {
    suggestions.value = []
  }

  function reset() {
    matrix.value = null
    suggestions.value = []
    orphans.value = []
    anchorAlerts.value = []
    crossCocoonOpportunities.value = []
    isLoading.value = false
    isSuggesting.value = false
    error.value = null
  }

  return {
    matrix,
    suggestions,
    orphans,
    anchorAlerts,
    crossCocoonOpportunities,
    isLoading,
    isSuggesting,
    error,
    totalLinks,
    orphanCount,
    fetchMatrix,
    fetchSuggestions,
    saveLinks,
    clearSuggestions,
    reset,
  }
})
