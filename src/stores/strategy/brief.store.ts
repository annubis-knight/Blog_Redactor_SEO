/**
 * AUTHORITY: aucune persistance propre — assemble le brief d'un article ;
 *            longueur visée : PostgreSQL `article_micro_contexts.target_word_count`,
 *            sinon recommandation calculée à l'ouverture (non enregistrée).
 * READS FROM: GET /articles/:id, GET /keywords/:cocoon, POST /dataforseo/brief (sur le
 *             mot-clé de l'article : capitaine verrouillé, sinon suggéré — R13),
 *             POST /articles/:id/recommend-word-count, GET /articles/:id/micro-context
 * WRITES TO: rien (la longueur choisie est enregistrée par BriefStructureStep,
 *            la longueur retenue par la route du premier jet)
 * CONSUMERS: `targetWordCount` → useArticleGeneration (écart, réduction, premier jet),
 *            SeoPanel, useSeoScoring (deux vues de rédaction) ; `briefData` → Brief, Moteur
 * RELATED FR: FR-RED-WORD-COUNT-TARGET, FR-CER-WORD-COUNT-RECOMMEND, FR-RED-DRAFT-SINGLE-PASS,
 *             FR-RED-BRIEF (données SERP sur le mot-clé de l'article, R13)
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { log } from '@/utils/logger'
import { apiGet, apiPost } from '@/services/api.service'
import type { Article, Keyword, DataForSeoCacheEntry, BriefData } from '@shared/types/index.js'
import type { ArticleLevel } from '@shared/types/keyword-validate.types.js'
import { targetWordsFor } from '@shared/constants/article-type-rules.js'

/**
 * Recommandation synchrone fallback basée sur le type d'article. Utilisée tant
 * que la recommandation IA côté serveur n'a pas répondu (ou en offline).
 * Valeur = longueur visée du type (source unique, FR-INFRA-TYPE-RULES-SSOT) :
 * celle que la rédaction applique par défaut.
 */
export function calculateContentLength(articleType: ArticleLevel): number {
  return targetWordsFor(articleType)
}

/**
 * Appelle l'endpoint serveur pour obtenir une recommandation contextualisée :
 * prend en compte SERP avg + sommaire HN + type d'article, via IA.
 * Fallback sur le calcul heuristique si l'endpoint échoue.
 */
async function fetchContentLengthRecommendation(articleId: number, articleType: ArticleLevel): Promise<number> {
  try {
    const res = await apiPost<{ recommended: number }>(`/articles/${articleId}/recommend-word-count`, {})
    if (res?.recommended && res.recommended > 0) return res.recommended
  } catch (err) {
    log.warn(`[brief.store] recommend-word-count failed, fallback heuristique: ${(err as Error).message}`)
  }
  return calculateContentLength(articleType)
}

/** Le mot-clé de l'article : capitaine verrouillé, sinon mot-clé suggéré. */
function keywordOfArticle(article: Pick<Article, 'captainKeywordLocked' | 'suggestedKeyword'> | null): string | null {
  return article?.captainKeywordLocked?.trim() || article?.suggestedKeyword?.trim() || null
}

