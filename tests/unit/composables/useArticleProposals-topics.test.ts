import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useCocoonStrategyStore } from '../../../src/stores/cocoon-strategy.store'

// --- Mocks ---
vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('../../../src/stores/cocoons.store', () => ({
  useCocoonsStore: () => ({
    cocoons: [],
    fetchCocoons: vi.fn(),
  }),
}))

vi.mock('../../../src/composables/seo/useCompositionCheck', () => ({
  checkKeywordComposition: vi.fn(() => ({ allPass: true, warningCount: 0, results: [] })),
}))

vi.mock('../../../src/composables/keyword/useCapitaineValidation', () => ({
  articleTypeToLevel: vi.fn(() => 'N3'),
}))

import { useArticleProposals } from '../../../src/composables/editor/useArticleProposals'

function setupComposable() {
  const store = useCocoonStrategyStore()
  store.strategy = {
    cocoonSlug: 'test-cocon',
    cible: { input: '', suggestion: null, validated: 'La cible' },
    douleur: { input: '', suggestion: null, validated: 'La douleur' },
    angle: { input: '', suggestion: null, validated: 'Angle unique' },
    promesse: { input: '', suggestion: null, validated: 'Promesse forte' },
    cta: { input: '', suggestion: null, validated: 'CTA clair' },
    proposedArticles: [],
    suggestedTopics: [],
    topicsUserContext: '',
    completedSteps: 5,
    updatedAt: new Date().toISOString(),
  }
  store.currentStep = 0

  const composable = useArticleProposals({
    cocoonSlug: ref('test-cocon'),
    cocoonName: ref('Test Cocon'),
    getSuggestContext: () => ({
      cocoonName: 'Test Cocon',
      siloName: 'Test Silo',
      previousAnswers: { cible: 'La cible', douleur: 'La douleur' },
    }),
  })

  return { store, composable }
}

