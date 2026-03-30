import { ref } from 'vue'
import { defineStore } from 'pinia'
import { log } from '@/utils/logger'
import { useStreaming } from '@/composables/useStreaming'
import { apiPost, apiPut } from '@/services/api.service'
import type { BriefData, Outline, ApiUsage } from '@shared/types/index.js'

export const useEditorStore = defineStore('editor', () => {
  const content = ref<string | null>(null)
  const streamedText = ref('')
  const isGenerating = ref(false)
  const error = ref<string | null>(null)
  const metaTitle = ref<string | null>(null)
  const metaDescription = ref<string | null>(null)
  const isDirty = ref(false)
  const isSaving = ref(false)
  const lastSavedAt = ref<string | null>(null)
  const lastArticleUsage = ref<ApiUsage | null>(null)
  const lastMetaUsage = ref<ApiUsage | null>(null)

  async function generateArticle(briefData: BriefData, outline: Outline) {
    log.info(`Generating article "${briefData.article.title}"`)
    isGenerating.value = true
    error.value = null
    streamedText.value = ''
    content.value = null
    metaTitle.value = null
    metaDescription.value = null
    lastArticleUsage.value = null
    lastMetaUsage.value = null

    const pilierKeyword = briefData.keywords.find(kw => kw.type === 'Pilier')

    const body = {
      slug: briefData.article.slug,
      outline: JSON.stringify(outline),
      keyword: pilierKeyword?.keyword ?? briefData.article.title,
      keywords: briefData.keywords.map(kw => kw.keyword),
      paa: briefData.dataForSeo?.paa ?? [],
      articleType: briefData.article.type,
      articleTitle: briefData.article.title,
      cocoonName: briefData.article.cocoonName,
      topic: briefData.article.topic,
    }

    const streaming = useStreaming<{ content: string }>()

    await streaming.startStream('/api/generate/article', body, {
      onChunk: (accumulated) => { streamedText.value = accumulated },
      onDone: (data) => {
        content.value = data.content
        log.info('Article generation done', { contentLength: data.content.length })
      },
      onError: (message) => {
        log.error(`Article generation failed — ${message}`)
        error.value = message
      },
      onUsage: (u) => {
        log.info('Article usage', { inputTokens: u.inputTokens, outputTokens: u.outputTokens, cost: `$${u.estimatedCost.toFixed(4)}` })
        lastArticleUsage.value = u
      },
    })

    isGenerating.value = false
  }

  const isGeneratingMeta = ref(false)

  async function generateMeta(slug: string, keyword: string, articleTitle: string, articleContent: string) {
    log.info(`Generating meta for "${articleTitle}"`)
    isGeneratingMeta.value = true
    error.value = null

    try {
      const data = await apiPost<{ metaTitle: string; metaDescription: string; usage?: ApiUsage }>('/generate/meta', {
        slug,
        keyword,
        articleTitle,
        articleContent,
      })
      metaTitle.value = data.metaTitle
      metaDescription.value = data.metaDescription
      if (data.usage) lastMetaUsage.value = data.usage
      log.info('Meta generated', { metaTitle: data.metaTitle })
    } catch (err) {
      log.error(`Meta generation failed — ${(err as Error).message}`)
      error.value = err instanceof Error ? err.message : 'Erreur lors de la génération des metas'
    } finally {
      isGeneratingMeta.value = false
    }
  }

  async function saveArticle(slug: string) {
    log.info(`Saving article "${slug}"`)
    isSaving.value = true
    try {
      await apiPut(`/articles/${slug}`, {
        content: content.value,
        metaTitle: metaTitle.value,
        metaDescription: metaDescription.value,
      })
      markClean()
      lastSavedAt.value = new Date().toISOString()
      log.info(`Article "${slug}" saved`)
    } catch (err) {
      log.error(`Save failed for "${slug}" — ${(err as Error).message}`)
      error.value = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
    } finally {
      isSaving.value = false
    }
  }

  function setContent(html: string) {
    content.value = html
    isDirty.value = true
  }

  function markClean() {
    isDirty.value = false
  }

  /** Hydrate store with previously saved article data */
  function loadExistingContent(data: { content: string; metaTitle?: string | null; metaDescription?: string | null }) {
    content.value = data.content
    metaTitle.value = data.metaTitle ?? null
    metaDescription.value = data.metaDescription ?? null
    isDirty.value = false
  }

  function resetEditor() {
    content.value = null
    streamedText.value = ''
    isGenerating.value = false
    isGeneratingMeta.value = false
    error.value = null
    metaTitle.value = null
    metaDescription.value = null
    isDirty.value = false
    isSaving.value = false
    lastSavedAt.value = null
  }

  return {
    content, streamedText, isGenerating, isGeneratingMeta, error, metaTitle, metaDescription, isDirty, isSaving, lastSavedAt,
    lastArticleUsage, lastMetaUsage,
    generateArticle, generateMeta, saveArticle, setContent, loadExistingContent, markClean, resetEditor,
  }
})
