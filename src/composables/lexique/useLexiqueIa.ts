import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useStreaming } from '@/composables/editor/useStreaming'
import { log } from '@/utils/logger'
import type { TfidfResult, LexiqueAnalysisResult, LexiqueTermRecommendation } from '@shared/types/serp-analysis.types.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'

/**
 * Vague 5 — Composable extrait de LexiqueExtraction.
 *
 * Encapsule l'analyse IA upfront du Lexique :
 *  - streaming `/api/keywords/{kw}/ai-lexique-upfront`
 *  - parsing des recommandations dans une Map indexée par term lowercase
 *  - pré-cochage automatique des termes obligatoires + différenciateurs
 *    `aiRecommended === true` dans `selectedTerms` (mutable, partagé avec le
 *    parent qui gère aussi le toggle manuel)
 *
 * Dépendances injectées explicites → testable en isolation.
 *
 * NOTE : `selectedTerms` est une `Ref<Set<string>>` mutable partagée avec le
 * parent. Le composable la mute uniquement lors du `onDone` du streaming
 * (pré-cochage). Le toggle manuel reste au parent.
 */
export interface LexiqueIaDeps {
  tfidfResult: Ref<TfidfResult | null>
  selectedTerms: Ref<Set<string>>
  activeSourceKeyword: Ref<string>
  captainKeyword: Ref<string | null>
  articleLevel: Ref<ArticleLevel | null>
  cocoonSlug: Ref<string>
  selectedArticleId: Ref<number | undefined>
}

export interface LexiqueIaApi {
  /** True pendant le streaming IA. */
  iaIsStreaming: Ref<boolean>
  /** Erreur de streaming ou null. */
  iaError: Ref<string | null>
  /** Résultat brut du streaming (LexiqueAnalysisResult ou null). */
  iaResult: ComputedRef<LexiqueAnalysisResult | null>
  /** Map keyword (lowercase) → recommendation. */
  iaRecommendations: Ref<Map<string, LexiqueTermRecommendation>>
  /** Nombre de termes recommandés par l'IA. */
  iaRecommendedCount: ComputedRef<number>
  /** Nombre de termes NON recommandés. */
  iaNotRecommendedCount: ComputedRef<number>
  /** Abort le streaming en cours. */
  iaAbort: () => void
  /** Helper : trouve la reco d'un terme. */
  getRecommendation: (term: string) => LexiqueTermRecommendation | undefined
  /** Helper : true / false / null (null = pas de reco connue). */
  isIaRecommended: (term: string) => boolean | null
  /** Lance le streaming IA upfront. */
  generateLexiqueUpfront: () => void
  /** Reset complet (utilisé au switch d'article). */
  resetIaState: () => void
}

export function useLexiqueIa(deps: LexiqueIaDeps): LexiqueIaApi {
  const { tfidfResult, selectedTerms, activeSourceKeyword, captainKeyword, articleLevel, cocoonSlug, selectedArticleId } = deps

  const {
    isStreaming: iaIsStreaming,
    error: iaError,
    result: iaRawResult,
    startStream: iaStartStream,
    abort: iaAbort,
  } = useStreaming<LexiqueAnalysisResult>()

  const iaResult = computed(() => iaRawResult.value)
  const iaRecommendations = ref<Map<string, LexiqueTermRecommendation>>(new Map())

  const iaRecommendedCount = computed(() => {
    let count = 0
    for (const rec of iaRecommendations.value.values()) {
      if (rec.aiRecommended) count++
    }
    return count
  })

  const iaNotRecommendedCount = computed(
    () => iaRecommendations.value.size - iaRecommendedCount.value,
  )

  function getRecommendation(term: string): LexiqueTermRecommendation | undefined {
    return iaRecommendations.value.get(term.toLowerCase())
  }

  function isIaRecommended(term: string): boolean | null {
    const rec = getRecommendation(term)
    return rec ? rec.aiRecommended : null
  }

  function generateLexiqueUpfront(): void {
    const keyword = activeSourceKeyword.value || captainKeyword.value
    if (!keyword || !tfidfResult.value) return
    const data = tfidfResult.value
    iaAbort()
    iaRecommendations.value = new Map()

    iaStartStream(
      `/api/keywords/${encodeURIComponent(keyword)}/ai-lexique-upfront`,
      {
        level: articleLevel.value,
        allTerms: {
          obligatoire: data.obligatoire.map(t => t.term),
          differenciateur: data.differenciateur.map(t => t.term),
          optionnel: data.optionnel.map(t => t.term),
        },
        cocoonSlug: cocoonSlug.value || undefined,
        articleId: selectedArticleId.value ?? undefined,
      },
      {
        onDone: (result) => {
          log.info(`[useLexiqueIa] IA upfront: ${result.recommendations.length} recommendations`)
          const map = new Map<string, LexiqueTermRecommendation>()
          for (const rec of result.recommendations) {
            map.set(rec.term.toLowerCase(), rec)
          }
          iaRecommendations.value = map

          // Pre-check : all obligatoire + differenciateur where aiRecommended
          if (tfidfResult.value) {
            const preChecked = new Set<string>()
            for (const term of tfidfResult.value.obligatoire) {
              preChecked.add(term.term)
            }
            for (const term of tfidfResult.value.differenciateur) {
              const rec = map.get(term.term.toLowerCase())
              if (rec?.aiRecommended) {
                preChecked.add(term.term)
              }
            }
            selectedTerms.value = preChecked
          }
        },
      },
    )
  }

  function resetIaState(): void {
    iaAbort()
    iaRecommendations.value = new Map()
  }

  return {
    iaIsStreaming,
    iaError,
    iaResult,
    iaRecommendations,
    iaRecommendedCount,
    iaNotRecommendedCount,
    iaAbort,
    getRecommendation,
    isIaRecommended,
    generateLexiqueUpfront,
    resetIaState,
  }
}
