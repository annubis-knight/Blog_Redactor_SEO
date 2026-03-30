import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPut, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { CocoonStrategy, CocoonSuggestRequest, StrategyStepData, StrategyDeepenRequest, StrategyDeepenResponse, StrategyConsolidateRequest, StrategyConsolidateResponse, StrategyEnrichRequest, StrategyEnrichResponse, StrategyContextData } from '@shared/types/index.js'

export const useCocoonStrategyStore = defineStore('cocoonStrategy', () => {
  const strategy = ref<CocoonStrategy | null>(null)
  const strategicContext = ref<StrategyContextData | null>(null)
  const isLoading = ref(false)
  const isSuggesting = ref(false)
  const isDeepening = ref(false)
  const error = ref<string | null>(null)
  const currentStep = ref(0) // 0-5 for the 6 steps

  const steps = ['cible', 'douleur', 'angle', 'promesse', 'cta', 'articles'] as const

  const currentStepName = computed(() => steps[currentStep.value] as typeof steps[number])
  const isComplete = computed(() => (strategy.value?.completedSteps ?? 0) >= 6)

  async function fetchContext(cocoonId: number): Promise<void> {
    try {
      strategicContext.value = await apiGet<StrategyContextData | null>(`/cocoons/${cocoonId}/strategy/context`)
    } catch (err) {
      log.error('[cocoon-strategy] fetchContext failed', { cocoonId, error: (err as Error).message })
      strategicContext.value = null
    }
  }

  async function fetchStrategy(cocoonSlug: string) {
    isLoading.value = true
    error.value = null
    try {
      const data = await apiGet<CocoonStrategy | null>(`/strategy/cocoon/${cocoonSlug}`)
      strategy.value = data
      if (data) {
        currentStep.value = Math.min(data.completedSteps, 5)
        log.debug(`[cocoon-strategy] loaded for ${cocoonSlug} (step=${currentStep.value})`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error(`[cocoon-strategy] fetchStrategy failed`, { cocoonSlug, error: error.value })
    } finally {
      isLoading.value = false
    }
  }

  async function saveStrategy(cocoonSlug: string) {
    if (!strategy.value) return
    try {
      const saved = await apiPut<CocoonStrategy>(`/strategy/cocoon/${cocoonSlug}`, strategy.value)
      strategy.value = saved
      log.debug(`[cocoon-strategy] saved for ${cocoonSlug}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de sauvegarde'
      log.error(`[cocoon-strategy] saveStrategy failed`, { cocoonSlug, error: error.value })
    }
  }

  async function requestSuggestion(cocoonSlug: string, request: CocoonSuggestRequest) {
    log.info(`[cocoon-strategy] requesting suggestion for ${cocoonSlug}`, { step: request.step })
    isSuggesting.value = true
    error.value = null
    try {
      const result = await apiPost<{ suggestion: string }>(`/strategy/cocoon/${cocoonSlug}/suggest`, request)
      log.debug(`[cocoon-strategy] suggestion received (${result.suggestion.length} chars)`)
      return result.suggestion
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de suggestion'
      log.error(`[cocoon-strategy] requestSuggestion failed`, { cocoonSlug, error: error.value })
      return null
    } finally {
      isSuggesting.value = false
    }
  }

  async function requestDeepen(cocoonSlug: string, request: StrategyDeepenRequest): Promise<StrategyDeepenResponse | null> {
    isDeepening.value = true
    error.value = null
    try {
      const result = await apiPost<StrategyDeepenResponse>(`/strategy/cocoon/${cocoonSlug}/deepen`, request)
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur d'approfondissement"
      return null
    } finally {
      isDeepening.value = false
    }
  }

  async function requestConsolidate(cocoonSlug: string, request: StrategyConsolidateRequest): Promise<string | null> {
    isSuggesting.value = true
    error.value = null
    try {
      const result = await apiPost<StrategyConsolidateResponse>(`/strategy/cocoon/${cocoonSlug}/consolidate`, request)
      return result.consolidated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de consolidation'
      return null
    } finally {
      isSuggesting.value = false
    }
  }

  async function requestEnrich(cocoonSlug: string, request: StrategyEnrichRequest): Promise<string | null> {
    isSuggesting.value = true
    error.value = null
    try {
      const result = await apiPost<StrategyEnrichResponse>(`/strategy/cocoon/${cocoonSlug}/enrich`, request)
      return result.enriched
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur d'enrichissement"
      return null
    } finally {
      isSuggesting.value = false
    }
  }

  /** Build previousAnswers from validated steps */
  function getPreviousAnswers(): Record<string, string> {
    if (!strategy.value) return {}
    const answers: Record<string, string> = {}
    for (const step of ['cible', 'douleur', 'angle', 'promesse', 'cta'] as const) {
      const data = strategy.value[step] as StrategyStepData
      if (data.validated) {
        let answer = data.validated
        if (data.subQuestions?.length) {
          const subAnswers = data.subQuestions
            .filter(sq => sq.validated)
            .map(sq => `[${sq.question}] ${sq.validated}`)
            .join(' | ')
          if (subAnswers) answer += ` — Détails: ${subAnswers}`
        }
        answers[step] = answer
      }
    }
    return answers
  }

  function nextStep(cocoonSlug: string) {
    if (currentStep.value < 5) {
      currentStep.value++
      log.debug(`[cocoon-strategy] → step ${currentStep.value} (${steps[currentStep.value]})`)
    }
    if (strategy.value && currentStep.value >= (strategy.value.completedSteps ?? 0)) {
      strategy.value.completedSteps = currentStep.value
    }
    saveStrategy(cocoonSlug)
  }

  function prevStep() {
    if (currentStep.value > 0) {
      currentStep.value--
    }
  }

  function goToStep(step: number) {
    if (step >= 0 && step <= 5) {
      currentStep.value = step
    }
  }

  function initEmpty(cocoonSlug: string) {
    const emptyStep: StrategyStepData = { input: '', suggestion: null, validated: '' }
    strategy.value = {
      cocoonSlug,
      cible: { ...emptyStep },
      douleur: { ...emptyStep },
      angle: { ...emptyStep },
      promesse: { ...emptyStep },
      cta: { ...emptyStep },
      proposedArticles: [],
      completedSteps: 0,
      updatedAt: new Date().toISOString(),
    }
    currentStep.value = 0
  }

  function $reset() {
    strategy.value = null
    strategicContext.value = null
    isLoading.value = false
    isSuggesting.value = false
    isDeepening.value = false
    error.value = null
    currentStep.value = 0
  }

  return {
    strategy, strategicContext, isLoading, isSuggesting, isDeepening, error, currentStep, steps, currentStepName, isComplete,
    fetchContext, fetchStrategy, saveStrategy, requestSuggestion, requestDeepen, requestConsolidate, requestEnrich, getPreviousAnswers,
    nextStep, prevStep, goToStep, initEmpty, $reset,
  }
})
