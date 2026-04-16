import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPut, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ArticleStrategy, StrategySuggestRequest, StrategySuggestResponse, StrategyDeepenRequest, StrategyDeepenResponse, StrategyConsolidateRequest, StrategyConsolidateResponse, StrategyEnrichRequest, StrategyEnrichResponse } from '@shared/types/index.js'

export const useStrategyStore = defineStore('strategy', () => {
  const strategy = ref<ArticleStrategy | null>(null)
  const isLoading = ref(false)
  const isSuggesting = ref(false)
  const isConsolidating = ref(false)
  const isEnriching = ref(false)
  const isDeepening = ref(false)
  const error = ref<string | null>(null)

  const isProcessing = computed(() => isSuggesting.value || isConsolidating.value || isEnriching.value || isDeepening.value)
  const currentStep = ref(0) // 0-5 for the 6 steps

  const steps = ['cible', 'douleur', 'aiguillage', 'angle', 'promesse', 'cta'] as const

  const currentStepName = computed(() => steps[currentStep.value] as typeof steps[number])
  const isComplete = computed(() => (strategy.value?.completedSteps ?? 0) >= 6)

  async function fetchStrategy(id: number) {
    isLoading.value = true
    error.value = null
    try {
      const data = await apiGet<ArticleStrategy | null>(`/strategy/${id}`)
      strategy.value = data
      if (data) {
        currentStep.value = Math.min(data.completedSteps, 5)
        log.debug(`[strategy] loaded for ${id} (step=${currentStep.value})`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error(`[strategy] fetchStrategy failed`, { id, error: error.value })
    } finally {
      isLoading.value = false
    }
  }

  async function saveStrategy(id: number) {
    if (!strategy.value) return
    try {
      const saved = await apiPut<ArticleStrategy>(`/strategy/${id}`, strategy.value)
      strategy.value = saved
      log.debug(`[strategy] saved for ${id}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de sauvegarde'
      log.error(`[strategy] saveStrategy failed`, { id, error: error.value })
    }
  }

  async function requestSuggestion(id: number, request: StrategySuggestRequest) {
    log.info(`[strategy] requesting suggestion for ${id}`, { step: request.step })
    isSuggesting.value = true
    error.value = null
    try {
      const result = await apiPost<StrategySuggestResponse>(`/strategy/${id}/suggest`, request)
      log.debug(`[strategy] suggestion received (${result.suggestion.length} chars)`)
      return result.suggestion
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de suggestion'
      log.error(`[strategy] requestSuggestion failed`, { id, error: error.value })
      return null
    } finally {
      isSuggesting.value = false
    }
  }

  async function requestDeepen(id: number, request: StrategyDeepenRequest): Promise<StrategyDeepenResponse | null> {
    isDeepening.value = true
    error.value = null
    try {
      const result = await apiPost<StrategyDeepenResponse>(`/strategy/${id}/deepen`, request)
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur d'approfondissement"
      return null
    } finally {
      isDeepening.value = false
    }
  }

  async function requestConsolidate(id: number, request: StrategyConsolidateRequest): Promise<string | null> {
    isConsolidating.value = true
    error.value = null
    try {
      const result = await apiPost<StrategyConsolidateResponse>(`/strategy/${id}/consolidate`, request)
      return result.consolidated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de consolidation'
      return null
    } finally {
      isConsolidating.value = false
    }
  }

  async function requestEnrich(id: number, request: StrategyEnrichRequest): Promise<string | null> {
    isEnriching.value = true
    error.value = null
    try {
      const result = await apiPost<StrategyEnrichResponse>(`/strategy/${id}/enrich`, request)
      return result.enriched
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur d'enrichissement"
      return null
    } finally {
      isEnriching.value = false
    }
  }

  /** Build previousAnswers from validated steps (for cascading context) */
  function getPreviousAnswers(): Record<string, string> {
    if (!strategy.value) return {}
    const answers: Record<string, string> = {}
    for (const step of ['cible', 'douleur', 'angle', 'promesse'] as const) {
      const data = strategy.value[step]
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
    if (strategy.value.aiguillage.validated) {
      answers['aiguillage'] = `Type: ${strategy.value.aiguillage.suggestedType ?? '-'}`
    }
    if (strategy.value.cta.target) {
      answers['cta'] = `${strategy.value.cta.type}: ${strategy.value.cta.target}`
    }
    return answers
  }

  function nextStep(id: number) {
    if (currentStep.value < 5) {
      currentStep.value++
      log.debug(`[strategy] → step ${currentStep.value} (${steps[currentStep.value]})`)
    }
    if (strategy.value && currentStep.value >= (strategy.value.completedSteps ?? 0)) {
      strategy.value.completedSteps = currentStep.value
    }
    saveStrategy(id)
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

  function initEmpty(id: number) {
    const emptyStep = { input: '', suggestion: null, validated: '' }
    strategy.value = {
      id,
      cible: { ...emptyStep },
      douleur: { ...emptyStep },
      aiguillage: { suggestedType: null, suggestedParent: null, suggestedChildren: [], validated: false },
      angle: { ...emptyStep },
      promesse: { ...emptyStep },
      cta: { type: 'service' as const, target: '', suggestion: null },
      completedSteps: 0,
      updatedAt: new Date().toISOString(),
    }
    currentStep.value = 0
  }

  function $reset() {
    strategy.value = null
    isLoading.value = false
    isSuggesting.value = false
    isConsolidating.value = false
    isEnriching.value = false
    isDeepening.value = false
    error.value = null
    currentStep.value = 0
  }

  return {
    strategy, isLoading, isSuggesting, isConsolidating, isEnriching, isDeepening, isProcessing, error, currentStep, steps, currentStepName, isComplete,
    fetchStrategy, saveStrategy, requestSuggestion, requestDeepen, requestConsolidate, requestEnrich, getPreviousAnswers, nextStep, prevStep, goToStep, initEmpty, $reset,
  }
})