export const useBriefStore = defineStore('brief', () => {
  const briefData = ref<BriefData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isRefreshing = ref(false)
  const dataForSeoFromCache = ref<boolean | null>(null)
  const currentId = ref<number | null>(null)
  let fetchController: AbortController | null = null

  /**
   * Le mot-clé des données SERP (questions PAA comprises) : celui de l'article —
   * son capitaine verrouillé, sinon son mot-clé suggéré. Jamais le pilier du
   * cocon en repli : un intermédiaire était rédigé avec les questions du pilier (R13).
   */
  const serpKeyword = computed<string | null>(() => keywordOfArticle(briefData.value?.article ?? null))

  /** Longueur choisie pour l'article (micro-contexte), ou retenue par le premier jet. */
  const retainedWordCount = ref<number | null>(null)

  /**
   * Longueur visée, la même partout (R16) : barre de mots, écart, réduction,
   * score SEO et rédaction. Le choix de l'article passe avant la recommandation.
   */
  const targetWordCount = computed(() => retainedWordCount.value ?? briefData.value?.contentLengthRecommendation ?? null)

  function setRetainedWordCount(words: number | null) {
    retainedWordCount.value = words
  }

  async function fetchBrief(id: number) {
    fetchController?.abort()
    fetchController = new AbortController()
    const signal = fetchController.signal
    currentId.value = id

    log.info(`Fetching brief for article ${id}`)
    isLoading.value = true
    error.value = null
    try {
      // 1. Fetch article details
      const { article, cocoonName } = await apiGet<{ article: Article; cocoonName: string }>(`/articles/${id}`, { signal })
      if (id !== currentId.value) return // id changed during fetch

      const articleWithCocoon = { ...article, cocoonName }

      // 2. Fetch keywords for the cocoon (non-blocking: empty array on failure)
      let keywords: Keyword[] = []
      try {
        keywords = await apiGet<Keyword[]>(`/keywords/${encodeURIComponent(cocoonName)}`, { signal })
      } catch (err) {
        if ((err as Error).name === 'AbortError') throw err
        // Keywords unavailable — continue with empty list
      }
      if (id !== currentId.value) return

      // 3. Données SERP du mot-clé de l'article (non bloquant ; aucune sans mot-clé)
      const articleKeyword = keywordOfArticle(article)
      let dataForSeo: DataForSeoCacheEntry | null = null
      if (articleKeyword) {
        try {
          const result = await apiPost<DataForSeoCacheEntry & { fromCache?: boolean }>('/dataforseo/brief', { keyword: articleKeyword }, { signal })
          dataForSeoFromCache.value = result.fromCache ?? null
          dataForSeo = result
        } catch (err) {
          if ((err as Error).name === 'AbortError') throw err
          // DataForSEO unavailable — continue without
        }
      }
      if (id !== currentId.value) return

      // 4. Calculate content length recommendation
      // On affiche d'abord l'heuristique synchrone (pas de flicker), puis on remplace
      // par la recommandation IA dès qu'elle arrive. Si l'endpoint IA échoue, on
      // garde l'heuristique.
      const heuristicRecommendation = calculateContentLength(article.type)
      briefData.value = { article: articleWithCocoon, keywords, dataForSeo, contentLengthRecommendation: heuristicRecommendation }

      // Longueur choisie pour l'article : lue sans bloquer l'écran.
      retainedWordCount.value = null
      void Promise.resolve()
        .then(() => apiGet<{ targetWordCount?: number | null } | null>(`/articles/${id}/micro-context`))
        .then((micro) => {
          if (id === currentId.value) retainedWordCount.value = micro?.targetWordCount ?? null
        })
        .catch((err: Error) => log.warn(`[brief.store] micro-contexte illisible — ${err.message}`))

      // Appel IA non-bloquant — met à jour briefData quand la réponse arrive
      void fetchContentLengthRecommendation(id, article.type).then(aiReco => {
        if (id !== currentId.value) return
        if (briefData.value && aiReco !== briefData.value.contentLengthRecommendation) {
          briefData.value = { ...briefData.value, contentLengthRecommendation: aiReco }
        }
      })
      log.info(`Brief loaded for article ${id}`, { keywords: keywords.length, hasDataForSeo: !!dataForSeo })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      log.error(`Brief fetch failed for article ${id} — ${(err as Error).message}`)
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      if (id === currentId.value) {
        isLoading.value = false
      }
    }
  }

  async function refreshDataForSeo() {
    if (!briefData.value || !serpKeyword.value) return

    isRefreshing.value = true
    try {
      const result = await apiPost<DataForSeoCacheEntry & { fromCache?: boolean }>('/dataforseo/brief', {
        keyword: serpKeyword.value,
        forceRefresh: true,
      })
      dataForSeoFromCache.value = result.fromCache ?? false
      briefData.value = { ...briefData.value, dataForSeo: result }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
    } finally {
      isRefreshing.value = false
    }
  }

  return {
    briefData, isLoading, error, isRefreshing, serpKeyword, dataForSeoFromCache, targetWordCount,
    fetchBrief, refreshDataForSeo, setRetainedWordCount,
  }
})
