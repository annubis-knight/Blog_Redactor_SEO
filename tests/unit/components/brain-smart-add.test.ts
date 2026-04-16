import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { ProposedArticle } from '../../../shared/types/strategy.types'

// --- Mocks ---
const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
const mockApiPut = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
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

vi.mock('../../../src/composables/seo/useCompositionCheck', () => ({
  checkKeywordComposition: vi.fn(() => ({ allPass: true, warningCount: 0, results: [] })),
}))

vi.mock('../../../src/composables/keyword/useCapitaineValidation', () => ({
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
  props: ['article', 'index', 'compositionResult', 'groupColor', 'structuralWarnings', 'availableParents'],
  emits: ['regenerate-title', 'regenerate-keyword', 'regenerate-slug', 'select-keyword', 'select-title', 'select-slug', 'toggle-accept', 'remove', 'change-parent'],
}

const addArticleMenuStub = {
  name: 'AddArticleMenu',
  template: `<div class="add-article-wrapper">
    <button class="add-article-placeholder" :class="{ 'is-loading': isLoading }" :disabled="disabled">
      {{ isLoading ? 'Génération...' : label }}
    </button>
  </div>`,
  props: ['isLoading', 'disabled', 'label'],
  emits: ['add-empty', 'add-smart', 'add-guided'],
}

const strategyStepStub = {
  name: 'StrategyStep',
  template: '<div class="strategy-step-stub" />',
  props: ['title', 'description', 'stepData', 'isSuggesting', 'isDeepening', 'suggestingSubId'],
  emits: ['update:stepData', 'request-suggestion', 'request-merge', 'request-deepen', 'request-sub-suggestion', 'request-sub-merge', 'delete-sub-question', 'request-enrich'],
}

function makeStrategy(articles: ProposedArticle[] = []) {
  const emptyStep = { input: '', suggestion: null, validated: '', subQuestions: [] }
  return {
    cocoonSlug: 'test-cocon',
    cible: { ...emptyStep },
    douleur: { ...emptyStep },
    angle: { ...emptyStep },
    promesse: { ...emptyStep },
    cta: { ...emptyStep },
    proposedArticles: articles,
    completedSteps: 6,
    updatedAt: new Date().toISOString(),
  }
}

const EXISTING_PILIER: ProposedArticle = {
  title: 'Pilier SEO Toulouse',
  suggestedTitles: ['Pilier SEO Toulouse'],
  type: 'Pilier',
  parentTitle: null,
  rationale: 'Fondation du cocon',
  painPoint: 'Visibilité',
  suggestedKeyword: 'seo entreprises Toulouse',
  suggestedKeywords: ['seo entreprises Toulouse'],
  suggestedSlug: '',
  suggestedSlugs: [],
  validatedSearchQuery: null,
  keywordValidated: false,
  searchQueryValidated: false,
  titleValidated: false,
  accepted: false,
  createdInDb: false,
}

const EXISTING_INTER: ProposedArticle = {
  title: 'Inter Technique',
  suggestedTitles: ['Inter Technique'],
  type: 'Intermédiaire',
  parentTitle: 'Pilier SEO Toulouse',
  rationale: 'Aspect technique',
  painPoint: 'Performance',
  suggestedKeyword: 'audit technique site',
  suggestedKeywords: ['audit technique site'],
  suggestedSlug: '',
  suggestedSlugs: [],
  validatedSearchQuery: null,
  keywordValidated: false,
  searchQueryValidated: false,
  titleValidated: false,
  accepted: false,
  createdInDb: false,
}

const SMART_INTER_RESPONSE = JSON.stringify({
  title: 'Inter Contenu éditorial',
  type: 'Intermédiaire',
  parentTitle: 'Pilier SEO Toulouse',
  suggestedKeyword: 'stratégie contenu site professionnel',
  painPoint: 'Pas de stratégie de contenu',
  rationale: 'Facette non couverte : le contenu éditorial',
})

const SMART_SPE_RESPONSE = JSON.stringify({
  title: 'Comment rédiger un article optimisé pour Google ?',
  type: 'Spécialisé',
  parentTitle: 'Inter Technique',
  suggestedKeyword: 'comment rédiger article optimisé google entreprise',
  painPoint: 'Ne sait pas rédiger pour le SEO',
  rationale: 'Angle non couvert sous Inter Technique',
})

function mountBrainPhase(articles: ProposedArticle[] = [EXISTING_PILIER, EXISTING_INTER]) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const store = useCocoonStrategyStore()
  const strat = makeStrategy(articles)
  store.strategy = strat as any
  store.currentStep = 5

  mockApiGet.mockResolvedValue(strat)
  // saveStrategy does strategy.value = await apiPut(...), so must return the strategy
  mockApiPut.mockImplementation(() => Promise.resolve(strat))

  return {
    wrapper: mount(BrainPhase, {
      props: { cocoonName: 'Test Cocon', siloName: 'Test Silo', cocoonId: 1 },
      global: {
        plugins: [pinia],
        stubs: {
          ProposedArticleRow: proposedArticleRowStub,
          AddArticleMenu: addArticleMenuStub,
          ArticleColumn: { template: '<div class="article-column"><slot /></div>', props: ['label', 'headerClass', 'tooltip', 'count', 'peek'] },
          GenerationStepper: { template: '<div />', props: ['phase'] },
          StrategyStep: strategyStepStub,
          ProgressBar: { template: '<div />', props: ['percent', 'color'] },
          ContextRecap: { template: '<div />', props: ['themeName', 'themeDescription', 'siloName', 'siloDescription', 'cocoonName', 'cocoonArticles', 'previousAnswers', 'themeConfig'] },
        },
      },
    }),
    store,
  }
}

/** Find AddArticleMenu by column label and emit an action */
function findMenu(wrapper: ReturnType<typeof mount>, columnLabel: string) {
  const menus = wrapper.findAllComponents({ name: 'AddArticleMenu' })
  const menu = menus.find(c => {
    const label = (c.props('label') as string) || ''
    return label.toLowerCase().includes(columnLabel.toLowerCase())
  })
  if (!menu) throw new Error(`No AddArticleMenu found for column "${columnLabel}"`)
  return menu
}

async function emitMenuAction(wrapper: ReturnType<typeof mount>, columnLabel: string, action: 'add-empty' | 'add-smart' | 'add-guided', userInput?: string) {
  const menu = findMenu(wrapper, columnLabel)
  if (action === 'add-guided' && userInput) {
    menu.vm.$emit('add-guided', userInput)
  } else {
    menu.vm.$emit(action)
  }
  await flushPromises()
}

describe('BrainPhase — Smart add article', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('dropdown menu', () => {
    it('renders 3 AddArticleMenu components (pilier, inter, spé)', () => {
      const { wrapper } = mountBrainPhase()
      const menus = wrapper.findAllComponents({ name: 'AddArticleMenu' })
      expect(menus.length).toBe(3)

      const labels = menus.map(m => m.props('label') as string)
      expect(labels.some(l => l.toLowerCase().includes('pilier'))).toBe(true)
      expect(labels.some(l => l.toLowerCase().includes('intermédiaire'))).toBe(true)
      expect(labels.some(l => l.toLowerCase().includes('spécialisé'))).toBe(true)
    })

    it('passes correct props to AddArticleMenu', () => {
      const { wrapper } = mountBrainPhase()
      const menu = findMenu(wrapper, 'intermédiaire')
      expect(menu.props('isLoading')).toBe(false)
      expect(menu.props('disabled')).toBe(false)
    })

    it('"Article vide" adds an empty article and closes menu', async () => {
      const { wrapper, store } = mountBrainPhase()
      const initialCount = store.strategy!.proposedArticles.length

      await emitMenuAction(wrapper, 'intermédiaire', 'add-empty')
      await wrapper.vm.$nextTick()

      expect(store.strategy!.proposedArticles).toHaveLength(initialCount + 1)
      const added = store.strategy!.proposedArticles[initialCount]
      expect(added.title).toBe('')
      expect(added.type).toBe('Intermédiaire')
    })
  })

  describe('article complémentaire via menu', () => {
    it('sends step add-article with articleType and existing articles', async () => {
      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return Promise.resolve({ suggestion: SMART_INTER_RESPONSE })
        }
        return Promise.resolve({})
      })

      const { wrapper } = mountBrainPhase()
      await emitMenuAction(wrapper, 'intermédiaire', 'add-smart')

      const suggestCall = mockApiPost.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('/suggest'),
      )
      expect(suggestCall).toBeTruthy()

      const body = suggestCall![1]
      expect(body.step).toBe('add-article')

      const input = JSON.parse(body.currentInput)
      expect(input.articleType).toBe('Intermédiaire')
      expect(input.userInput).toBeUndefined()

      const detail = JSON.parse(input.existingArticlesDetail)
      expect(detail).toHaveLength(2)
    })

    it('adds a fully populated Intermédiaire from Claude response', async () => {
      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return Promise.resolve({ suggestion: SMART_INTER_RESPONSE })
        }
        return Promise.resolve({})
      })

      const { wrapper, store } = mountBrainPhase()
      const initialCount = store.strategy!.proposedArticles.length

      await emitMenuAction(wrapper, 'intermédiaire', 'add-smart')

      expect(store.strategy!.proposedArticles).toHaveLength(initialCount + 1)
      const added = store.strategy!.proposedArticles[initialCount]
      expect(added.title).toBe('Inter Contenu éditorial')
      expect(added.type).toBe('Intermédiaire')
      expect(added.parentTitle).toBe('Pilier SEO Toulouse')
      expect(added.suggestedKeyword).toBe('stratégie contenu site professionnel')
      expect(added.accepted).toBe(false)
      expect(added.createdInDb).toBe(false)
    })

    it('adds a Spécialisé with correct parentTitle', async () => {
      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return Promise.resolve({ suggestion: SMART_SPE_RESPONSE })
        }
        return Promise.resolve({})
      })

      const { wrapper, store } = mountBrainPhase()
      const initialCount = store.strategy!.proposedArticles.length

      await emitMenuAction(wrapper, 'spécialisé', 'add-smart')

      const added = store.strategy!.proposedArticles[initialCount]
      expect(added.title).toBe('Comment rédiger un article optimisé pour Google ?')
      expect(added.type).toBe('Spécialisé')
      expect(added.parentTitle).toBe('Inter Technique')
    })

    it('handles response wrapped in code fences', async () => {
      const fenced = '```json\n' + SMART_INTER_RESPONSE + '\n```'
      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return Promise.resolve({ suggestion: fenced })
        }
        return Promise.resolve({})
      })

      const { wrapper, store } = mountBrainPhase()
      const initialCount = store.strategy!.proposedArticles.length

      await emitMenuAction(wrapper, 'intermédiaire', 'add-smart')

      expect(store.strategy!.proposedArticles).toHaveLength(initialCount + 1)
      expect(store.strategy!.proposedArticles[initialCount].title).toBe('Inter Contenu éditorial')
    })

    it('handles response as array (takes first element)', async () => {
      const arrayResponse = JSON.stringify([
        { title: 'Article A', type: 'Intermédiaire', parentTitle: 'Pilier SEO Toulouse', suggestedKeyword: 'kw a', painPoint: 'pain a', rationale: 'why a' },
      ])

      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return Promise.resolve({ suggestion: arrayResponse })
        }
        return Promise.resolve({})
      })

      const { wrapper, store } = mountBrainPhase()
      const initialCount = store.strategy!.proposedArticles.length

      await emitMenuAction(wrapper, 'intermédiaire', 'add-smart')

      expect(store.strategy!.proposedArticles).toHaveLength(initialCount + 1)
      expect(store.strategy!.proposedArticles[initialCount].title).toBe('Article A')
    })
  })

  describe('article guidé', () => {
    it('sends userInput in the API payload', async () => {
      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return Promise.resolve({ suggestion: SMART_INTER_RESPONSE })
        }
        return Promise.resolve({})
      })

      const { wrapper } = mountBrainPhase()
      await emitMenuAction(wrapper, 'intermédiaire', 'add-guided', 'Les réseaux sociaux pour les artisans')

      const suggestCall = mockApiPost.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('/suggest'),
      )
      expect(suggestCall).toBeTruthy()
      const parsed = JSON.parse(suggestCall![1].currentInput)
      expect(parsed.userInput).toBe('Les réseaux sociaux pour les artisans')
      expect(parsed.articleType).toBe('Intermédiaire')
    })
  })

  describe('fallback to empty article', () => {
    it('adds empty article when API call fails', async () => {
      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({})
      })

      const { wrapper, store } = mountBrainPhase()
      const initialCount = store.strategy!.proposedArticles.length

      await emitMenuAction(wrapper, 'intermédiaire', 'add-smart')

      expect(store.strategy!.proposedArticles).toHaveLength(initialCount + 1)
      const added = store.strategy!.proposedArticles[initialCount]
      expect(added.title).toBe('')
      expect(added.type).toBe('Intermédiaire')
    })

    it('adds empty article when response is unparseable', async () => {
      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return Promise.resolve({ suggestion: 'Not valid JSON at all' })
        }
        return Promise.resolve({})
      })

      const { wrapper, store } = mountBrainPhase()
      const initialCount = store.strategy!.proposedArticles.length

      await emitMenuAction(wrapper, 'spécialisé', 'add-smart')

      expect(store.strategy!.proposedArticles).toHaveLength(initialCount + 1)
      const added = store.strategy!.proposedArticles[initialCount]
      expect(added.title).toBe('')
      expect(added.type).toBe('Spécialisé')
    })
  })

  describe('loading state', () => {
    it('disables all add buttons while one is generating', async () => {
      let resolveApiCall: (value: unknown) => void
      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return new Promise(resolve => { resolveApiCall = resolve })
        }
        return Promise.resolve({})
      })

      const { wrapper } = mountBrainPhase()

      // Trigger add-smart via emit
      await emitMenuAction(wrapper, 'intermédiaire', 'add-smart')

      // All menus should be disabled or loading
      const menus = wrapper.findAllComponents({ name: 'AddArticleMenu' })
      const interMenu = menus.find(c => (c.props('label') as string).toLowerCase().includes('intermédiaire'))!
      expect(interMenu.props('isLoading')).toBe(true)

      // Other menus should be disabled
      const otherMenus = menus.filter(c => !(c.props('label') as string).toLowerCase().includes('intermédiaire'))
      for (const m of otherMenus) {
        expect(m.props('disabled')).toBe(true)
      }

      // Resolve the API call
      resolveApiCall!({ suggestion: SMART_INTER_RESPONSE })
      await flushPromises()

      // All menus should be re-enabled
      for (const m of wrapper.findAllComponents({ name: 'AddArticleMenu' })) {
        expect(m.props('isLoading')).toBe(false)
        expect(m.props('disabled')).toBe(false)
      }
    })

    it('clears loading state after error', async () => {
      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return Promise.reject(new Error('fail'))
        }
        return Promise.resolve({})
      })

      const { wrapper } = mountBrainPhase()
      await emitMenuAction(wrapper, 'intermédiaire', 'add-smart')

      for (const m of wrapper.findAllComponents({ name: 'AddArticleMenu' })) {
        expect(m.props('isLoading')).toBe(false)
        expect(m.props('disabled')).toBe(false)
      }
    })
  })

  describe('skips empty-title articles in existingArticlesDetail', () => {
    it('only includes articles with non-empty titles in context', async () => {
      const emptyArticle: ProposedArticle = {
        title: '',
        suggestedTitles: [],
        type: 'Intermédiaire',
        parentTitle: null,
        rationale: '',
        painPoint: '',
        suggestedKeyword: '',
        suggestedKeywords: [],
        suggestedSlug: '',
        suggestedSlugs: [],
        validatedSearchQuery: null,
        keywordValidated: false,
        searchQueryValidated: false,
        titleValidated: false,
        accepted: false,
        createdInDb: false,
      }

      mockApiPost.mockImplementation((path: string) => {
        if (path.includes('/suggest')) {
          return Promise.resolve({ suggestion: SMART_INTER_RESPONSE })
        }
        return Promise.resolve({})
      })

      const { wrapper } = mountBrainPhase([EXISTING_PILIER, EXISTING_INTER, emptyArticle])
      await emitMenuAction(wrapper, 'intermédiaire', 'add-smart')

      const suggestCall = mockApiPost.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('/suggest'),
      )
      const input = JSON.parse(suggestCall![1].currentInput)
      const detail = JSON.parse(input.existingArticlesDetail)

      expect(detail).toHaveLength(2)
    })
  })
})
