/**
 * AUTHORITY: PostgreSQL `cocoon_strategies.data.proposedArticles` (JSONB) — la carte
 *            indicative du cocon. Elle ne crée aucun article : la création passe par
 *            l'arbre réel (useCocoonBuilder, C7), qui y inscrit l'article créé.
 * READS FROM: useCocoonStrategyStore.strategy (hydraté par le Cerveau).
 * WRITES TO: saveStrategy (proposedArticles) ; PATCH /articles/:id (titre, intention
 *            d'un article déjà créé) ; DELETE /articles/:id (détache un article créé de
 *            son cocon ; refusé, 409 HAS_CHILDREN, s'il a encore des enfants : la carte le garde).
 * CONSUMERS: BrainArticleProposalView (grille des propositions), MoteurView
 *            (buildRecapArticles), useCocoonBuilder (inscription d'un article créé).
 * RELATED FR: FR-CER-COCOON-PROGRESSIVE (remplace FR-CER-BATCH-CREATE),
 *             FR-CER-TYPE-TOLERANT, FR-PIE-CERVEAU-OVERRIDE.
 */
import { ref, watch, type Ref } from 'vue'
import { useCocoonStrategyStore } from '@/stores/strategy/cocoon-strategy.store'
import { useCocoonsStore } from '@/stores/strategy/cocoons.store'
import type { CocoonSuggestRequest } from '@shared/types/index.js'
import type { PainIntentExpected } from '@shared/types/scoring.types.js'
import { apiDelete, apiPatch } from '@/services/api.service'
import { useNotify } from '@/composables/ui/useNotify'
import { log } from '@/utils/logger'

import type { ArticleLevel } from './article-proposals/types'
import {
  buildEmptyArticle,
  keywordToSlug,
  normalizeTitle,
} from './article-proposals/builders'
import { parseSingleArticle } from './article-proposals/parsers'
import { createRegenerationActions } from './article-proposals/regeneration'
import { createArticleComputeds } from './article-proposals/computeds'
import { createGenerationPipeline } from './article-proposals/generation'
import { createTopicsManager } from './article-proposals/topics'

/**
 * Hook principal du panneau "Articles" du Cerveau (étape 6).
 *
 * Responsabilités assemblées ici uniquement (les helpers vivent dans
 * `./article-proposals/`):
 *  - migration / hydratation des `proposedArticles` au chargement (watcher)
 *  - CRUD de la carte (ajout vide, ajout intelligent via IA, suppression)
 *  - synchronisation d'un article déjà créé via `apiPatch` / `apiDelete`
 *  - édition manuelle (titre, mot-clé, slug, parent)
 *  - sujets éditoriaux (suggestedTopics) + auto-generation à l'arrivée à l'étape
 *
 * La carte est indicative (C7) : on n'y « accepte » plus rien. Un article naît
 * de l'arbre réel du cocon (useCocoonBuilder), puis s'y inscrit.
 */
