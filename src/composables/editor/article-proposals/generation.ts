import type { Ref } from 'vue'
import type { CocoonSuggestRequest, ProposedArticle } from '@shared/types/index.js'
import type { useCocoonStrategyStore } from '@/stores/strategy/cocoon-strategy.store'
import { apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import { extractPaaQueries, parseArticlesFromSuggestion } from './parsers'

type GenerationPhase = 'idle' | 'structure' | 'paa-queries' | 'paa-fetch' | 'specialises' | 'done' | 'error'

/**
 * Factory : crée la pipeline en 3 phases qui génère les articles proposés.
 *  1. Structure (Pilier + Intermédiaires) — appel IA puis parsing
 *  2. PAA queries — extrait les questions à fetch puis appelle `/paa/batch`
 *  3. Spécialisés enrichis — appel IA avec contexte PAA
 *
 * Renvoie aussi les `Ref` d'état (phase, warnings) afin que le composable
 * principal puisse les exposer dans son retour public.
 */
export function createGenerationPipeline(deps: {
  store: ReturnType<typeof useCocoonStrategyStore>
  cocoonSlug: Ref<string>
  cocoonName: Ref<string>
  truncationWarning: Ref<string | null>
  generationWarning: Ref<string | null>
  generationPhase: Ref<GenerationPhase>
  getTopicEnrichedContext: () => CocoonSuggestRequest['context']
}) {
  const {
    store,
    cocoonSlug,
    cocoonName,
    truncationWarning,
    generationWarning,
    generationPhase,
    getTopicEnrichedContext,
  } = deps

  async function generateArticleProposals() {
    truncationWarning.value = null
    generationWarning.value = null
    generationPhase.value = 'structure'
    log.info('Article generation started', { cocoon: cocoonSlug.value })
    const context = getTopicEnrichedContext()

    let pilierAndInterArticles: ProposedArticle[] = []

    try {
      type PaaMap = Record<string, Array<{ question: string; answer: string | null }>>
      const cocoonPaaPromise = apiPost<PaaMap>('/paa/batch', {
        queries: [cocoonName.value],
      }).catch(() => ({} as PaaMap))

      const structureSuggestion = await store.requestSuggestion(cocoonSlug.value, {
        step: 'articles-structure',
        currentInput: 'Génère le Pilier et les Intermédiaires.',
        context,
      })

      if (!structureSuggestion || !store.strategy) {
        generationPhase.value = 'error'
        return
      }

      pilierAndInterArticles = parseArticlesFromSuggestion(structureSuggestion)
      if (pilierAndInterArticles.length === 0) {
        log.error('Structure generation returned no articles')
        generationPhase.value = 'error'
        return
      }

      log.info('Structure generated', { count: pilierAndInterArticles.length })
      store.strategy.proposedArticles = pilierAndInterArticles

      // === Phase 2: PAA queries ===
      generationPhase.value = 'paa-queries'

      const paaContext: Record<string, Array<{ question: string; answer: string | null }>> = {}

      try {
        const paaQueriesSuggestion = await store.requestSuggestion(cocoonSlug.value, {
          step: 'articles-paa-queries',
          currentInput: JSON.stringify(pilierAndInterArticles.map(a => ({ title: a.title, type: a.type, parentTitle: a.parentTitle }))),
          context,
        })

        if (paaQueriesSuggestion) {
          const paaQueryItems = extractPaaQueries(paaQueriesSuggestion)
          const allQueries = paaQueryItems.flatMap(item => item.searchQueries)

          if (allQueries.length > 0) {
            generationPhase.value = 'paa-fetch'
            const paaData = await apiPost<PaaMap>('/paa/batch', {
              queries: allQueries,
            }).catch(() => ({} as PaaMap))

            for (const item of paaQueryItems) {
              const questions: Array<{ question: string; answer: string | null }> = []
              const seen = new Set<string>()
              for (const query of item.searchQueries) {
                if (paaData[query]) {
                  for (const q of paaData[query]) {
                    if (!seen.has(q.question)) {
                      seen.add(q.question)
                      questions.push(q)
                    }
                  }
                }
              }
              paaContext[item.interTitle] = questions
            }
          }
        }

        const allEmpty = Object.values(paaContext).every(arr => arr.length === 0)
        if (allEmpty) {
          const cocoonPaaResult = await cocoonPaaPromise
          const cocoonPaa = cocoonPaaResult[cocoonName.value] ?? []
          if (cocoonPaa.length > 0) {
            const inters = pilierAndInterArticles.filter(a => a.type === 'Intermédiaire')
            for (const inter of inters) {
              paaContext[inter.title] = cocoonPaa
            }
          }
        }
      } catch (err) {
        log.warn('PAA phase failed, continuing without PAA', { error: (err as Error).message })
      }

      // === Phase 3: Spécialisés enrichis ===
      generationPhase.value = 'specialises'

      try {
        const speSuggestion = await store.requestSuggestion(cocoonSlug.value, {
          step: 'articles-spe',
          currentInput: JSON.stringify(pilierAndInterArticles.map(a => ({ title: a.title, type: a.type, parentTitle: a.parentTitle }))),
          context: { ...context, paaContext },
        })

        if (speSuggestion) {
          const titleOccurrences = (speSuggestion.match(/"title"\s*:/g) || []).length
          const speArticles = parseArticlesFromSuggestion(speSuggestion)

          if (speArticles.length > 0) {
            log.info('Spécialisés generated', { count: speArticles.length })
            store.strategy.proposedArticles = [...pilierAndInterArticles, ...speArticles]
            const lost = titleOccurrences - speArticles.length
            if (lost > 0) {
              truncationWarning.value = `${lost} article${lost > 1 ? 's' : ''} Spécialisé${lost > 1 ? 's' : ''} tronqué${lost > 1 ? 's' : ''} — seuls les articles complets sont affichés.`
            }
          } else {
            generationWarning.value = 'Spécialisés non générés — seuls le Pilier et les Intermédiaires sont affichés.'
          }
        } else {
          generationWarning.value = 'Spécialisés non générés — seuls le Pilier et les Intermédiaires sont affichés.'
        }
      } catch {
        generationWarning.value = 'Spécialisés non générés — seuls le Pilier et les Intermédiaires sont affichés.'
      }

      generationPhase.value = 'done'
      log.info('Article generation complete', { total: store.strategy?.proposedArticles.length })
    } catch (err) {
      log.error('Article generation failed', { error: (err as Error).message })
      generationPhase.value = 'error'
    }
  }

  return { generateArticleProposals }
}
