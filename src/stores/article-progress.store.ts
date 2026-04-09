import { ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPost, apiPut } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ArticleProgress, SemanticTerm } from '@shared/types/index.js'

const MAX_CACHED_SLUGS = 50

function evictOldest(map: Record<string, unknown>) {
  const keys = Object.keys(map)
  if (keys.length > MAX_CACHED_SLUGS) {
    const toRemove = keys.slice(0, keys.length - MAX_CACHED_SLUGS)
    for (const key of toRemove) delete map[key]
  }
}

export const useArticleProgressStore = defineStore('article-progress', () => {
  const progressMap = ref<Record<string, ArticleProgress>>({})
  const semanticMap = ref<Record<string, SemanticTerm[]>>({})
  const isLoading = ref(false)

  async function fetchProgress(slug: string): Promise<ArticleProgress | null> {
    try {
      const res = await apiGet<ArticleProgress | null>(`/articles/${encodeURIComponent(slug)}/progress`)
      if (res) {
        progressMap.value[slug] = res
        evictOldest(progressMap.value)
        log.debug(`[article-progress] fetched ${slug} (phase=${res.phase})`)
      }
      return res
    } catch {
      log.warn(`[article-progress] fetchProgress failed for ${slug}`)
      return null
    }
  }

  async function saveProgress(slug: string, progress: ArticleProgress): Promise<void> {
    const res = await apiPut<ArticleProgress>(`/articles/${encodeURIComponent(slug)}/progress`, progress)
    progressMap.value[slug] = res
    evictOldest(progressMap.value)
    log.debug(`[article-progress] saved ${slug} (phase=${progress.phase})`)
  }

  async function addCheck(slug: string, check: string): Promise<void> {
    const res = await apiPost<ArticleProgress>(`/articles/${encodeURIComponent(slug)}/progress/check`, { check })
    progressMap.value[slug] = res
    evictOldest(progressMap.value)
    log.debug(`[article-progress] check added: "${check}" for ${slug}`)
  }

  async function removeCheck(slug: string, check: string): Promise<void> {
    const res = await apiPost<ArticleProgress>(`/articles/${encodeURIComponent(slug)}/progress/uncheck`, { check })
    progressMap.value[slug] = res
    evictOldest(progressMap.value)
    log.debug(`[article-progress] check removed: "${check}" for ${slug}`)
  }

  async function fetchSemanticField(slug: string): Promise<SemanticTerm[]> {
    try {
      const res = await apiGet<SemanticTerm[]>(`/articles/${encodeURIComponent(slug)}/semantic-field`)
      semanticMap.value[slug] = res ?? []
      evictOldest(semanticMap.value)
      log.debug(`[article-progress] semantic field loaded for ${slug}: ${(res ?? []).length} terms`)
      return res ?? []
    } catch {
      log.warn(`[article-progress] fetchSemanticField failed for ${slug}`)
      return []
    }
  }

  async function saveSemanticField(slug: string, terms: SemanticTerm[]): Promise<void> {
    const res = await apiPut<SemanticTerm[]>(`/articles/${encodeURIComponent(slug)}/semantic-field`, { terms })
    semanticMap.value[slug] = res
    evictOldest(semanticMap.value)
    log.debug(`[article-progress] semantic field saved for ${slug}: ${terms.length} terms`)
  }

  async function addSemanticTerms(slug: string, terms: SemanticTerm[]): Promise<void> {
    const res = await apiPost<SemanticTerm[]>(`/articles/${encodeURIComponent(slug)}/semantic-field/add`, { terms })
    semanticMap.value[slug] = res
    evictOldest(semanticMap.value)
    log.debug(`[article-progress] ${terms.length} semantic terms added for ${slug}`)
  }

  function getProgress(slug: string): ArticleProgress | null {
    return progressMap.value[slug] ?? null
  }

  function getSemanticField(slug: string): SemanticTerm[] {
    return semanticMap.value[slug] ?? []
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
