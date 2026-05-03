import { ref, watch, type Ref } from 'vue'
import type { CocoonSuggestRequest } from '@shared/types/index.js'
import type { useCocoonStrategyStore } from '@/stores/strategy/cocoon-strategy.store'
import { log } from '@/utils/logger'
import { generateTopicId } from './builders'
import { parseTopicsFromSuggestion } from './parsers'

/**
 * Factory : gère les "Suggested Topics" du cocon (sujets éditoriaux affichés
 * en étape 6 du Cerveau). Encapsule :
 *  - le state local (`topicsLoading`, `topicsError`)
 *  - la génération IA et le parsing
 *  - les CRUD (`toggleTopic`, `removeTopic`, `addTopic`)
 *  - le debounce de `updateUserContext`
 *  - l'auto-génération à l'arrivée à l'étape 5 (watcher sur `store.currentStep`)
 *
 * Toutes les écritures passent par `store.saveStrategy(cocoonSlug)` pour
 * persister via PostgreSQL (cf. CLAUDE.md §3.1).
 */
export function createTopicsManager(deps: {
  store: ReturnType<typeof useCocoonStrategyStore>
  cocoonSlug: Ref<string>
  getSuggestContext: () => CocoonSuggestRequest['context']
}) {
  const { store, cocoonSlug, getSuggestContext } = deps

  const topicsLoading = ref(false)
  const topicsError = ref<string | null>(null)

  let saveContextTimeout: ReturnType<typeof setTimeout> | null = null

  async function generateTopics() {
    if (topicsLoading.value || !store.strategy) return
    topicsLoading.value = true
    topicsError.value = null

    try {
      const context = getSuggestContext()
      // Guard: verify we have meaningful strategic content (F3 fix)
      const answers = context.previousAnswers ?? {}
      if (Object.keys(answers).length < 1) {
        topicsError.value = 'Complétez au moins les premières étapes stratégiques avant de générer les sujets.'
        return
      }

      const suggestion = await store.requestSuggestion(cocoonSlug.value, {
        step: 'articles-topics',
        currentInput: 'Propose les sujets du cocon.',
        context,
      })

      if (!suggestion || !store.strategy) {
        topicsError.value = 'Échec de la génération des sujets. Réessayez.'
        return
      }

      const topics = parseTopicsFromSuggestion(suggestion)
      if (topics.length === 0) {
        topicsError.value = 'Aucun sujet retourné. Réessayez.'
        return
      }

      store.strategy.suggestedTopics = topics.map(topic => ({
        id: generateTopicId(),
        topic,
        checked: true,
      }))
      store.saveStrategy(cocoonSlug.value)
    } catch (err) {
      log.error('Topic generation failed', { error: (err as Error).message })
      topicsError.value = 'Erreur lors de la génération des sujets.'
    } finally {
      topicsLoading.value = false
    }
  }

  function toggleTopic(index: number) {
    if (!store.strategy || index < 0 || index >= store.strategy.suggestedTopics.length) return
    store.strategy.suggestedTopics[index]!.checked = !store.strategy.suggestedTopics[index]!.checked
    store.saveStrategy(cocoonSlug.value)
  }

  function removeTopic(index: number) {
    if (!store.strategy || index < 0 || index >= store.strategy.suggestedTopics.length) return
    store.strategy.suggestedTopics.splice(index, 1)
    store.saveStrategy(cocoonSlug.value)
  }

  function addTopic(topic: string) {
    if (!store.strategy || !topic.trim()) return
    store.strategy.suggestedTopics.push({
      id: generateTopicId(),
      topic: topic.trim(),
      checked: true,
    })
    store.saveStrategy(cocoonSlug.value)
  }

  function updateUserContext(text: string) {
    if (!store.strategy) return
    store.strategy.topicsUserContext = text
    if (saveContextTimeout) clearTimeout(saveContextTimeout)
    saveContextTimeout = setTimeout(() => {
      store.saveStrategy(cocoonSlug.value)
    }, 500)
  }

  // Auto-generate topics when arriving at step 6 (Articles) for the first time
  watch(() => store.currentStep, (step) => {
    if (
      step === 5
      && store.strategy
      && (!store.strategy.suggestedTopics || store.strategy.suggestedTopics.length === 0)
      && !topicsLoading.value
    ) {
      generateTopics()
    }
  })

  return {
    topicsLoading,
    topicsError,
    generateTopics,
    toggleTopic,
    removeTopic,
    addTopic,
    updateUserContext,
  }
}
