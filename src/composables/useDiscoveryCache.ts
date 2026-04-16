import { ref } from 'vue'
import { apiGet, apiPost, apiDelete } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { DiscoveryCacheEntry, DiscoveryCacheStatus, DiscoveryContext } from '@shared/types/discovery-cache.types'

export function useDiscoveryCache() {
  const cacheStatus = ref<DiscoveryCacheStatus | null>(null)
  const cacheLoading = ref(false)

  async function checkCacheForSeed(seed: string): Promise<void> {
    if (!seed.trim()) {
      cacheStatus.value = null
      return
    }
    cacheLoading.value = true
    try {
      const status = await apiGet<DiscoveryCacheStatus>(
        `/discovery-cache/check?seed=${encodeURIComponent(seed.trim())}`,
      )
      cacheStatus.value = status
    } catch {
      cacheStatus.value = null
    } finally {
      cacheLoading.value = false
    }
  }

  async function loadFromCache(seed: string): Promise<DiscoveryCacheEntry | null> {
    try {
      const entry = await apiGet<DiscoveryCacheEntry | null>(
        `/discovery-cache/load?seed=${encodeURIComponent(seed.trim())}`,
      )
      if (!entry) return null
      log.info(`Discovery: loaded from cache for "${seed}"`)
      return entry
    } catch (err) {
      log.warn(`Discovery: cache load failed: ${(err as Error).message}`)
      return null
    }
  }

  async function saveToCache(
    seed: string,
    context: DiscoveryContext,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      await apiPost('/discovery-cache/save', { seed, context, ...data })
      cacheStatus.value = { cached: true, cachedAt: new Date().toISOString() }
      log.info(`Discovery: results saved to cache for "${seed}"`)
    } catch (err) {
      log.warn(`Discovery: cache save failed: ${(err as Error).message}`)
    }
  }

  async function clearCacheForSeed(seed: string): Promise<void> {
    try {
      await apiDelete(`/discovery-cache?seed=${encodeURIComponent(seed.trim())}`)
      cacheStatus.value = null
      log.info(`Discovery: cache cleared for "${seed}"`)
    } catch (err) {
      log.warn(`Discovery: cache clear failed: ${(err as Error).message}`)
    }
  }

  function resetCache() {
    cacheStatus.value = null
    cacheLoading.value = false
  }

  return {
    cacheStatus,
    cacheLoading,
    checkCacheForSeed,
    loadFromCache,
    saveToCache,
    clearCacheForSeed,
    resetCache,
  }
}
