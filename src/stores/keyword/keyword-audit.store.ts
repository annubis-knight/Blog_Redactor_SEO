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
      const avg = ofType.length > 0
        ? Math.round(ofType.reduce((sum, r) => sum + r.compositeScore.total, 0) / ofType.length)
        : 0
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
      const res = await fetch('/api/keywords/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cocoonName, forceRefresh }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Audit failed')
      }

      const json = await res.json()
      log.info(`Audit done for "${cocoonName}"`, { results: json.data.results.length, redundancies: json.data.redundancies.length })
      results.value = json.data.results
      redundancies.value = json.data.redundancies
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  async function fetchCacheStatus(cocoonName: string) {
    try {
      const res = await fetch(`/api/keywords/audit/${encodeURIComponent(cocoonName)}/status`)
      if (!res.ok) return
      const json = await res.json()
      log.debug(`Audit cache status for "${cocoonName}"`, json.data)
      cacheStatus.value = json.data
    } catch {
      // Silent fail — cache status is optional
    }
  }

  async function addKeyword(keyword: string, cocoonName: string, type: KeywordType) {
    const res = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, cocoonName, type }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Failed to add keyword')
    }
  }

  async function replaceKeywordAction(oldKeyword: string, newKeyword: string, cocoonName: string, type: KeywordType) {
    const res = await fetch('/api/keywords', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldKeyword, newKeyword: { keyword: newKeyword, cocoonName, type } }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Failed to replace keyword')
    }
  }

  async function updateKeywordStatus(keyword: string, status: KeywordStatus) {
    const res = await fetch(`/api/keywords/${encodeURIComponent(keyword)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Failed to update status')
    }
    // Update local state
    const result = results.value.find(r => r.keyword === keyword)
    if (result) result.status = status
  }

  async function deleteKeywordAction(keyword: string) {
    const res = await fetch(`/api/keywords/${encodeURIComponent(keyword)}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Failed to delete keyword')
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
    updateKeywordStatus,
    replaceKeywordAction,
    deleteKeywordAction,
    $reset,
    reset: $reset,
  }
})
