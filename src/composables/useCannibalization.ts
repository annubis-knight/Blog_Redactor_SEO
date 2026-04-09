import { ref, watch, type Ref } from 'vue'
import { useArticleKeywordsStore } from '@/stores/article-keywords.store'
import { apiGet } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { CannibalizationWarning } from '@shared/types/seo.types.js'

/**
 * Detects keyword cannibalization by comparing the current article's capitaine
 * with other articles in the same cocoon.
 */
export function useCannibalization(
  articleSlug: Ref<string>,
  cocoonName: Ref<string>,
) {
  const warnings = ref<CannibalizationWarning[]>([])
  const articleKeywordsStore = useArticleKeywordsStore()

  async function refresh() {
    if (!cocoonName.value || !articleKeywordsStore.keywords?.capitaine) {
      warnings.value = []
      return
    }

    try {
      const capitainesMap = await apiGet<Record<string, string>>(
        `/cocoons/${encodeURIComponent(cocoonName.value)}/capitaines`,
      )

      const myCapitaine = articleKeywordsStore.keywords.capitaine.toLowerCase()
      const mySlug = articleSlug.value
      const result: CannibalizationWarning[] = []

      for (const [slug, cap] of Object.entries(capitainesMap)) {
        if (slug !== mySlug && cap.toLowerCase() === myCapitaine) {
          result.push({
            keyword: articleKeywordsStore.keywords.capitaine,
            conflictingSlug: slug,
            conflictingTitle: slug, // slug as title fallback
          })
        }
      }

      warnings.value = result

      if (result.length > 0) {
        log.warn('[cannibalization] conflicts detected', {
          capitaine: myCapitaine,
          conflicts: result.map(r => r.conflictingSlug),
        })
      }
    } catch (err) {
      log.debug('[cannibalization] fetch failed', { error: (err as Error).message })
      warnings.value = []
    }
  }

  // Auto-refresh when cocoon or keywords change
  watch(
    () => [cocoonName.value, articleKeywordsStore.keywords?.capitaine],
    () => { refresh() },
    { immediate: true },
  )

  return { warnings, refresh }
}
