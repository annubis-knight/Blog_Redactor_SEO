import { watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor.store'
import { useSeoStore } from '@/stores/seo.store'
import { log } from '@/utils/logger'
import type { Keyword, ArticleKeywords } from '@shared/types/index.js'
import type { RelatedKeyword } from '@shared/types/dataforseo.types.js'

const scheduleIdle = typeof requestIdleCallback === 'function'
  ? requestIdleCallback
  : (cb: IdleRequestCallback) => setTimeout(cb, 0) as unknown as number

const cancelIdle = typeof cancelIdleCallback === 'function'
  ? cancelIdleCallback
  : (id: number) => clearTimeout(id)

/**
 * Composable that watches editor content and recalculates SEO score
 * with a 300ms debounce + requestIdleCallback for non-blocking UI.
 */
export function useSeoScoring(
  keywords: () => Keyword[],
  contentLengthTarget?: () => number | undefined,
  relatedKeywords?: () => RelatedKeyword[],
  articleKeywords?: () => ArticleKeywords | null,
  articleId?: () => number | undefined,
) {
  const editorStore = useEditorStore()
  const seoStore = useSeoStore()

  let pendingIdle: number | null = null

  const debouncedRecalculate = useDebounceFn(() => {
    const content = editorStore.content
    if (!content) {
      log.debug('[seo-scoring] no content, resetting')
      seoStore.reset()
      return
    }

    const kws = keywords()
    const artKws = articleKeywords?.() ?? null
    const id = articleId?.()

    log.info('[seo-scoring] recalculating', {
      contentLength: content.length,
      cocoonKeywords: kws.length,
      articleKeywords: artKws ? `capitaine=${artKws.capitaine}, lieutenants=${artKws.lieutenants.length}, lexique=${artKws.lexique.length}` : 'null',
    })

    if (pendingIdle !== null) cancelIdle(pendingIdle)

    pendingIdle = scheduleIdle(() => {
      seoStore.recalculate(
        content,
        kws,
        editorStore.metaTitle,
        editorStore.metaDescription,
        contentLengthTarget?.(),
        relatedKeywords?.(),
        artKws,
        id,
      )

      if (seoStore.score) {
        log.info('[seo-scoring] result', {
          global: seoStore.score.global,
          wordCount: seoStore.score.wordCount,
          densities: seoStore.score.keywordDensities.map(d => `${d.keyword}: ${d.occurrences}x (${d.density}%)`),
          metaTitle: `${seoStore.score.metaAnalysis.titleLength}ch`,
          metaDesc: `${seoStore.score.metaAnalysis.descriptionLength}ch`,
        })
      }

      pendingIdle = null
    })
  }, 300)

  watch(
    () => [
      editorStore.content,
      editorStore.metaTitle,
      editorStore.metaDescription,
      keywords(),
      articleKeywords?.(),
    ],
    () => {
      log.debug('[seo-scoring] watcher triggered', {
        hasContent: !!editorStore.content,
        hasMeta: !!editorStore.metaTitle,
        keywordsCount: keywords().length,
        hasArticleKeywords: !!articleKeywords?.()?.capitaine,
      })
      debouncedRecalculate()
    },
    { deep: true },
  )

  return { seoStore }
}
