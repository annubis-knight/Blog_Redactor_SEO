import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { ProposedArticle } from '../../../shared/types/strategy.types'

// --- Mocks ---
const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { themeId: '1' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../../../src/stores/cocoons.store', () => ({
  useCocoonsStore: () => ({
    cocoons: [],
    isLoading: false,
    error: null,
    fetchCocoons: vi.fn(),
  }),
}))

vi.mock('../../../src/stores/silos.store', () => ({
  useSilosStore: () => ({
    silos: [],
    theme: null,
    isLoading: false,
    error: null,
    fetchSilos: vi.fn(),
  }),
}))

vi.mock('../../../src/stores/theme-config.store', () => ({
  useThemeConfigStore: () => ({
    config: {
      avatar: { sector: '', companySize: '', location: '', budget: '', digitalMaturity: '' },
      positioning: { targetAudience: '', mainPromise: '', differentiators: [], painPoints: [] },
      offerings: { services: [], mainCTA: '', ctaTarget: '' },
      toneOfVoice: { style: '', vocabulary: [] },
    },
    isLoading: false,
    error: null,
    fetchConfig: vi.fn(),
  }),
}))

vi.mock('../../../src/composables/useCompositionCheck', () => ({
  checkKeywordComposition: vi.fn(() => ({ allPass: true, warningCount: 0, results: [] })),
}))

vi.mock('../../../src/composables/useCapitaineValidation', () => ({
  articleTypeToLevel: vi.fn((type: string) => {
    const map: Record<string, string> = { Pilier: 'N2', Intermédiaire: 'N3', Spécialisé: 'N4' }
    return map[type] ?? 'N4'
  }),
}))

import BrainPhase from '../../../src/components/production/BrainPhase.vue'
import { useCocoonStrategyStore } from '../../../src/stores/cocoon-strategy.store'

const proposedArticleRowStub = {
  name: 'ProposedArticleRow',
  template: '<div class="proposed-article-row-stub" />',
  props: ['article', 'index', 'compositionResult', 'groupColor', 'structuralWarnings'],
  emits: ['regenerate-title', 'regenerate-keyword', 'select-keyword', 'select-title', 'toggle-accept', 'remove'],
}

const strategyStepStub = {
  name: 'StrategyStep',
  template: '<div class="strategy-step-stub" />',
  props: ['title', 'description', 'stepData', 'isSuggesting', 'isDeepening', 'suggestingSubId'],
  emits: ['update:stepData', 'request-suggestion', 'request-merge', 'request-deepen', 'request-sub-suggestion', 'request-sub-merge', 'delete-sub-question', 'request-enrich'],
}

function makeEmptyStrategy() {
  const emptyStep = { input: '', suggestion: null, validated: '', subQuestions: [] }
  return {
    cocoonSlug: 'test-cocon',
    cible: { ...emptyStep },
    douleur: { ...emptyStep },
    angle: { ...emptyStep },
    promesse: { ...emptyStep },
    cta: { ...emptyStep },
    proposedArticles: [] as ProposedArticle[],
    completedSteps: 6,
    updatedAt: new Date().toISOString(),
  }
}

// Phase 1 JSON response (Pilier + 2 Intermédiaires)
const PHASE1_JSON = JSON.stringify([
  { title: 'Pilier SEO Toulouse', type: 'Pilier', parentTitle: null, suggestedKeyword: 'seo entreprises Toulouse', painPoint: 'Visibilité', rationale: 'Fondation' },
  { title: 'Inter Technique', type: 'Intermédiaire', parentTitle: 'Pilier SEO Toulouse', suggestedKeyword: 'audit technique site', painPoint: 'Performance', rationale: 'Technique' },
  { title: 'Inter Contenu', type: 'Intermédiaire', parentTitle: 'Pilier SEO Toulouse', suggestedKeyword: 'stratégie contenu site', painPoint: 'Contenu', rationale: 'Rédaction' },
])

// Phase 2 JSON response (PAA queries per Inter)
const PHASE2_JSON = JSON.stringify([
  { interTitle: 'Inter Technique', searchQueries: ['audit seo technique', 'vitesse site web'] },
  { interTitle: 'Inter Contenu', searchQueries: ['stratégie contenu blog'] },
])

// Phase 3 JSON response (Spécialisés)
const PHASE3_JSON = JSON.stringify([
  { title: 'Spé Tech 1', type: 'Spécialisé', parentTitle: 'Inter Technique', suggestedKeyword: 'comment optimiser vitesse site professionnel', painPoint: 'Lenteur', rationale: 'Perf' },
  { title: 'Spé Tech 2', type: 'Spécialisé', parentTitle: 'Inter Technique', suggestedKeyword: 'pourquoi mon site est lent mobile', painPoint: 'Mobile', rationale: 'Responsive' },
  { title: 'Spé Contenu 1', type: 'Spécialisé', parentTitle: 'Inter Contenu', suggestedKeyword: 'comment rédiger article blog efficace entreprise', painPoint: 'Rédaction', rationale: 'Blog' },
  { title: 'Spé Contenu 2', type: 'Spécialisé', parentTitle: 'Inter Contenu', suggestedKeyword: 'quelle fréquence publier articles blog entreprise', painPoint: 'Rythme', rationale: 'Planning' },
])

