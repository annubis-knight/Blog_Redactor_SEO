import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useStrategyStore } from '../../../src/stores/strategy.store'
import type { ArticleStrategy, StrategySuggestResponse } from '../../../shared/types/index.js'

// Mock the API service
vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiGet, apiPut, apiPost } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)
const mockApiPut = vi.mocked(apiPut)
const mockApiPost = vi.mocked(apiPost)

const mockStrategy: ArticleStrategy = {
  slug: 'test-article',
  cible: { input: 'PME dirigeants', suggestion: 'Cible suggestion', validated: 'PME dirigeants' },
  douleur: { input: 'Pas de visibilité', suggestion: null, validated: '' },
  aiguillage: { suggestedType: 'Intermédiaire', suggestedParent: 'article-pilier', suggestedChildren: [], validated: true },
  angle: { input: '', suggestion: null, validated: '' },
  promesse: { input: '', suggestion: null, validated: '' },
  cta: { type: 'service', target: '/services/seo', suggestion: null },
  completedSteps: 2,
  updatedAt: '2026-03-13T10:00:00.000Z',
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
  mockApiPut.mockReset()
  mockApiPost.mockReset()
})

describe('strategy.store — initial state', () => {
  it('has correct default values', () => {
    const store = useStrategyStore()

    expect(store.strategy).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.isSuggesting).toBe(false)
    expect(store.error).toBeNull()
    expect(store.currentStep).toBe(0)
  })
})

