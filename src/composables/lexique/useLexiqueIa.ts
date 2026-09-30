import { computed, type Ref, type ComputedRef } from 'vue'
import { useStreaming } from '@/composables/editor/useStreaming'
import { log } from '@/utils/logger'
import { lexiqueAnalysisContract } from '@shared/contracts/lexique.contract.js'
import type { TfidfResult, LexiqueAnalysisResult, LexiqueTermRecommendation } from '@shared/types/serp-analysis.types.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'

/**
 * AUTHORITY: PostgreSQL `lexique_explorations` (ai_recommendations, ai_missing_terms,
 *            ai_summary : enregistrés par le serveur avant l'événement `done`).
 * READS FROM: l'analyse affichée de useLexiqueExplorations (iaRecommendations),
 *             pour les badges et les compteurs du panneau.
 * WRITES TO: POST /keywords/:keyword/ai-lexique-upfront (SSE), sur un clic seulement ;
 *            la réponse est rangée par useLexiqueExplorations.applyIaAnalysis.
 * CONSUMERS: LexiquePanel (badges « IA recommandé / IA optionnel »,
 *            « N termes analysés — X recommandés · Y écartés »).
 * RELATED FR: FR-LEX-AI-PANEL (une seule analyse affichée : celle du mot-clé
 *             affiché), FR-LEX-METIER-ONLY, FR-MOT-NO-AUTO-ACTION.
 *
 * Vague 5 — Composable extrait de LexiquePanel. Lance l'analyse IA upfront du
 * Lexique et compte ses recommandations. Il ne garde aucune liste à lui : les
 * badges, les compteurs, le résumé et les termes manquants lisent l'analyse du
 * mot-clé affiché, relue en base ou reçue de l'IA. Deux listes se contredisaient
 * (recette du 2026-09-30).
 *
 * Les recommandations s'affichent ; elles ne cochent rien. L'utilisateur
 * choisit ses termes (FR-LEX-METIER-ONLY, épopée qualité SEO M11).
 */
export interface LexiqueIaDeps {
  tfidfResult: Ref<TfidfResult | null>
  /** Mot-clé de la liste affichée : l'analyse part pour lui (useLexiqueExplorations). */
  analysisKeyword: ComputedRef<string>
  /** Recommandations de l'analyse affichée (useLexiqueExplorations). */
  iaRecommendations: ComputedRef<Map<string, LexiqueTermRecommendation>>
  /** Reçoit l'analyse terminée, que le serveur vient d'enregistrer sous `keyword`. */
  onAnalysisDone: (keyword: string, result: LexiqueAnalysisResult) => void
  articleLevel: Ref<ArticleLevel | null>
  cocoonSlug: Ref<string>
  selectedArticleId: Ref<number | undefined>
}

export interface LexiqueIaApi {
  /** True pendant le streaming IA. */
  iaIsStreaming: Ref<boolean>
  /** Erreur de streaming ou null. */
  iaError: Ref<string | null>
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
}

export function useLexiqueIa(deps: LexiqueIaDeps): LexiqueIaApi {
  const { tfidfResult, analysisKeyword, iaRecommendations, onAnalysisDone, articleLevel, cocoonSlug, selectedArticleId } = deps

  const {
    isStreaming: iaIsStreaming,
    error: iaError,
    startStream: iaStartStream,
    abort: iaAbort,
  } = useStreaming<LexiqueAnalysisResult>()

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
    const keyword = analysisKeyword.value
    if (!keyword || !tfidfResult.value) return
    const data = tfidfResult.value
    const articleId = selectedArticleId.value
    iaAbort()

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
        articleId: articleId ?? undefined,
      },
      {
        onDone: (result) => {
          // Réponse d'un article quitté : elle ne s'affiche pas sur le suivant.
          if (selectedArticleId.value !== articleId) return
          log.info(`[useLexiqueIa] IA upfront: ${result.recommendations.length} recommendations`, { keyword })
          // L'IA recommande, elle ne coche pas : l'utilisateur choisit
          // (FR-LEX-METIER-ONLY, épopée qualité SEO M11).
          onAnalysisDone(keyword, result)
        },
      },
      { contract: lexiqueAnalysisContract },
    )
  }

  return {
    iaIsStreaming,
    iaError,
    iaRecommendedCount,
    iaNotRecommendedCount,
    iaAbort,
    getRecommendation,
    isIaRecommended,
    generateLexiqueUpfront,
  }
}