// Mock PAA batch result
const MOCK_PAA_BATCH: Record<string, Array<{ question: string; answer: string | null }>> = {
  'audit seo technique': [{ question: 'Comment faire un audit SEO ?', answer: 'Un audit...' }],
  'vitesse site web': [{ question: 'Comment accélérer son site ?', answer: null }],
  'stratégie contenu blog': [{ question: 'Quelle stratégie de contenu ?', answer: 'Il faut...' }],
}

/**
 * Set up apiPost mock to handle both strategy suggest and PAA batch endpoints.
 * suggestResponses: ordered list of suggestion strings (or Error) for /suggest calls
 * paaBatchResponses: ordered list of responses for /paa/batch calls
 */
function setupApiPostMock(
  suggestResponses: (string | Error)[],
  paaBatchResponses: (Record<string, any> | Error)[] = [{}],
) {
  let suggestIdx = 0
  let paaIdx = 0

  mockApiPost.mockImplementation((path: string) => {
    if (path.includes('/suggest')) {
      const resp = suggestResponses[suggestIdx++]
      if (resp instanceof Error) return Promise.reject(resp)
      return Promise.resolve({ suggestion: resp })
    }
    if (path === '/paa/batch') {
      const resp = paaBatchResponses[paaIdx++] ?? {}
      if (resp instanceof Error) return Promise.reject(resp)
      return Promise.resolve(resp)
    }
    return Promise.resolve({})
  })
}