describe('strategy.store — fetchStrategy', () => {
  it('loads existing strategy from API and updates state', async () => {
    mockApiGet.mockResolvedValue(mockStrategy)
    const store = useStrategyStore()

    await store.fetchStrategy('test-article')

    expect(store.strategy).toEqual(mockStrategy)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(mockApiGet).toHaveBeenCalledWith('/strategy/test-article')
  })

  it('sets currentStep to completedSteps when loading existing strategy', async () => {
    mockApiGet.mockResolvedValue(mockStrategy) // completedSteps = 2
    const store = useStrategyStore()

    await store.fetchStrategy('test-article')

    expect(store.currentStep).toBe(2)
  })

  it('caps currentStep at 5 even when completedSteps is 6', async () => {
    const completeStrategy = { ...mockStrategy, completedSteps: 6 }
    mockApiGet.mockResolvedValue(completeStrategy)
    const store = useStrategyStore()

    await store.fetchStrategy('test-article')

    expect(store.currentStep).toBe(5)
  })

  it('stays null when API returns null (no existing strategy)', async () => {
    mockApiGet.mockResolvedValue(null)
    const store = useStrategyStore()

    await store.fetchStrategy('unknown-slug')

    expect(store.strategy).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('sets error on API failure', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'))
    const store = useStrategyStore()

    await store.fetchStrategy('test-article')

    expect(store.error).toBe('Network error')
    expect(store.strategy).toBeNull()
    expect(store.isLoading).toBe(false)
  })

  it('sets generic error message for non-Error throws', async () => {
    mockApiGet.mockRejectedValue('something went wrong')
    const store = useStrategyStore()

    await store.fetchStrategy('test-article')

    expect(store.error).toBe('Erreur inconnue')
  })

  it('sets isLoading true during fetch', async () => {
    let resolvePromise: (value: ArticleStrategy | null) => void
    mockApiGet.mockImplementation(() => new Promise((resolve) => { resolvePromise = resolve as any }))
    const store = useStrategyStore()

    const promise = store.fetchStrategy('test-article')
    expect(store.isLoading).toBe(true)

    resolvePromise!(mockStrategy)
    await promise

    expect(store.isLoading).toBe(false)
  })
})

describe('strategy.store — initEmpty', () => {
  it('creates an empty strategy with correct slug', () => {
    const store = useStrategyStore()

    store.initEmpty('new-article')

    expect(store.strategy).not.toBeNull()
    expect(store.strategy!.slug).toBe('new-article')
    expect(store.strategy!.completedSteps).toBe(0)
    expect(store.currentStep).toBe(0)
  })

  it('initializes all step data as empty', () => {
    const store = useStrategyStore()

    store.initEmpty('new-article')

    expect(store.strategy!.cible).toEqual({ input: '', suggestion: null, validated: '' })
    expect(store.strategy!.douleur).toEqual({ input: '', suggestion: null, validated: '' })
    expect(store.strategy!.angle).toEqual({ input: '', suggestion: null, validated: '' })
    expect(store.strategy!.promesse).toEqual({ input: '', suggestion: null, validated: '' })
    expect(store.strategy!.aiguillage).toEqual({ suggestedType: null, suggestedParent: null, suggestedChildren: [], validated: false })
    expect(store.strategy!.cta).toEqual({ type: 'service', target: '', suggestion: null })
  })

  it('sets updatedAt to a valid ISO date string', () => {
    const store = useStrategyStore()

    store.initEmpty('new-article')

    expect(store.strategy!.updatedAt).toBeTruthy()
    expect(new Date(store.strategy!.updatedAt).toISOString()).toBe(store.strategy!.updatedAt)
  })
})

describe('strategy.store — step navigation', () => {
  it('nextStep increments currentStep and saves', async () => {
    mockApiPut.mockResolvedValue(mockStrategy)
    const store = useStrategyStore()
    store.initEmpty('test-article')

    store.nextStep('test-article')

    expect(store.currentStep).toBe(1)
    expect(mockApiPut).toHaveBeenCalledWith('/strategy/test-article', store.strategy)
  })

  it('nextStep does not go beyond step 5', async () => {
    mockApiPut.mockResolvedValue(mockStrategy)
    const store = useStrategyStore()
    store.initEmpty('test-article')
    store.currentStep = 5

    store.nextStep('test-article')

    expect(store.currentStep).toBe(5)
  })

  it('nextStep updates completedSteps when advancing beyond it', async () => {
    mockApiPut.mockResolvedValue(mockStrategy)
    const store = useStrategyStore()
    store.initEmpty('test-article')
    expect(store.strategy!.completedSteps).toBe(0)

    store.nextStep('test-article')

    expect(store.strategy!.completedSteps).toBe(1)
  })

  it('prevStep decrements currentStep', () => {
    const store = useStrategyStore()
    store.initEmpty('test-article')
    store.currentStep = 3

    store.prevStep()

    expect(store.currentStep).toBe(2)
  })

  it('prevStep does not go below 0', () => {
    const store = useStrategyStore()
    store.initEmpty('test-article')
    store.currentStep = 0

    store.prevStep()

    expect(store.currentStep).toBe(0)
  })
})

describe('strategy.store — goToStep', () => {
  it('jumps to a valid step', () => {
    const store = useStrategyStore()

    store.goToStep(4)

    expect(store.currentStep).toBe(4)
  })

  it('does not go below 0', () => {
    const store = useStrategyStore()
    store.currentStep = 3

    store.goToStep(-1)

    expect(store.currentStep).toBe(3)
  })

  it('does not go above 5', () => {
    const store = useStrategyStore()
    store.currentStep = 3

    store.goToStep(6)

    expect(store.currentStep).toBe(3)
  })

  it('accepts boundary values 0 and 5', () => {
    const store = useStrategyStore()

    store.goToStep(0)
    expect(store.currentStep).toBe(0)

    store.goToStep(5)
    expect(store.currentStep).toBe(5)
  })
})

describe('strategy.store — requestSuggestion', () => {
  it('returns suggestion on success', async () => {
    const mockResponse: StrategySuggestResponse = { suggestion: 'Voici une suggestion' }
    mockApiPost.mockResolvedValue(mockResponse)
    const store = useStrategyStore()

    const result = await store.requestSuggestion('test-article', {
      step: 'cible',
      currentInput: 'PME dirigeants',
      context: { articleTitle: 'Test', cocoonName: 'Cocon A', siloName: 'Silo 1' },
    })

    expect(result).toBe('Voici une suggestion')
    expect(store.isSuggesting).toBe(false)
    expect(store.error).toBeNull()
    expect(mockApiPost).toHaveBeenCalledWith('/strategy/test-article/suggest', {
      step: 'cible',
      currentInput: 'PME dirigeants',
      context: { articleTitle: 'Test', cocoonName: 'Cocon A', siloName: 'Silo 1' },
    })
  })

  it('sets isSuggesting true during request', async () => {
    let resolvePromise: (value: StrategySuggestResponse) => void
    mockApiPost.mockImplementation(() => new Promise((resolve) => { resolvePromise = resolve as any }))
    const store = useStrategyStore()

    const promise = store.requestSuggestion('test-article', {
      step: 'cible',
      currentInput: 'test',
      context: { articleTitle: 'Test', cocoonName: 'Cocon A', siloName: 'Silo 1' },
    })
    expect(store.isSuggesting).toBe(true)

    resolvePromise!({ suggestion: 'ok' })
    await promise

    expect(store.isSuggesting).toBe(false)
  })

  it('sets error and returns null on failure', async () => {
    mockApiPost.mockRejectedValue(new Error('API unavailable'))
    const store = useStrategyStore()

    const result = await store.requestSuggestion('test-article', {
      step: 'douleur',
      currentInput: 'test',
      context: { articleTitle: 'Test', cocoonName: 'Cocon A', siloName: 'Silo 1' },
    })

    expect(result).toBeNull()
    expect(store.error).toBe('API unavailable')
    expect(store.isSuggesting).toBe(false)
  })

  it('sets generic error message for non-Error throws', async () => {
    mockApiPost.mockRejectedValue('unknown error')
    const store = useStrategyStore()

    const result = await store.requestSuggestion('test-article', {
      step: 'angle',
      currentInput: 'test',
      context: { articleTitle: 'Test', cocoonName: 'Cocon A', siloName: 'Silo 1' },
    })

    expect(result).toBeNull()
    expect(store.error).toBe('Erreur de suggestion')
  })
})

describe('strategy.store — saveStrategy', () => {
  it('saves strategy via apiPut', async () => {
    const savedStrategy = { ...mockStrategy, updatedAt: '2026-03-13T12:00:00.000Z' }
    mockApiPut.mockResolvedValue(savedStrategy)
    const store = useStrategyStore()
    store.strategy = { ...mockStrategy }
    const strategyBeforeSave = { ...store.strategy }

    await store.saveStrategy('test-article')

    expect(mockApiPut).toHaveBeenCalledWith('/strategy/test-article', strategyBeforeSave)
    // After save, strategy is updated with the server response
    expect(store.strategy).toEqual(savedStrategy)
  })

  it('does nothing when strategy is null', async () => {
    const store = useStrategyStore()

    await store.saveStrategy('test-article')

    expect(mockApiPut).not.toHaveBeenCalled()
  })

  it('sets error on save failure', async () => {
    mockApiPut.mockRejectedValue(new Error('Save failed'))
    const store = useStrategyStore()
    store.strategy = { ...mockStrategy }

    await store.saveStrategy('test-article')

    expect(store.error).toBe('Save failed')
  })
})

describe('strategy.store — computed properties', () => {
  it('currentStepName returns the correct step name', () => {
    const store = useStrategyStore()

    expect(store.currentStepName).toBe('cible')

    store.currentStep = 2
    expect(store.currentStepName).toBe('aiguillage')

    store.currentStep = 5
    expect(store.currentStepName).toBe('cta')
  })

  it('isComplete is true when completedSteps >= 6', () => {
    const store = useStrategyStore()

    expect(store.isComplete).toBe(false)

    store.strategy = { ...mockStrategy, completedSteps: 6 }
    expect(store.isComplete).toBe(true)
  })

  it('isComplete is false when completedSteps < 6', () => {
    const store = useStrategyStore()

    store.strategy = { ...mockStrategy, completedSteps: 5 }
    expect(store.isComplete).toBe(false)
  })

  it('isComplete is false when strategy is null', () => {
    const store = useStrategyStore()
    expect(store.isComplete).toBe(false)
  })
})

describe('strategy.store — $reset', () => {
  it('resets all state to defaults', async () => {
    mockApiGet.mockResolvedValue(mockStrategy)
    const store = useStrategyStore()
    await store.fetchStrategy('test-article')

    store.$reset()

    expect(store.strategy).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.isSuggesting).toBe(false)
    expect(store.error).toBeNull()
    expect(store.currentStep).toBe(0)
  })
})
