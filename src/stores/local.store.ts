import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiPost, apiGet } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { MapsResult, AnchorageScore, LocalEntity } from '@shared/types/index.js'

export const useLocalStore = defineStore('local', () => {
  // Maps (Epic 14)
  const mapsData = ref<MapsResult | null>(null)
  const isAnalyzingMaps = ref(false)
  const mapsError = ref<string | null>(null)

  // Local Anchoring (Epic 15)
  const anchorageScore = ref<AnchorageScore | null>(null)
  const isScoring = ref(false)
  const scoreError = ref<string | null>(null)
  const entities = ref<LocalEntity[]>([])

  // Computed
  const hasLocalPack = computed(() => mapsData.value?.hasLocalPack ?? false)
  const reviewGap = computed(() => mapsData.value?.reviewGap ?? null)
  const localScore = computed(() => anchorageScore.value?.score ?? 0)
  const hasSuggestions = computed(() => (anchorageScore.value?.suggestions.length ?? 0) > 0)

  // Actions
  async function analyzeMaps(keyword: string, locationCode?: number) {
    isAnalyzingMaps.value = true
    mapsError.value = null
    log.info(`[local] analyzeMaps "${keyword}"`)
    try {
      mapsData.value = await apiPost<MapsResult>('/local/maps', { keyword, locationCode })
      log.debug(`[local] maps done`, { hasLocalPack: mapsData.value?.hasLocalPack, listings: mapsData.value?.listings?.length })
    } catch (err) {
      mapsError.value = err instanceof Error ? err.message : 'Erreur analyse Maps'
      log.error(`[local] analyzeMaps failed: ${mapsError.value}`)
    } finally {
      isAnalyzingMaps.value = false
    }
  }

  async function scoreContent(content: string) {
    isScoring.value = true
    scoreError.value = null
    log.info(`[local] scoreContent (length: ${content.length})`)
    try {
      anchorageScore.value = await apiPost<AnchorageScore>('/local/score', { content })
      log.debug(`[local] score: ${anchorageScore.value?.score}/${anchorageScore.value?.maxScore}`)
    } catch (err) {
      scoreError.value = err instanceof Error ? err.message : 'Erreur scoring local'
      log.error(`[local] scoreContent failed: ${scoreError.value}`)
    } finally {
      isScoring.value = false
    }
  }

  async function loadEntities() {
    if (entities.value.length > 0) return
    try {
      entities.value = await apiGet<LocalEntity[]>('/local/entities')
    } catch {
      // non-blocking
    }
  }

  function reset() {
    mapsData.value = null
    anchorageScore.value = null
    mapsError.value = null
    scoreError.value = null
  }

  return {
    mapsData, isAnalyzingMaps, mapsError,
    anchorageScore, isScoring, scoreError, entities,
    hasLocalPack, reviewGap, localScore, hasSuggestions,
    analyzeMaps, scoreContent, loadEntities, reset,
  }
})
