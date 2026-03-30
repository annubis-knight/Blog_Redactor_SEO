import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { GscPerformance, GscKeywordGap } from '@shared/types/index.js'

export const useGscStore = defineStore('gsc', () => {
  const isConnected = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const performance = ref<GscPerformance | null>(null)
  const keywordGap = ref<GscKeywordGap | null>(null)

  const hasData = computed(() => performance.value !== null)

  async function checkConnection() {
    log.debug(`[gsc] checkConnection`)
    try {
      const result = await apiGet<{ connected: boolean }>('/gsc/status')
      isConnected.value = result.connected
      log.debug(`[gsc] connected: ${result.connected}`)
    } catch {
      isConnected.value = false
    }
  }

  async function fetchPerformance(siteUrl: string, startDate: string, endDate: string) {
    isLoading.value = true
    error.value = null
    log.info(`[gsc] fetchPerformance`, { siteUrl, startDate, endDate })
    try {
      performance.value = await apiPost<GscPerformance>('/gsc/performance', { siteUrl, startDate, endDate })
      log.debug(`[gsc] performance loaded`, { rows: performance.value?.rows?.length })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur GSC'
      log.error(`[gsc] fetchPerformance failed: ${error.value}`)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchKeywordGap(articleUrl: string, targetKeywords: string[], siteUrl: string) {
    isLoading.value = true
    error.value = null
    log.info(`[gsc] fetchKeywordGap`, { articleUrl, keywords: targetKeywords.length })
    try {
      keywordGap.value = await apiPost<GscKeywordGap>('/gsc/keyword-gap', { articleUrl, targetKeywords, siteUrl })
      log.debug(`[gsc] keyword gap done`, { matched: keywordGap.value?.matched?.length })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur keyword gap'
      log.error(`[gsc] fetchKeywordGap failed: ${error.value}`)
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    performance.value = null
    keywordGap.value = null
    error.value = null
  }

  return {
    isConnected, isLoading, error, performance, keywordGap, hasData,
    checkConnection, fetchPerformance, fetchKeywordGap, reset,
  }
})
