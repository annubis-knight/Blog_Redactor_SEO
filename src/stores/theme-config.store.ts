import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPut } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ThemeConfig } from '@shared/types/index.js'

const DEFAULT_CONFIG: ThemeConfig = {
  avatar: { sector: '', companySize: '', location: '', budget: '', digitalMaturity: '' },
  positioning: { targetAudience: '', mainPromise: '', differentiators: [], painPoints: [] },
  offerings: { services: [], mainCTA: '', ctaTarget: '' },
  toneOfVoice: { style: '', vocabulary: [] },
}

export const useThemeConfigStore = defineStore('themeConfig', () => {
  const config = ref<ThemeConfig>({ ...DEFAULT_CONFIG })
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  async function fetchConfig() {
    isLoading.value = true
    error.value = null
    try {
      config.value = await apiGet<ThemeConfig>('/theme/config')
      log.debug('[theme-config] loaded')
    } catch (err) {
      error.value = (err as Error).message
      log.error('[theme-config] fetchConfig failed', { error: error.value })
    } finally {
      isLoading.value = false
    }
  }

  async function saveConfig() {
    isSaving.value = true
    error.value = null
    try {
      config.value = await apiPut<ThemeConfig>('/theme/config', config.value)
      log.info('[theme-config] saved')
    } catch (err) {
      error.value = (err as Error).message
      log.error('[theme-config] saveConfig failed', { error: error.value })
    } finally {
      isSaving.value = false
    }
  }

  return { config, isLoading, isSaving, error, fetchConfig, saveConfig }
})
