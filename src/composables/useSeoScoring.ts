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
      seoStore.reset()
      return
    }
    log.debug('[seo-scoring] recalculating', { contentLength: content.length, keywords: keywords().length })
    seoStore.recalculate(
      content,
      keywords(),
      editorStore.metaTitle,
      editorStore.metaDescription,
      contentLengthTarget?.(),
      relatedKeywords?.(),
      articleKeywords?.() ?? null,
    )
  }, 300)

  watch(
    () => [editorStore.content, editorStore.metaTitle, editorStore.metaDescription],
    () => { debouncedRecalculate() },
  )

  return { seoStore }
}
