import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost, apiPut } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ArticleProgress, SemanticTerm } from '@shared/types/index.js'

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
  const semanticMap = ref<Record<string, SemanticTerm[]>>({})
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

  async function fetchSemanticField(id: number): Promise<SemanticTerm[]> {
    try {
      const res = await apiGet<SemanticTerm[]>(`/articles/${id}/semantic-field`)
      semanticMap.value[String(id)] = res ?? []
      evictOldest(semanticMap.value)
      log.debug(`[article-progress] semantic field loaded for ${id}: ${(res ?? []).length} terms`)
      return res ?? []
    } catch {
      log.warn(`[article-progress] fetchSemanticField failed for ${id}`)
      return []
    }
  }

  async function saveSemanticField(id: number, terms: SemanticTerm[]): Promise<void> {
    const res = await apiPut<SemanticTerm[]>(`/articles/${id}/semantic-field`, { terms })
    semanticMap.value[String(id)] = res
    evictOldest(semanticMap.value)
    log.debug(`[article-progress] semantic field saved for ${id}: ${terms.length} terms`)
  }

  async function addSemanticTerms(id: number, terms: SemanticTerm[]): Promise<void> {
    const res = await apiPost<SemanticTerm[]>(`/articles/${id}/semantic-field/add`, { terms })
    semanticMap.value[String(id)] = res
    evictOldest(semanticMap.value)
    log.debug(`[article-progress] ${terms.length} semantic terms added for ${id}`)
  }

  function getProgress(id: number): ArticleProgress | null {
    return progressMap.value[String(id)] ?? null
  }

  function getSemanticField(id: number): SemanticTerm[] {
    return semanticMap.value[String(id)] ?? []
  }

  function clearAll() {
    progressMap.value = {}
    semanticMap.value = {}
  }

  return {
    progressMap,
    semanticMap,
    isLoading,
    fetchProgress,
    saveProgress,
    addCheck,
    removeCheck,
    fetchSemanticField,
    saveSemanticField,
    addSemanticTerms,
    getProgress,
    getSemanticField,
    clearAll,
  }
})
