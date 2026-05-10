/**
 * AUTHORITY: PostgreSQL `keywords` table + cache `keyword_metrics`
 * READS FROM: POST /api/keywords/audit (audit complet)
 *             GET  /api/keywords/audit/:cocoon/status (freshness cache)
 * WRITES TO:  POST /api/keywords (addKeyword)
 *             PUT  /api/keywords (replaceKeyword)
 *             PATCH /api/keywords/:keyword/status (updateKeywordStatus)
 *             DELETE /api/keywords/:keyword (deleteKeyword)
 * CONSUMERS: KeywordAuditTable.vue (lieutenants Moteur)
 * RELATED FR: FR-INFRA-API-WRAPPER, NFR-INT-API-WRAPPER, NFR-OBS-COST-LOG,
 *             NFR-OBS-DBOPS-TRACK, NFR-OBS-KNOWN-ERRORS
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  KeywordAuditResult,
  RedundancyPair,
  TypeScore,
  AuditCacheStatus,
  KeywordType,
  KeywordStatus,
} from '@shared/types/index.js'
import { log } from '@/utils/logger'
import { averageScores } from '@shared/score/index.js'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/services/api.service'

export const useKeywordAuditStore = defineStore('keywordAudit', () => {
  const results = ref<KeywordAuditResult[]>([])
  const redundancies = ref<RedundancyPair[]>([])
  const cacheStatus = ref<AuditCacheStatus | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentCocoon = ref<string>('')

  const typeScores = computed<TypeScore[]>(() => {
    const types: KeywordType[] = ['Pilier', 'Moyenne traine', 'Longue traine', 'Intermédiaire', 'Spécialisé']
    return types.map(type => {
      const ofType = results.value.filter(r => r.type === type)
      // Moyenne null-safe : composantes manquantes exclues, jamais comptées comme 0.
      const avgRaw = averageScores(ofType.map(r => r.compositeScore.total))
      const avg = avgRaw === null ? 0 : Math.round(avgRaw)
      const alertCount = ofType.reduce((sum, r) => sum + r.alerts.length, 0)
      return { type, averageScore: avg, keywordCount: ofType.length, alertCount }
    })
  })

  const totalAlerts = computed(() => results.value.reduce((sum, r) => sum + r.alerts.length, 0))

  async function fetchAudit(cocoonName: string, forceRefresh = false) {
    loading.value = true
    error.value = null
    currentCocoon.value = cocoonName

    try {
      const data = await apiPost<{ results: KeywordAuditResult[]; redundancies: RedundancyPair[] }>(
        '/keywords/audit',
        { cocoonName, forceRefresh },
      )
      log.info(`Audit done for "${cocoonName}"`, { results: data.results.length, redundancies: data.redundancies.length })
      results.value = data.results
      redundancies.value = data.redundancies
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  async function fetchCacheStatus(cocoonName: string) {
    try {
      const data = await apiGet<AuditCacheStatus>(`/keywords/audit/${encodeURIComponent(cocoonName)}/status`)
      log.debug(`Audit cache status for "${cocoonName}"`, data)
      cacheStatus.value = data
    } catch {
      // Silent fail — cache status is optional
    }
  }

  async function addKeyword(keyword: string, cocoonName: string, type: KeywordType) {
    await apiPost<{ success: boolean }>('/keywords', { keyword, cocoonName, type })
  }

  async function replaceKeywordAction(oldKeyword: string, newKeyword: string, cocoonName: string, type: KeywordType) {
    await apiPut<{ success: boolean }>('/keywords', {
      oldKeyword,
      newKeyword: { keyword: newKeyword, cocoonName, type },
    })
  }

  async function updateKeywordStatus(keyword: string, status: KeywordStatus) {
    await apiPatch<{ success: boolean }>(`/keywords/${encodeURIComponent(keyword)}/status`, { status })
    // Update local state
    const result = results.value.find(r => r.keyword === keyword)
    if (result) result.status = status
  }

  async function deleteKeywordAction(keyword: string) {
    await apiDelete<{ success: boolean }>(`/keywords/${encodeURIComponent(keyword)}`)
  }

  /**
   * Ajoute en lot plusieurs mots-clés au cocoon. Utilisé par DiscoveryPanel
   * (sélection multiple) — évite que le composant fasse des appels HTTP
   * directs (FR-INFRA-API-WRAPPER, NFR-INT-API-WRAPPER).
   */
  async function addKeywordsBatch(keywords: { keyword: string; type: KeywordType }[], cocoonName: string) {
    for (const { keyword, type } of keywords) {
      await addKeyword(keyword, cocoonName, type)
    }
  }

  function $reset() {
    results.value = []
    redundancies.value = []
    cacheStatus.value = null
    loading.value = false
    error.value = null
    currentCocoon.value = ''
  }

  return {
    results,
    redundancies,
    cacheStatus,
    loading,
    error,
    currentCocoon,
    typeScores,
    totalAlerts,
    fetchAudit,
    fetchCacheStatus,
    addKeyword,
    addKeywordsBatch,
    updateKeywordStatus,
    replaceKeywordAction,
    deleteKeywordAction,
    $reset,
    reset: $reset,
  }
})