describe('useArticleProposals — topics', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('generateTopics parses JSON array of strings into SuggestedTopic[]', async () => {
    const { store, composable } = setupComposable()
    store.requestSuggestion = vi.fn().mockResolvedValue('["SEO locale", "Content marketing", "Netlinking"]')
    store.saveStrategy = vi.fn()

    await composable.generateTopics()

    expect(store.strategy!.suggestedTopics).toHaveLength(3)
    expect(store.strategy!.suggestedTopics[0].topic).toBe('SEO locale')
    expect(store.strategy!.suggestedTopics[0].checked).toBe(true)
    expect(store.strategy!.suggestedTopics[0].id).toBeTruthy()
    expect(store.strategy!.suggestedTopics[1].topic).toBe('Content marketing')
    expect(store.strategy!.suggestedTopics[2].topic).toBe('Netlinking')
    expect(store.saveStrategy).toHaveBeenCalledWith('test-cocon')
  })

  it('generateTopics handles code-fenced JSON response', async () => {
    const { store, composable } = setupComposable()
    store.requestSuggestion = vi.fn().mockResolvedValue('```json\n["Sujet A", "Sujet B"]\n```')
    store.saveStrategy = vi.fn()

    await composable.generateTopics()

    expect(store.strategy!.suggestedTopics).toHaveLength(2)
    expect(store.strategy!.suggestedTopics[0].topic).toBe('Sujet A')
  })

  it('generateTopics sets error when requestSuggestion returns null', async () => {
    const { store, composable } = setupComposable()
    store.requestSuggestion = vi.fn().mockResolvedValue(null)

    await composable.generateTopics()

    expect(composable.topicsError.value).toBeTruthy()
    expect(store.strategy!.suggestedTopics).toHaveLength(0)
  })

  it('generateTopics sets error when JSON parsing returns empty array', async () => {
    const { store, composable } = setupComposable()
    store.requestSuggestion = vi.fn().mockResolvedValue('Not valid JSON at all')

    await composable.generateTopics()

    expect(composable.topicsError.value).toBeTruthy()
  })

  it('generateTopics guards against empty previousAnswers (F3 fix)', async () => {
    const { store, composable: _ } = setupComposable()
    // Create a new composable with empty context
    const composable2 = useArticleProposals({
      cocoonSlug: ref('test-cocon'),
      cocoonName: ref('Test Cocon'),
      getSuggestContext: () => ({
        cocoonName: 'Test Cocon',
        siloName: 'Test Silo',
        previousAnswers: {},
      }),
    })
    store.requestSuggestion = vi.fn()

    await composable2.generateTopics()

    expect(composable2.topicsError.value).toContain('Complétez')
    expect(store.requestSuggestion).not.toHaveBeenCalled()
  })

  it('toggleTopic inverts checked state', () => {
    const { store, composable } = setupComposable()
    store.strategy!.suggestedTopics = [
      { id: '1', topic: 'SEO', checked: true },
      { id: '2', topic: 'Content', checked: false },
    ]
    store.saveStrategy = vi.fn()

    composable.toggleTopic(0)
    expect(store.strategy!.suggestedTopics[0].checked).toBe(false)

    composable.toggleTopic(1)
    expect(store.strategy!.suggestedTopics[1].checked).toBe(true)

    expect(store.saveStrategy).toHaveBeenCalledTimes(2)
  })

  it('removeTopic removes the correct element', () => {
    const { store, composable } = setupComposable()
    store.strategy!.suggestedTopics = [
      { id: '1', topic: 'A', checked: true },
      { id: '2', topic: 'B', checked: true },
      { id: '3', topic: 'C', checked: true },
    ]
    store.saveStrategy = vi.fn()

    composable.removeTopic(1)
    expect(store.strategy!.suggestedTopics).toHaveLength(2)
    expect(store.strategy!.suggestedTopics.map(t => t.topic)).toEqual(['A', 'C'])
  })

  it('addTopic adds a new checked topic', () => {
    const { store, composable } = setupComposable()
    store.strategy!.suggestedTopics = []
    store.saveStrategy = vi.fn()

    composable.addTopic('Nouveau sujet')
    expect(store.strategy!.suggestedTopics).toHaveLength(1)
    expect(store.strategy!.suggestedTopics[0].topic).toBe('Nouveau sujet')
    expect(store.strategy!.suggestedTopics[0].checked).toBe(true)
    expect(store.strategy!.suggestedTopics[0].id).toBeTruthy()
  })

  it('addTopic ignores empty string (F13 fix)', () => {
    const { store, composable } = setupComposable()
    store.strategy!.suggestedTopics = []
    store.saveStrategy = vi.fn()

    composable.addTopic('')
    composable.addTopic('   ')
    expect(store.strategy!.suggestedTopics).toHaveLength(0)
    expect(store.saveStrategy).not.toHaveBeenCalled()
  })

  it('watcher auto-generates topics when arriving at step 5 with empty topics', async () => {
    const { store, composable } = setupComposable()
    store.requestSuggestion = vi.fn().mockResolvedValue('["Auto sujet"]')
    store.saveStrategy = vi.fn()

    // Trigger watcher by changing to step 5
    store.currentStep = 5
    await nextTick()
    // Wait for async generateTopics to complete
    await vi.waitFor(() => {
      expect(store.requestSuggestion).toHaveBeenCalled()
    })
  })

  it('watcher does NOT auto-generate when topics already exist', async () => {
    const { store, composable } = setupComposable()
    store.strategy!.suggestedTopics = [{ id: '1', topic: 'Existing', checked: true }]
    store.requestSuggestion = vi.fn()

    store.currentStep = 5
    await nextTick()
    // Give async a chance to run
    await new Promise(r => setTimeout(r, 50))

    expect(store.requestSuggestion).not.toHaveBeenCalled()
  })

  it('removeTopic ignores invalid index', () => {
    const { store, composable } = setupComposable()
    store.strategy!.suggestedTopics = [{ id: '1', topic: 'A', checked: true }]
    store.saveStrategy = vi.fn()

    composable.removeTopic(-1)
    composable.removeTopic(5)
    expect(store.strategy!.suggestedTopics).toHaveLength(1)
    expect(store.saveStrategy).not.toHaveBeenCalled()
  })
})
