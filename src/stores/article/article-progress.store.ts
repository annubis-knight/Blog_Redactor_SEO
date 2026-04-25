import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost, apiPut } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ArticleProgress } from '@shared/types/index.js'

const MAX_CACHED_ITEMS = 50

function evictOldest(map: Record<string, unknown>) {
  const keys = Object.keys(map)
  if (keys.length > MAX_CACHED_ITEMS) {
    const toRemove = keys.slice(0, keys.length - MAX_CACHED_ITEMS)
    for (const key of toRemove) delete map[key]
  }
}

export const useArticleProgressStore = defineStore('article-progress', () => {
  const progressMap = ref<Record<string, ArticleProgress>>({})
  const isLoading = ref(false)

  async function fetchProgress(id: number): Promise<ArticleProgress | null> {
    try {
      const res = await apiGet<ArticleProgress | null>(`/articles/${id}/progress`)
      if (res) {
        progressMap.value[String(id)] = res
        evictOldest(progressMap.value)
        log.debug(`[article-progress] fetched ${id} (phase=${res.phase})`)
      }
      return res
    } catch {
      log.warn(`[article-progress] fetchProgress failed for ${id}`)
      return null
    }
  }

  async function saveProgress(id: number, progress: ArticleProgress): Promise<void> {
    const res = await apiPut<ArticleProgress>(`/articles/${id}/progress`, progress)
    progressMap.value[String(id)] = res
    evictOldest(progressMap.value)
    log.debug(`[article-progress] saved ${id} (phase=${progress.phase})`)
  }

  async function addCheck(id: number, check: string): Promise<void> {
    const res = await apiPost<ArticleProgress>(`/articles/${id}/progress/check`, { check })
    progressMap.value[String(id)] = res
    evictOldest(progressMap.value)
    log.debug(`[article-progress] check added: "${check}" for ${id}`)
  }

  async function removeCheck(id: number, check: string): Promise<void> {
    const res = await apiPost<ArticleProgress>(`/articles/${id}/progress/uncheck`, { check })
    progressMap.value[String(id)] = res
    evictOldest(progressMap.value)
    log.debug(`[article-progress] check removed: "${check}" for ${id}`)
  }

  function getProgress(id: number): ArticleProgress | null {
    return progressMap.value[String(id)] ?? null
  }

  function clearAll() {
    progressMap.value = {}
  }

  return {
    progressMap,
    isLoading,
    fetchProgress,
    saveProgress,
    addCheck,
    removeCheck,
    getProgress,
    clearAll,
  }
})
