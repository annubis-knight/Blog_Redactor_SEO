import { computed, type Ref } from 'vue'
import { checkKeywordComposition } from '@shared/composition-rules.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import type { CompositionCheckResult } from '@shared/types/composition.types.js'

/**
 * Reactive composition check — runs synchronously on every input change.
 * No API calls, purely client-side.
 */
export function useCompositionCheck(
  keyword: Ref<string>,
  level: Ref<ArticleLevel>,
) {
  const compositionResult = computed<CompositionCheckResult | null>(() => {
    const kw = keyword.value.trim()
    if (kw.length < 2) return null
    return checkKeywordComposition(kw, level.value)
  })

  const warnings = computed(() =>
    compositionResult.value?.results.filter(r => !r.pass && r.severity === 'warning') ?? [],
  )

  const passes = computed(() =>
    compositionResult.value?.results.filter(r => r.pass) ?? [],
  )

  const allPass = computed(() => compositionResult.value?.allPass ?? true)
  const warningCount = computed(() => compositionResult.value?.warningCount ?? 0)

  return {
    compositionResult,
    warnings,
    passes,
    allPass,
    warningCount,
  }
}

// Re-export for non-reactive usage (e.g., BrainPhase batch check)
export { checkKeywordComposition } from '@shared/composition-rules.js'
