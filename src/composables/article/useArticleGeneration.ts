import { computed, type Ref, type ComputedRef } from 'vue'
import { log } from '@/utils/logger'
import type { useEditorStore } from '@/stores/article/editor.store'
import type { useBriefStore } from '@/stores/strategy/brief.store'
import type { useOutlineStore } from '@/stores/article/outline.store'
import type { useArticleKeywordsStore } from '@/stores/article/article-keywords.store'

/**
 * Vague 4 — Composable extrait de ArticleWorkflowView et ArticleEditorView.
 *
 * Référence FR PRD : FR-RED-* (génération article + meta + reduce + humanize).
 *
 * Encapsule la logique partagée entre les deux vues Rédaction :
 *  - `wordCountTarget` (depuis `briefStore.briefData.contentLengthRecommendation`)
 *  - `canReduce` (delta > 15 % du target)
 *  - `wordCountDeltaDisplay`
 *  - `currentKeyword` / `allKeywords` (lecture stores)
 *  - `handleGenerateArticle` : génère l'article + meta + save
 *  - `handleReduce` / `handleHumanize` / abort handlers
 *
 * Dépendances explicites en paramètres → testable en isolation.
 *
 * NOTE : `articleId` est une `Ref<number | null>` car il vient du parent qui
 * le résout depuis route.params (peut être null si invalide).
 */
export interface ArticleGenerationDeps {
  articleId: Ref<number | null>
  editorStore: ReturnType<typeof useEditorStore>
  briefStore: ReturnType<typeof useBriefStore>
  outlineStore: ReturnType<typeof useOutlineStore>
  articleKeywordsStore: ReturnType<typeof useArticleKeywordsStore>
}

export interface ArticleGenerationApi {
  /** Cible mots depuis briefStore.briefData.contentLengthRecommendation. */
  wordCountTarget: ComputedRef<number | null>
  /** True si delta > 15 % du target (article trop long). */
  canReduce: ComputedRef<boolean>
  /** Delta affiché (signé) ; null si pas de target ou pas de contenu. */
  wordCountDeltaDisplay: ComputedRef<number | null>
  /** Keyword Capitaine ou fallback sur articleTitle. */
  currentKeyword: ComputedRef<string>
  /** Tous les keywords du brief. */
  allKeywords: ComputedRef<string[]>

  /**
   * Lance la génération article + meta + save (séquentiel, avec save
   * intermédiaire après l'article pour ne pas perdre le contenu si meta plante).
   */
  handleGenerateArticle: () => Promise<void>
  /** Lance reduce + save (no-op si pas de target). */
  handleReduce: () => Promise<void>
  /** Lance humanize + save. */
  handleHumanize: () => Promise<void>
  handleAbortReduce: () => void
  handleAbortHumanize: () => void
}

export function useArticleGeneration(deps: ArticleGenerationDeps): ArticleGenerationApi {
  const { articleId, editorStore, briefStore, outlineStore, articleKeywordsStore } = deps

  const wordCountTarget = computed(() => briefStore.briefData?.contentLengthRecommendation ?? null)

  const canReduce = computed(() => {
    if (!wordCountTarget.value || !editorStore.content) return false
    const delta = editorStore.wordCountDelta(wordCountTarget.value)
    if (delta === null) return false
    const pct = (delta / wordCountTarget.value) * 100
    return pct > 15
  })

  const wordCountDeltaDisplay = computed(() => editorStore.wordCountDelta(wordCountTarget.value))

  const currentKeyword = computed(() =>
    articleKeywordsStore.keywords?.capitaine ?? briefStore.briefData?.article.title ?? '',
  )

  const allKeywords = computed(() =>
    briefStore.briefData?.keywords.map(kw => kw.keyword) ?? [],
  )

  async function handleGenerateArticle(): Promise<void> {
    if (!articleId.value) return
    const id = articleId.value
    log.info('[useArticleGeneration] Starting article generation', {
      articleId: id,
      briefKeywords: briefStore.briefData?.keywords.length,
      outlineSections: outlineStore.outline?.sections.length,
    })

    if (!briefStore.briefData || !outlineStore.outline) {
      log.warn('[useArticleGeneration] Missing brief or outline, abort generation')
      return
    }

    await editorStore.generateArticle(briefStore.briefData, outlineStore.outline, wordCountTarget.value ?? undefined)

    if (editorStore.content && !editorStore.error) {
      // Save article content immediately — don't lose it if meta generation fails
      log.info('[useArticleGeneration] Article done, saving content before meta', {
        articleId: id,
        contentLength: editorStore.content.length,
      })
      await editorStore.saveArticle(id)

      const pilierKeyword = briefStore.briefData.keywords.find(kw => kw.type === 'Pilier')
      const keyword = pilierKeyword?.keyword ?? briefStore.briefData.article.title
      log.info('[useArticleGeneration] Generating meta', { articleId: id, keyword })
      await editorStore.generateMeta(id, keyword, briefStore.briefData.article.title, editorStore.content)

      if (!editorStore.error) {
        log.info('[useArticleGeneration] Meta done, saving with meta', {
          articleId: id,
          metaTitle: editorStore.metaTitle,
        })
        await editorStore.saveArticle(id)
      } else {
        log.warn('[useArticleGeneration] Meta generation failed — article content was already saved', {
          error: editorStore.error,
        })
      }
    } else {
      log.warn('[useArticleGeneration] Article generation failed or no content', {
        hasContent: !!editorStore.content,
        error: editorStore.error,
      })
    }
  }

  async function handleReduce(): Promise<void> {
    if (!articleId.value || !wordCountTarget.value) return
    await editorStore.reduceArticle(articleId.value, wordCountTarget.value, currentKeyword.value, allKeywords.value)
    if (editorStore.content && !editorStore.error) {
      await editorStore.saveArticle(articleId.value)
    }
  }

  async function handleHumanize(): Promise<void> {
    if (!articleId.value) return
    await editorStore.humanizeArticle(articleId.value, currentKeyword.value, allKeywords.value)
    if (editorStore.content && !editorStore.error) {
      await editorStore.saveArticle(articleId.value)
    }
  }

  function handleAbortReduce(): void {
    editorStore.abortReduce()
  }

  function handleAbortHumanize(): void {
    editorStore.abortHumanize()
  }

  return {
    wordCountTarget,
    canReduce,
    wordCountDeltaDisplay,
    currentKeyword,
    allKeywords,
    handleGenerateArticle,
    handleReduce,
    handleHumanize,
    handleAbortReduce,
    handleAbortHumanize,
  }
}
