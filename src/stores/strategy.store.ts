import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGet, apiPut, apiPost } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { ArticleStrategy, StrategySuggestRequest, StrategySuggestResponse, StrategyDeepenRequest, StrategyDeepenResponse, StrategyConsolidateRequest, StrategyConsolidateResponse, StrategyEnrichRequest, StrategyEnrichResponse } from '@shared/types/index.js'

export const useStrategyStore = defineStore('strategy', () => {
  const strategy = ref<ArticleStrategy | null>(null)
  const isLoading = ref(false)
  const isSuggesting = ref(false)
  const isDeepening = ref(false)
  const error = ref<string | null>(null)
  const currentStep = ref(0) // 0-5 for the 6 steps

  const steps = ['cible', 'douleur', 'aiguillage', 'angle', 'promesse', 'cta'] as const

  const currentStepName = computed(() => steps[currentStep.value] as typeof steps[number])
  const isComplete = computed(() => (strategy.value?.completedSteps ?? 0) >= 6)

  async function fetchStrategy(slug: string) {
    isLoading.value = true
    error.value = null
    try {
      const data = await apiGet<ArticleStrategy | null>(`/strategy/${slug}`)
      strategy.value = data
      if (data) {
        currentStep.value = Math.min(data.completedSteps, 5)
        log.debug(`[strategy] loaded for ${slug} (step=${currentStep.value})`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue'
      log.error(`[strategy] fetchStrategy failed`, { slug, error: error.value })
    } finally {
      isLoading.value = false
    }
  }

  async function saveStrategy(slug: string) {
    if (!strategy.value) return
    try {
      const saved = await apiPut<ArticleStrategy>(`/strategy/${slug}`, strategy.value)
      strategy.value = saved
      log.debug(`[strategy] saved for ${slug}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de sauvegarde'
      log.error(`[strategy] saveStrategy failed`, { slug, error: error.value })
    }
  }

  async function requestSuggestion(slug: string, request: StrategySuggestRequest) {
    log.info(`[strategy] requesting suggestion for ${slug}`, { step: request.step })
    isSuggesting.value = true
    error.value = null
    try {
      const result = await apiPost<StrategySuggestResponse>(`/strategy/${slug}/suggest`, request)
      log.debug(`[strategy] suggestion received (${result.suggestion.length} chars)`)
      return result.suggestion
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de suggestion'
      log.error(`[strategy] requestSuggestion failed`, { slug, error: error.value })
      return null
    } finally {
      isSuggesting.value = false
    }
  }

  async function requestDeepen(slug: string, request: StrategyDeepenRequest): Promise<StrategyDeepenResponse | null> {
    isDeepening.value = true
    error.value = null
    try {
      const result = await apiPost<StrategyDeepenResponse>(`/strategy/${slug}/deepen`, request)
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur d'approfondissement"
      return null
    } finally {
      isDeepening.value = false
    }
  }

  async function requestConsolidate(slug: string, request: StrategyConsolidateRequest): Promise<string | null> {
    isSuggesting.value = true
    error.value = null
    try {
      const result = await apiPost<StrategyConsolidateResponse>(`/strategy/${slug}/consolidate`, request)
      return result.consolidated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur de consolidation'
      return null
    } finally {
      isSuggesting.value = false
    }
  }

  async function requestEnrich(slug: string, request: StrategyEnrichRequest): Promise<string | null> {
    isSuggesting.value = true
    error.value = null
    try {
      const result = await apiPost<StrategyEnrichResponse>(`/strategy/${slug}/enrich`, request)
      return result.enriched
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Erreur d'enrichissement"
      return null
    } finally {
      isSuggesting.value = false
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

  function nextStep(slug: string) {
    if (currentStep.value < 5) {
      currentStep.value++
      log.debug(`[strategy] → step ${currentStep.value} (${steps[currentStep.value]})`)
    }
    if (strategy.value && currentStep.value >= (strategy.value.completedSteps ?? 0)) {
      strategy.value.completedSteps = currentStep.value
    }
    saveStrategy(slug)
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

  function initEmpty(slug: string) {
    const emptyStep = { input: '', suggestion: null, validated: '' }
    strategy.value = {
      slug,
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
    isDeepening.value = false
    error.value = null
    currentStep.value = 0
  }

  return {
    strategy, isLoading, isSuggesting, isDeepening, error, currentStep, steps, currentStepName, isComplete,
    fetchStrategy, saveStrategy, requestSuggestion, requestDeepen, requestConsolidate, requestEnrich, getPreviousAnswers, nextStep, prevStep, goToStep, initEmpty, $reset,
  }
})