export function useArticleProposals(params: {
  cocoonSlug: Ref<string>
  cocoonName: Ref<string>
  getSuggestContext: () => CocoonSuggestRequest['context']
}) {
  const { cocoonSlug, cocoonName, getSuggestContext } = params
  const store = useCocoonStrategyStore()
  const cocoonsStore = useCocoonsStore()
  const notify = useNotify()

  const truncationWarning = ref<string | null>(null)
  const generationPhase = ref<'idle' | 'structure' | 'paa-queries' | 'paa-fetch' | 'specialises' | 'done' | 'error'>('idle')
  const generationWarning = ref<string | null>(null)
  const addingArticleLevel = ref<ArticleLevel | null>(null)

  // --- Migrate existing articles: derive slugs + assign IDs + backfill dbId ---
  watch(() => store.strategy?.proposedArticles, (articles) => {
    if (!articles) return
    let patched = false
    // Build title→id map from BDD for dbId backfill
    const cocoon = cocoonsStore.cocoons.find(c => c.name === cocoonName.value)
    const dbTitleToId = new Map<string, number>()
    if (cocoon) {
      for (const a of cocoon.articles) {
        dbTitleToId.set(a.title, a.id)
      }
    }
    for (const article of articles) {
      if (!article.id) {
        article.id = crypto.randomUUID()
        patched = true
      }
      if (!article.suggestedSlug && article.suggestedKeyword) {
        article.suggestedSlug = keywordToSlug(article.suggestedKeyword)
        if (!article.suggestedSlugs?.length) {
          article.suggestedSlugs = [article.suggestedSlug]
        }
        patched = true
      }
      // Backfill dbId for articles already in BDD but missing the field
      if (article.createdInDb && !article.dbId && article.title) {
        const found = dbTitleToId.get(article.title)
        if (found) {
          article.dbId = found
          patched = true
        }
      }
    }
    if (patched) {
      store.saveStrategy(cocoonSlug.value)
    }
  }, { immediate: true })

  // --- Article CRUD ---

  function addEmptyArticle(type: ArticleLevel) {
    if (!store.strategy) return
    store.strategy.proposedArticles.push(buildEmptyArticle(type))
  }

  async function addSmartArticle(type: ArticleLevel, userInput?: string) {
    if (!store.strategy) return
    addingArticleLevel.value = type

    try {
      const existingDetail = store.strategy.proposedArticles
        .filter(a => a.title)
        .map(a => ({
          title: a.title,
          type: a.type,
          parentTitle: a.parentTitle,
          suggestedKeyword: a.suggestedKeyword,
        }))

      const context = getSuggestContext()

      const payload: Record<string, string> = {
        articleType: type,
        existingArticlesDetail: JSON.stringify(existingDetail, null, 2),
      }
      if (userInput) payload.userInput = userInput

      const suggestion = await store.requestSuggestion(cocoonSlug.value, {
        step: 'add-article',
        currentInput: JSON.stringify(payload),
        context,
      })

      if (suggestion && store.strategy) {
        const article = parseSingleArticle(suggestion, type)
        if (article) {
          store.strategy.proposedArticles.push(article)
          store.saveStrategy(cocoonSlug.value)
          log.info('Smart article added', { type, title: article.title })
          return
        }
      }
      log.warn('Smart article suggestion empty, falling back to empty article', { type })
      addEmptyArticle(type)
    } catch (err) {
      log.error('addSmartArticle failed', { type, error: (err as Error).message })
      addEmptyArticle(type)
    } finally {
      addingArticleLevel.value = null
    }
  }

  async function removeProposedArticle(index: number) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return

    if (article.createdInDb && article.dbId) {
      try {
        await apiDelete(`/articles/${article.dbId}`)
        log.info('Article détaché du cocon', { articleId: article.dbId })
      } catch (err) {
        // Déjà absent de la base (404) : la carte suit. Tout autre refus (des
        // enfants y sont nés, serveur injoignable) : la carte garde l'article,
        // sinon il resterait en base sans plus apparaître ni ici ni au Moteur.
        if ((err as { status?: unknown }).status !== 404) {
          const cause = err instanceof Error && err.message ? err.message : 'le serveur n’a pas répondu'
          log.warn('Retrait refusé', { articleId: article.dbId, error: cause })
          notify.error(`« ${article.title} » n’a pas été retiré : ${cause}`)
          return
        }
        log.info('Article déjà absent de la base', { articleId: article.dbId })
      }
    }

    store.strategy.proposedArticles.splice(index, 1)
    store.saveStrategy(cocoonSlug.value)
    await cocoonsStore.fetchCocoons()
  }

  // --- Regeneration (factory) ---
  const regenerationActions = createRegenerationActions({
    store,
    cocoonSlug,
    cocoonName,
    getSuggestContext,
  })

  // --- Hierarchy (édition directe du store) ---

  function changeParent(index: number, parentTitle: string) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    store.strategy.proposedArticles[index] = { ...article, parentTitle }
    store.saveStrategy(cocoonSlug.value)
  }

  async function editTitle(index: number, value: string) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    store.strategy.proposedArticles[index] = { ...article, title: value }
    store.saveStrategy(cocoonSlug.value)
    if (article.createdInDb && article.dbId) {
      try {
        await apiPatch(`/articles/${article.dbId}`, { title: value })
        await cocoonsStore.fetchCocoons()
      } catch (err) {
        log.warn('Article title sync to DB failed', { articleId: article.dbId, error: (err as Error).message })
      }
    }
  }

  function editKeyword(index: number, value: string) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    store.strategy.proposedArticles[index] = { ...article, suggestedKeyword: value }
    store.saveStrategy(cocoonSlug.value)
  }

  function editSlug(index: number, value: string) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    store.strategy.proposedArticles[index] = { ...article, suggestedSlug: value }
    store.saveStrategy(cocoonSlug.value)
  }

  /**
   * FR-PIE-CERVEAU-OVERRIDE — l'utilisateur corrige l'intent éditorial généré
   * par l'IA. Mise à jour locale immédiate (pour réactivité UI) + persistance
   * via PATCH si l'article est déjà en DB. La sauvegarde de la stratégie
   * (saveStrategy) garantit la persistance même avant création DB.
   */
  async function updatePainIntent(index: number, value: PainIntentExpected | null) {
    if (!store.strategy) return
    const article = store.strategy.proposedArticles[index]
    if (!article) return
    store.strategy.proposedArticles[index] = { ...article, painIntentExpected: value }
    store.saveStrategy(cocoonSlug.value)
    // Si l'article est déjà persisté en DB, propager le changement immédiatement.
    if (article.createdInDb && article.dbId > 0) {
      try {
        await apiPatch(`/articles/${article.dbId}`, { painIntentExpected: value })
        log.debug('[useArticleProposals] painIntentExpected synchronisé en DB', { dbId: article.dbId, value })
      } catch (err) {
        log.warn('[useArticleProposals] échec sync painIntentExpected', { dbId: article.dbId, error: (err as Error).message })
      }
    }
  }

  // --- Computeds (factory) ---
  const computeds = createArticleComputeds(store)

  // --- Generation pipeline (factory) ---

  function getTopicEnrichedContext() {
    const context = getSuggestContext()
    if (store.strategy) {
      const checked = store.strategy.suggestedTopics
        ?.filter(t => t.checked)
        .map(t => t.topic) ?? []
      if (checked.length > 0) context.topicSuggestions = checked
      const userCtx = store.strategy.topicsUserContext?.trim()
      if (userCtx) context.topicUserContext = userCtx
    }
    return context
  }

  const { generateArticleProposals } = createGenerationPipeline({
    store,
    cocoonSlug,
    cocoonName,
    truncationWarning,
    generationWarning,
    generationPhase,
    getTopicEnrichedContext,
  })

  // --- Topic Suggestions (factory) ---
  const topics = createTopicsManager({ store, cocoonSlug, getSuggestContext })

  return {
    // Refs
    truncationWarning,
    generationPhase,
    generationWarning,
    addingArticleLevel,
    topicsLoading: topics.topicsLoading,
    topicsError: topics.topicsError,
    // Computeds
    articleColumns: computeds.articleColumns,
    articleWarnings: computeds.articleWarnings,
    globalWarnings: computeds.globalWarnings,
    groupColors: computeds.groupColors,
    groupedSpecArticles: computeds.groupedSpecArticles,
    compositionResults: computeds.compositionResults,
    intermediateTitles: computeds.intermediateTitles,
    // Helpers
    normalizeTitle,
    // Actions
    addEmptyArticle,
    addSmartArticle,
    removeProposedArticle,
    regenerateTitle: regenerationActions.regenerateTitle,
    selectTitle: regenerationActions.selectTitle,
    regenerateKeyword: regenerationActions.regenerateKeyword,
    selectKeyword: regenerationActions.selectKeyword,
    regenerateSlug: regenerationActions.regenerateSlug,
    selectSlug: regenerationActions.selectSlug,
    changeParent,
    editTitle,
    editKeyword,
    editSlug,
    updatePainIntent,
    generateArticleProposals,
    // Topic actions
    generateTopics: topics.generateTopics,
    toggleTopic: topics.toggleTopic,
    removeTopic: topics.removeTopic,
    addTopic: topics.addTopic,
    updateUserContext: topics.updateUserContext,
  }
}
