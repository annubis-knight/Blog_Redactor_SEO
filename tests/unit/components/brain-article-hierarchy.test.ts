import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { ProposedArticle } from '../../../shared/types/strategy.types'

// --- Mocks ---
vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
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

import { apiGet } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)

import BrainPhase from '../../../src/components/production/BrainPhase.vue'
import { useCocoonStrategyStore } from '../../../src/stores/cocoon-strategy.store'

const proposedArticleRowStub = {
  name: 'ProposedArticleRow',
  template: '<div class="proposed-article-row-stub" />',
  props: ['article', 'index', 'compositionResult', 'structuralWarnings'],
  emits: ['regenerate-title', 'regenerate-keyword', 'select-keyword', 'select-title', 'toggle-accept', 'remove'],
}

const strategyStepStub = {
  name: 'StrategyStep',
  template: '<div class="strategy-step-stub" />',
  props: ['title', 'description', 'stepData', 'isSuggesting', 'isDeepening', 'suggestingSubId'],
  emits: ['update:stepData', 'request-suggestion', 'request-merge', 'request-deepen', 'request-sub-suggestion', 'request-sub-merge', 'delete-sub-question', 'request-enrich'],
}

const progressBarStub = {
  template: '<div class="progress-bar-stub" />',
  props: ['percent', 'color'],
}

const contextRecapStub = {
  name: 'ContextRecap',
  template: '<div class="context-recap-stub" />',
  props: ['themeName', 'themeDescription', 'siloName', 'siloDescription', 'cocoonName', 'cocoonArticles', 'previousAnswers', 'themeConfig'],
}

function makeArticle(overrides: Partial<ProposedArticle> = {}): ProposedArticle {
  return {
    title: 'Test article',
    suggestedTitles: ['Test article'],
    type: 'Spécialisé',
    parentTitle: null,
    rationale: '',
    painPoint: '',
    suggestedKeyword: 'test keyword seo professionnel expert',
    suggestedKeywords: [],
    suggestedSlug: '',
    suggestedSlugs: [],
    validatedSearchQuery: null,
    keywordValidated: false,
    searchQueryValidated: false,
    titleValidated: false,
    accepted: false,
    createdInDb: false,
    ...overrides,
  }
}

function makeWellFormedArticles(): ProposedArticle[] {
  return [
    makeArticle({ title: 'Pilier SEO Toulouse', type: 'Pilier', parentTitle: null, suggestedKeyword: 'seo entreprises Toulouse' }),
    makeArticle({ title: 'Inter Technique', type: 'Intermédiaire', parentTitle: 'Pilier SEO Toulouse', suggestedKeyword: 'audit technique site professionnel' }),
    makeArticle({ title: 'Inter Contenu', type: 'Intermédiaire', parentTitle: 'Pilier SEO Toulouse', suggestedKeyword: 'stratégie contenu site professionnel' }),
    makeArticle({ title: 'Spé Tech 1', type: 'Spécialisé', parentTitle: 'Inter Technique', suggestedKeyword: 'comment optimiser vitesse chargement site professionnel' }),
    makeArticle({ title: 'Spé Tech 2', type: 'Spécialisé', parentTitle: 'Inter Technique', suggestedKeyword: 'pourquoi mon site est lent sur mobile' }),
    makeArticle({ title: 'Spé Contenu 1', type: 'Spécialisé', parentTitle: 'Inter Contenu', suggestedKeyword: 'comment rédiger article blog professionnel efficace' }),
    makeArticle({ title: 'Spé Contenu 2', type: 'Spécialisé', parentTitle: 'Inter Contenu', suggestedKeyword: 'quelle fréquence publier articles blog entreprise' }),
  ]
}

function makeEmptyStrategy() {
  const emptyStep = { input: '', suggestion: null, validated: '', subQuestions: [] }
  return {
    cocoonSlug: 'test',
    cible: { ...emptyStep },
    douleur: { ...emptyStep },
    angle: { ...emptyStep },
    promesse: { ...emptyStep },
    cta: { ...emptyStep },
    proposedArticles: [] as ProposedArticle[],
    completedSteps: 6,
  }
}

