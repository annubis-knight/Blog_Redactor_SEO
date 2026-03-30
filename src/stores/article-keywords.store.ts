import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPut, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ArticleKeywords } from '@shared/types/index.js'

export const useArticleKeywordsStore = defineStore('article-keywords', () => {
  const keywords = ref<ArticleKeywords | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isSuggestingLexique = ref(false)
  const error = ref<string | null>(null)

  const hasKeywords = computed(() => !!keywords.value?.capitaine)

  async function fetchKeywords(slug: string) {
    isLoading.value = true
    error.value = null
    try {
      keywords.value = await apiGet<ArticleKeywords | null>(`/articles/${slug}/keywords`)
      log.debug(`[article-keywords] fetched for ${slug}`, { capitaine: keywords.value?.capitaine })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error(`[article-keywords] fetchKeywords failed`, { slug, error: error.value })
    } finally {
      isLoading.value = false
    }
  }

  async function saveKeywords(slug: string) {
    if (!keywords.value) return
    isSaving.value = true
    error.value = null
    try {
      keywords.value = await apiPut<ArticleKeywords>(`/articles/${slug}/keywords`, {
        capitaine: keywords.value.capitaine,
        lieutenants: keywords.value.lieutenants,
        lexique: keywords.value.lexique,
      })
      log.debug(`[article-keywords] saved for ${slug}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de sauvegarde'
      log.error(`[article-keywords] saveKeywords failed`, { slug, error: error.value })
    } finally {
      isSaving.value = false
    }
  }

  async function suggestLexique(slug: string, articleTitle: string, cocoonName: string) {
    if (!keywords.value?.capitaine) return
    log.info(`[article-keywords] suggesting lexique for ${slug}`)
    isSuggestingLexique.value = true
    error.value = null
    try {
      const result = await apiPost<{ lexique: string[] }>('/keywords/lexique-suggest', {
        capitaine: keywords.value.capitaine,
        articleTitle,
        cocoonName,
      })
      if (keywords.value) {
        keywords.value.lexique = result.lexique
        log.debug(`[article-keywords] lexique suggested: ${result.lexique.length} terms`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de suggestion'
      log.error(`[article-keywords] suggestLexique failed`, { slug, error: error.value })
    } finally {
      isSuggestingLexique.value = false
    }
  }

  function setCapitaine(value: string) {
    if (!keywords.value) {
      keywords.value = { articleSlug: '', capitaine: value, lieutenants: [], lexique: [] }
    } else {
      keywords.value.capitaine = value
    }
  }

  function addLieutenant(value: string) {
    if (!keywords.value) return
    if (!keywords.value.lieutenants.includes(value)) {
      keywords.value.lieutenants.push(value)
    }
  }

  function removeLieutenant(value: string) {
    if (!keywords.value) return
    keywords.value.lieutenants = keywords.value.lieutenants.filter(l => l !== value)
  }

  function addLexiqueTerm(value: string) {
    if (!keywords.value) return
    if (!keywords.value.lexique.includes(value)) {
      keywords.value.lexique.push(value)
    }
  }

  function removeLexiqueTerm(value: string) {
    if (!keywords.value) return
    keywords.value.lexique = keywords.value.lexique.filter(t => t !== value)
  }

  function initEmpty(slug: string) {
    keywords.value = { articleSlug: slug, capitaine: '', lieutenants: [], lexique: [] }
  }

  function $reset() {
    keywords.value = null
    isLoading.value = false
    isSaving.value = false
    isSuggestingLexique.value = false
    error.value = null
  }

  return {
    keywords, isLoading, isSaving, isSuggestingLexique, error, hasKeywords,
    fetchKeywords, saveKeywords, suggestLexique,
    setCapitaine, addLieutenant, removeLieutenant, addLexiqueTerm, removeLexiqueTerm,
    initEmpty, $reset,
  }
})
