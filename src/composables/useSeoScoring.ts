import { watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor.store'
import { useSeoStore } from '@/stores/seo.store'
import { log } from '@/utils/logger'
import type { Keyword, ArticleKeywords } from '@shared/types/index.js'
import type { RelatedKeyword } from '@shared/types/dataforseo.types.js'

/**
 * Composable that watches editor content and recalculates SEO score
 * with a 300ms debounce (NFR3).
 */
export function useSeoScoring(
  keywords: () => Keyword[],
  contentLengthTarget?: () => number | undefined,
  relatedKeywords?: () => RelatedKeyword[],
  articleKeywords?: () => ArticleKeywords | null,
) {
  const editorStore = useEditorStore()
  const seoStore = useSeoStore()

  const debouncedRecalculate = useDebounceFn(() => {
    const content = editorStore.content
    if (!content) {
      log.debug('[seo-scoring] no content, resetting')
      seoStore.reset()
      return
    }

    const kws = keywords()
    const artKws = articleKeywords?.() ?? null

    log.info('[seo-scoring] recalculating', {
      contentLength: content.length,
      cocoonKeywords: kws.length,
      articleKeywords: artKws ? `capitaine=${artKws.capitaine}, lieutenants=${artKws.lieutenants.length}, lexique=${artKws.lexique.length}` : 'null',
    })

    seoStore.recalculate(
      content,
      kws,
      editorStore.metaTitle,
      editorStore.metaDescription,
      contentLengthTarget?.(),
      relatedKeywords?.(),
      artKws,
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