function mountBrainPhase() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const store = useCocoonStrategyStore()
  const strat = makeEmptyStrategy()
  store.strategy = strat as any
  store.currentStep = 5

  mockApiGet.mockResolvedValue(strat)

  return {
    wrapper: mount(BrainPhase, {
      props: { cocoonName: 'Test Cocon', siloName: 'Test Silo', cocoonId: 1 },
      global: {
        plugins: [pinia],
        stubs: {
          ProposedArticleRow: proposedArticleRowStub,
          StrategyStep: strategyStepStub,
          ProgressBar: { template: '<div />', props: ['percent', 'color'] },
          ContextRecap: { template: '<div />', props: ['themeName', 'themeDescription', 'siloName', 'siloDescription', 'cocoonName', 'cocoonArticles', 'previousAnswers', 'themeConfig'] },
        },
      },
    }),
    store,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BrainPhase — PAA cascade 3 phases', () => {
  it('calls 3 phases in sequence: structure → paa-queries → spe', async () => {
    setupApiPostMock(
      [PHASE1_JSON, PHASE2_JSON, PHASE3_JSON],
      [{}, MOCK_PAA_BATCH],
    )

    const { wrapper } = mountBrainPhase()
    const btn = wrapper.find('.btn-generate')
    await btn.trigger('click')
    await flushPromises()

    // Filter only suggest calls
    const suggestCalls = mockApiPost.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('/suggest'),
    )
    expect(suggestCalls.length).toBe(3)

    // Check step values
    expect(suggestCalls[0][1].step).toBe('articles-structure')
    expect(suggestCalls[1][1].step).toBe('articles-paa-queries')
    expect(suggestCalls[2][1].step).toBe('articles-spe')
  })

  it('fetches PAA via /paa/batch with queries from Phase 2', async () => {
    setupApiPostMock(
      [PHASE1_JSON, PHASE2_JSON, PHASE3_JSON],
      [{}, MOCK_PAA_BATCH],
    )

    const { wrapper } = mountBrainPhase()
    const btn = wrapper.find('.btn-generate')
    await btn.trigger('click')
    await flushPromises()

    const paaCalls = mockApiPost.mock.calls.filter(
      (c: any[]) => c[0] === '/paa/batch',
    )
    expect(paaCalls.length).toBe(2) // cocoon + per-Inter

    // Second PAA call should have queries from Phase 2
    const perInterCall = paaCalls[1]
    expect(perInterCall[1].queries).toEqual(
      expect.arrayContaining(['audit seo technique', 'vitesse site web', 'stratégie contenu blog']),
    )
  })

  it('passes paaContext to Phase 3 context', async () => {
    setupApiPostMock(
      [PHASE1_JSON, PHASE2_JSON, PHASE3_JSON],
      [{}, MOCK_PAA_BATCH],
    )

    const { wrapper } = mountBrainPhase()
    const btn = wrapper.find('.btn-generate')
    await btn.trigger('click')
    await flushPromises()

    const suggestCalls = mockApiPost.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('/suggest'),
    )
    // Phase 3 call
    const phase3Body = suggestCalls[2][1]
    expect(phase3Body.context.paaContext).toBeDefined()
    expect(phase3Body.context.paaContext['Inter Technique']).toBeDefined()
    expect(phase3Body.context.paaContext['Inter Technique'].length).toBeGreaterThan(0)
  })

  it('merges Phase 1 + Phase 3 articles into proposedArticles', async () => {
    setupApiPostMock(
      [PHASE1_JSON, PHASE2_JSON, PHASE3_JSON],
      [{}, MOCK_PAA_BATCH],
    )

    const { wrapper, store } = mountBrainPhase()
    const btn = wrapper.find('.btn-generate')
    await btn.trigger('click')
    await flushPromises()

    const articles = store.strategy!.proposedArticles
    expect(articles.length).toBe(7) // 1 Pilier + 2 Inter + 4 Spé

    const types = articles.map(a => a.type)
    expect(types.filter(t => t === 'Pilier').length).toBe(1)
    expect(types.filter(t => t === 'Intermédiaire').length).toBe(2)
    expect(types.filter(t => t === 'Spécialisé').length).toBe(4)
  })

  it('falls back gracefully when PAA fetch returns 0 results', async () => {
    setupApiPostMock(
      [PHASE1_JSON, PHASE2_JSON, PHASE3_JSON],
      [{}, {}], // Both PAA batches return empty
    )

    const { wrapper } = mountBrainPhase()
    const btn = wrapper.find('.btn-generate')
    await btn.trigger('click')
    await flushPromises()

    // Phase 3 should still be called
    const suggestCalls = mockApiPost.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('/suggest'),
    )
    expect(suggestCalls.length).toBe(3)
    expect(suggestCalls[2][1].step).toBe('articles-spe')
  })

  it('falls back to cocoon PAA when Inter PAA are empty', async () => {
    const cocoonPaa = [{ question: 'Question cocon', answer: 'Réponse cocon' }]

    setupApiPostMock(
      [PHASE1_JSON, PHASE2_JSON, PHASE3_JSON],
      [{ 'Test Cocon': cocoonPaa }, {}], // cocoon PAA has results, per-Inter empty
    )

    const { wrapper } = mountBrainPhase()
    const btn = wrapper.find('.btn-generate')
    await btn.trigger('click')
    await flushPromises()

    // Phase 3 should have cocoon PAA injected for each Inter
    const suggestCalls = mockApiPost.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('/suggest'),
    )
    const phase3Body = suggestCalls[2][1]
    expect(phase3Body.context.paaContext['Inter Technique']).toEqual(cocoonPaa)
    expect(phase3Body.context.paaContext['Inter Contenu']).toEqual(cocoonPaa)
  })

  it('continues with Phase 1 articles when Phase 3 fails', async () => {
    setupApiPostMock(
      [PHASE1_JSON, PHASE2_JSON, new Error('Phase 3 failure')],
      [{}, MOCK_PAA_BATCH],
    )

    const { wrapper, store } = mountBrainPhase()
    const btn = wrapper.find('.btn-generate')
    await btn.trigger('click')
    await flushPromises()

    // Phase 1 articles should be preserved
    const articles = store.strategy!.proposedArticles
    expect(articles.length).toBe(3) // 1 Pilier + 2 Inter only
    expect(articles.every(a => a.type !== 'Spécialisé')).toBe(true)
  })

  it('shows stepper with correct phase during generation', async () => {
    // Use a deferred promise to freeze in Phase 1
    let resolvePhase1!: (v: { suggestion: string }) => void
    mockApiPost.mockImplementation((path: string) => {
      if (path.includes('/suggest')) {
        return new Promise(resolve => { resolvePhase1 = resolve })
      }
      return Promise.resolve({})
    })

    const { wrapper } = mountBrainPhase()
    const btn = wrapper.find('.btn-generate')
    await btn.trigger('click')
    await flushPromises()

    // Stepper should be visible
    const stepper = wrapper.find('[data-testid="generation-stepper"]')
    expect(stepper.exists()).toBe(true)

    // First step should be active
    const steps = stepper.findAll('.stepper-step')
    expect(steps[0].classes()).toContain('active')
    expect(steps[0].text()).toContain('Structure')

    // Resolve Phase 1
    resolvePhase1({ suggestion: PHASE1_JSON })
    await flushPromises()
  })

  it('shows error state when Phase 1 fails', async () => {
    setupApiPostMock(
      [new Error('Phase 1 failure')],
      [{}],
    )

    const { wrapper, store } = mountBrainPhase()
    const btn = wrapper.find('.btn-generate')
    await btn.trigger('click')
    await flushPromises()

    // No articles should be generated
    expect(store.strategy!.proposedArticles.length).toBe(0)
  })
})