function mountBrainPhase(articles: ProposedArticle[]) {
  const pinia = createPinia()
  setActivePinia(pinia)

  // Pre-configure the store
  const store = useCocoonStrategyStore()
  const strat = makeEmptyStrategy()
  strat.proposedArticles = articles
  store.strategy = strat as any
  store.currentStep = 5 // Step 6 = articles

  mockApiGet.mockResolvedValue(strat)

  return mount(BrainPhase, {
    props: { cocoonName: 'Test Cocon', siloName: 'Test Silo', cocoonId: 1 },
    global: {
      plugins: [pinia],
      stubs: {
        ProposedArticleRow: proposedArticleRowStub,
        StrategyStep: strategyStepStub,
        ProgressBar: progressBarStub,
        ContextRecap: contextRecapStub,
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BrainPhase — structural warnings (per-article props)', () => {
  function getStubWarnings(wrapper: ReturnType<typeof mountBrainPhase>, articleTitle: string) {
    const stubs = wrapper.findAllComponents(proposedArticleRowStub)
    const stub = stubs.find(s => s.props('article')?.title === articleTitle)
    return stub?.props('structuralWarnings') ?? []
  }

  it('passes 0 warnings for a well-formed hierarchy', async () => {
    const wrapper = mountBrainPhase(makeWellFormedArticles())
    await flushPromises()
    // No global banner
    expect(wrapper.find('[data-testid="structural-warnings"]').exists()).toBe(false)
    // All articles should have empty structuralWarnings
    const stubs = wrapper.findAllComponents(proposedArticleRowStub)
    for (const stub of stubs) {
      expect(stub.props('structuralWarnings')).toEqual([])
    }
  })

  it('passes orphan_spe warning to Spé pointing to unknown Inter', async () => {
    const articles = makeWellFormedArticles()
    articles[3].parentTitle = 'Inter Fantôme'
    const wrapper = mountBrainPhase(articles)
    await flushPromises()
    const warnings = getStubWarnings(wrapper, 'Spé Tech 1')
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some((w: any) => w.type === 'orphan_spe' && w.message.includes('Inter Fantôme'))).toBe(true)
  })

  it('passes orphan_inter warning to Inter pointing to unknown Pilier', async () => {
    const articles = makeWellFormedArticles()
    articles[1].parentTitle = 'Pilier Inexistant'
    const wrapper = mountBrainPhase(articles)
    await flushPromises()
    const warnings = getStubWarnings(wrapper, 'Inter Technique')
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some((w: any) => w.type === 'orphan_inter' && w.message.includes('Pilier inexistant'))).toBe(true)
  })

  it('passes missing_parent warning to Inter with null parentTitle', async () => {
    const articles = makeWellFormedArticles()
    articles[1].parentTitle = null
    const wrapper = mountBrainPhase(articles)
    await flushPromises()
    const warnings = getStubWarnings(wrapper, 'Inter Technique')
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some((w: any) => w.type === 'missing_parent')).toBe(true)
  })

  it('passes missing_parent warning to Spé with empty parentTitle', async () => {
    const articles = makeWellFormedArticles()
    articles[3].parentTitle = ''
    const wrapper = mountBrainPhase(articles)
    await flushPromises()
    const warnings = getStubWarnings(wrapper, 'Spé Tech 1')
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some((w: any) => w.type === 'missing_parent')).toBe(true)
  })

  it('passes ratio_low warning to Inter with only 1 Spé', async () => {
    const articles = makeWellFormedArticles()
    // Remove Spé Tech 2 (index 4)
    articles.splice(4, 1)
    const wrapper = mountBrainPhase(articles)
    await flushPromises()
    const warnings = getStubWarnings(wrapper, 'Inter Technique')
    expect(warnings.some((w: any) => w.type === 'ratio_low' && w.message.includes('1 Spécialisé'))).toBe(true)
  })

  it('passes ratio_high warning to Inter with 4+ Spé', async () => {
    const articles = makeWellFormedArticles()
    articles.push(
      makeArticle({ title: 'Spé Tech 3', type: 'Spécialisé', parentTitle: 'Inter Technique' }),
      makeArticle({ title: 'Spé Tech 4', type: 'Spécialisé', parentTitle: 'Inter Technique' }),
    )
    const wrapper = mountBrainPhase(articles)
    await flushPromises()
    const warnings = getStubWarnings(wrapper, 'Inter Technique')
    expect(warnings.some((w: any) => w.type === 'ratio_high' && w.message.includes('4 Spécialisés'))).toBe(true)
  })

  it('shows no_pilier in global banner when no Pilier exists', async () => {
    const articles = makeWellFormedArticles().filter(a => a.type !== 'Pilier')
    const wrapper = mountBrainPhase(articles)
    await flushPromises()
    const banner = wrapper.find('[data-testid="structural-warnings"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('Aucun article Pilier')
  })

  it('normalizes parentTitle matching (case + trim)', async () => {
    const articles = makeWellFormedArticles()
    articles[3].parentTitle = '  inter technique  '
    const wrapper = mountBrainPhase(articles)
    await flushPromises()
    // Should NOT produce an orphan warning because normalize matches
    const warnings = getStubWarnings(wrapper, 'Spé Tech 1')
    expect(warnings.every((w: any) => w.type !== 'orphan_spe')).toBe(true)
  })
})

describe('BrainPhase — Spé grouped by parentTitle', () => {
  it('groups Spé articles under their parent Inter with group headers', async () => {
    const articles = makeWellFormedArticles()
    const wrapper = mountBrainPhase(articles)
    await flushPromises()

    const groupHeaders = wrapper.findAll('.spec-group-header')
    expect(groupHeaders.length).toBe(2) // Inter Technique + Inter Contenu

    const labels = groupHeaders.map(h => h.find('.spec-group-label').text())
    expect(labels).toContain('Inter Technique')
    expect(labels).toContain('Inter Contenu')
  })

  it('shows orphan Spé in "Non rattachés" group', async () => {
    const articles = makeWellFormedArticles()
    articles.push(makeArticle({ title: 'Spé Orphelin', type: 'Spécialisé', parentTitle: 'Parent Inconnu' }))
    const wrapper = mountBrainPhase(articles)
    await flushPromises()

    const groupHeaders = wrapper.findAll('.spec-group-header')
    const labels = groupHeaders.map(h => h.find('.spec-group-label').text())
    expect(labels).toContain('Non rattachés')

    // Orphan group should have dashed style
    const orphanGroup = wrapper.find('.spec-group--orphan')
    expect(orphanGroup.exists()).toBe(true)
  })

})
