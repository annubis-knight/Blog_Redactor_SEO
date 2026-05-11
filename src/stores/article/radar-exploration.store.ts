/**
 * AUTHORITY: PostgreSQL `radar_explorations` (article-scoped, 1 row/article).
 * READS FROM: GET /articles/:id/radar-exploration (hydratation au mount/switch).
 * WRITES TO:
 *   - POST /articles/:id/radar-exploration/keyword (add unitaire)
 *   - DELETE /articles/:id/radar-exploration/keyword (remove unitaire)
 *   - POST /articles/:id/radar-exploration/keywords (batch add)
 *   - POST /articles/:id/radar-exploration (full upsert après scan)
 * CONSUMERS:
 *   - RadarPanel.vue (Phase 2 generatedKeywords + Phase 3 scanCards)
 *   - useKeywordRadar (composable scan)
 *   - KeywordAssistPanel (Capitaine/Lieutenants/Lexique — Sprint D)
 * RELATED FR:
 *   - FR-RAD-DB-FIRST (source de vérité unique radar_explorations)
 *   - FR-RAD-MANUAL-ADD (input texte unitaire)
 *   - FR-MOT-BASKET-DEPRECATED (remplace useMoteurBasketStore pour les keywords Radar)
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiGet, apiPost, apiDelete } from '@/services/api.service'
import { log } from '@/utils/logger'
import type {
  RadarKeyword,
  RadarCard,
  KeywordRadarScanResult,
} from '@shared/types/intent.types'

export interface RadarExplorationContext {
  broadKeyword: string
  specificTopic: string
  painPoint: string
  depth: number
}

export interface RadarExplorationEntry {
  articleId: number
  seed: string
  context: RadarExplorationContext
  generatedKeywords: RadarKeyword[]
  scanResult: KeywordRadarScanResult
  scannedAt: string
}

export const useRadarExplorationStore = defineStore('radar-exploration', () => {
  const entry = ref<RadarExplorationEntry | null>(null)
  const articleId = ref<number | null>(null)
  const isLoading = ref(false)
  const isMutating = ref(false)

  const generatedKeywords = computed<RadarKeyword[]>(() => entry.value?.generatedKeywords ?? [])
  const scanCards = computed<RadarCard[]>(() => entry.value?.scanResult?.cards ?? [])
  const hasScanResult = computed<boolean>(() => scanCards.value.length > 0)
  const scanResult = computed<KeywordRadarScanResult | null>(() => entry.value?.scanResult ?? null)

  async function setArticle(id: number | null): Promise<void> {
    if (id === articleId.value) return
    articleId.value = id
    entry.value = null
    if (id === null || id <= 0) {
      log.debug('[radar-exploration] setArticle: cleared (no valid id)')
      return
    }
    await hydrate()
  }

  async function hydrate(): Promise<void> {
    if (articleId.value === null) return
    isLoading.value = true
    try {
      const data = await apiGet<RadarExplorationEntry | null>(`/articles/${articleId.value}/radar-exploration`)
      entry.value = data
      log.debug(`[radar-exploration] hydrated article ${articleId.value} (${data?.generatedKeywords?.length ?? 0} keywords, scan=${data?.scanResult?.cards?.length ?? 0})`)
    } catch (err) {
      log.warn(`[radar-exploration] hydrate failed: ${(err as Error).message}`)
      entry.value = null
    } finally {
      isLoading.value = false
    }
  }

  async function addKeyword(keyword: string, reasoning?: string): Promise<boolean> {
    if (articleId.value === null) {
      log.warn('[radar-exploration] addKeyword called without articleId')
      return false
    }
    const trimmed = keyword.trim()
    if (!trimmed) return false
    isMutating.value = true
    try {
      const data = await apiPost<{ entry: RadarExplorationEntry; added: boolean }>(
        `/articles/${articleId.value}/radar-exploration/keyword`,
        { keyword: trimmed, reasoning },
      )
      entry.value = data.entry
      return data.added
    } catch (err) {
      log.warn(`[radar-exploration] addKeyword failed: ${(err as Error).message}`)
      return false
    } finally {
      isMutating.value = false
    }
  }

  async function removeKeyword(keyword: string): Promise<void> {
    if (articleId.value === null) return
    isMutating.value = true
    try {
      const data = await apiDelete<{ entry: RadarExplorationEntry | null }>(
        `/articles/${articleId.value}/radar-exploration/keyword?keyword=${encodeURIComponent(keyword)}`,
      )
      entry.value = data.entry
    } catch (err) {
      log.warn(`[radar-exploration] removeKeyword failed: ${(err as Error).message}`)
    } finally {
      isMutating.value = false
    }
  }

  async function addKeywordsBatch(keywords: Array<{ keyword: string; reasoning?: string }>): Promise<number> {
    if (articleId.value === null) return 0
    if (keywords.length === 0) return 0
    isMutating.value = true
    try {
      const data = await apiPost<{ entry: RadarExplorationEntry; added: number }>(
        `/articles/${articleId.value}/radar-exploration/keywords`,
        { keywords },
      )
      entry.value = data.entry
      return data.added
    } catch (err) {
      log.warn(`[radar-exploration] addKeywordsBatch failed: ${(err as Error).message}`)
      return 0
    } finally {
      isMutating.value = false
    }
  }

  /** Met à jour le scan_result local après un POST /radar/scan réussi. */
  function setScanResultLocal(result: KeywordRadarScanResult): void {
    if (entry.value) {
      entry.value = { ...entry.value, scanResult: result, scannedAt: new Date().toISOString() }
    } else if (articleId.value !== null) {
      entry.value = {
        articleId: articleId.value,
        seed: '',
        context: { broadKeyword: '', specificTopic: '', painPoint: '', depth: 1 },
        generatedKeywords: [],
        scanResult: result,
        scannedAt: new Date().toISOString(),
      }
    }
  }

  function $reset(): void {
    entry.value = null
    articleId.value = null
    isLoading.value = false
    isMutating.value = false
  }

  return {
    entry,
    articleId,
    isLoading,
    isMutating,
    generatedKeywords,
    scanCards,
    hasScanResult,
    scanResult,
    setArticle,
    hydrate,
    addKeyword,
    removeKeyword,
    addKeywordsBatch,
    setScanResultLocal,
    $reset,
  }
})
