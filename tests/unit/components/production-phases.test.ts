import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

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

vi.mock('../../../src/stores/strategy/cocoons.store', () => ({
  useCocoonsStore: () => ({
    cocoons: [],
    isLoading: false,
    error: null,
    fetchCocoons: vi.fn(),
  }),
}))

vi.mock('../../../src/stores/strategy/silos.store', () => ({
  useSilosStore: () => ({
    silos: [],
    isLoading: false,
    error: null,
    fetchSilos: vi.fn(),
  }),
}))

vi.mock('../../../src/stores/strategy/theme-config.store', () => ({
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

import { apiPost, apiGet, apiPut } from '../../../src/services/api.service'
const mockApiPost = vi.mocked(apiPost)
const mockApiGet = vi.mocked(apiGet)
const mockApiPut = vi.mocked(apiPut)

const strategyStepStub = {
  name: 'StrategyStep',
  template: '<div class="strategy-step-stub" />',
  props: ['title', 'description', 'stepData', 'isSuggesting'],
  emits: ['update:stepData', 'request-suggestion'],
}

const progressBarStub = {
  template: '<div class="progress-bar-stub" />',
  props: ['percent', 'color'],
}

const keywordBadgeStub = { template: '<span class="keyword-badge-stub" />', props: ['keyword'] }
const scoreGaugeStub = { template: '<span class="score-gauge-stub" />', props: ['score', 'label', 'size'] }
const dataForSeoPanelStub = { template: '<div class="dataforseo-stub" />', props: ['data', 'isRefreshing'], emits: ['refresh'] }
const contentGapPanelStub = { template: '<div class="content-gap-stub" />', props: ['keyword'] }
const migrationPreviewStub = {
  template: '<div class="migration-stub" />',
  props: ['assignments', 'warnings', 'isApplying'],
  emits: ['apply', 'cancel'],
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// =============================================
// BrainPhase — Cocoon-level brainstorm wizard
// =============================================
describe('BrainPhase', () => {
  async function mountBrainPhase(existingStrategy: any = null) {
    // Mock GET /strategy/cocoon/:slug
    mockApiGet.mockResolvedValueOnce(existingStrategy)

    const { default: BrainPhase } = await import('../../../src/components/production/BrainPhase.vue')
    const wrapper = mount(BrainPhase, {
      props: {
        cocoonName: 'Refonte de site web',
        siloName: 'Création de site',
        cocoonId: 1,
      },
      global: {
        stubs: {
          StrategyStep: strategyStepStub,
          ProgressBar: progressBarStub,
          ContextRecap: { template: '<div class="context-recap-stub" />' },
          ProposedArticleRow: { template: '<div class="proposed-article-row-stub" />' },
        },
      },
    })

    await flushPromises()
    return wrapper
  }

  it('fetches cocoon strategy on mount', async () => {
    await mountBrainPhase()

    expect(mockApiGet).toHaveBeenCalledWith('/strategy/cocoon/refonte-de-site-web')
  })

  it('displays the brainstorm title and description', async () => {
    const wrapper = await mountBrainPhase()

    expect(wrapper.text()).toContain('Brainstorm stratégique')
    expect(wrapper.text()).toContain('Refonte de site web')
    expect(wrapper.text()).toContain('direction stratégique')
  })

  it('displays a 6-step wizard stepper', async () => {
    const wrapper = await mountBrainPhase()

    const stepBtns = wrapper.findAll('.wizard-step-btn')
    expect(stepBtns).toHaveLength(6)
    expect(stepBtns[0]!.text()).toContain('1')
    expect(stepBtns[5]!.text()).toContain('6')
  })

  it('shows StrategyStep for steps 1-5', async () => {
    const wrapper = await mountBrainPhase()

    const strategyStep = wrapper.findComponent(strategyStepStub)
    expect(strategyStep.exists()).toBe(true)
    expect(strategyStep.props('title')).toBe('À qui parlez-vous ?')
    expect(strategyStep.props('description')).toContain('persona du lecteur idéal')
  })

  it('navigating to step 6 shows article proposal section', async () => {
    const wrapper = await mountBrainPhase()

    // Click the 6th step button (index 5)
    const stepBtns = wrapper.findAll('.wizard-step-btn')
    await stepBtns[5]!.trigger('click')

    expect(wrapper.text()).toContain("Proposition d'articles")
    expect(wrapper.text()).toContain('Générer avec Claude')
  })

  it('shows "Suivant" button for steps 1-5 and "Terminer" for step 6', async () => {
    const wrapper = await mountBrainPhase()

    // Step 1: should show "Suivant"
    expect(wrapper.find('.btn-next').text()).toBe('Suivant')

    // Navigate to step 6
    const stepBtns = wrapper.findAll('.wizard-step-btn')
    await stepBtns[5]!.trigger('click')

    expect(wrapper.find('.btn-next').text()).toBe('Terminer le brainstorm')
  })

  it('shows ProgressBar', async () => {
    const wrapper = await mountBrainPhase()

    expect(wrapper.find('.progress-bar-stub').exists()).toBe(true)
  })

  it('emits next when clicking continue button', async () => {
    const wrapper = await mountBrainPhase()

    const btn = wrapper.find('.btn-primary.btn-sm')
    await btn.trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('loads existing strategy and resumes from last step', async () => {
    const existingStrategy = {
      cocoonSlug: 'refonte-de-site-web',
      cible: { input: 'PME BTP', suggestion: null, validated: 'PME du BTP' },
      douleur: { input: '', suggestion: null, validated: '' },
      angle: { input: '', suggestion: null, validated: '' },
      promesse: { input: '', suggestion: null, validated: '' },
      cta: { input: '', suggestion: null, validated: '' },
      proposedArticles: [],
      completedSteps: 1,
      updatedAt: '2026-03-15T10:00:00.000Z',
    }

    const wrapper = await mountBrainPhase(existingStrategy)

    // Should resume at step 1 (completedSteps = 1, so currentStep = min(1, 5) = 1)
    const stepBtns = wrapper.findAll('.wizard-step-btn')
    expect(stepBtns[1]!.classes()).toContain('active')
  })

  it('shows 3-column grid and add buttons in step 6', async () => {
    const wrapper = await mountBrainPhase()

    // Navigate to step 6
    const stepBtns = wrapper.findAll('.wizard-step-btn')
    await stepBtns[5]!.trigger('click')

    // Should show the 3-column article grid
    expect(wrapper.find('.article-columns').exists()).toBe(true)
    const columns = wrapper.findAll('.article-column')
    expect(columns).toHaveLength(3)

    // Each column should have an add-article button
    const addBtns = wrapper.findAll('.add-article-placeholder')
    expect(addBtns.length).toBeGreaterThanOrEqual(3)
  })

  it('handles fetch failure gracefully', async () => {
    mockApiGet.mockReset()
    mockApiGet.mockRejectedValueOnce(new Error('Network error'))

    const { default: BrainPhase } = await import('../../../src/components/production/BrainPhase.vue')
    const wrapper = mount(BrainPhase, {
      props: {
        cocoonName: 'Test Cocon',
        siloName: 'Test Silo',
        cocoonId: 1,
      },
      global: {
        stubs: {
          StrategyStep: strategyStepStub,
          ProgressBar: progressBarStub,
          ContextRecap: { template: '<div class="context-recap-stub" />' },
          ProposedArticleRow: { template: '<div class="proposed-article-row-stub" />' },
        },
      },
    })

    await flushPromises()

    // Should still show wizard (initEmpty called as fallback)
    expect(wrapper.findAll('.wizard-step-btn')).toHaveLength(6)
  })
})

// =============================================
// EnginePhase
// =============================================
describe('EnginePhase', () => {
  async function mountEnginePhase() {
    // Mock keywords fetch (apiGet for keywords store)
    mockApiGet.mockResolvedValue([])
    // Mock DataForSEO fetch
    mockApiPost.mockResolvedValueOnce({
      keyword: 'refonte site web',
      keywordData: { volume: 1200, difficulty: 35, cpc: 2.5, competition: 0.6 },
    })

    const { default: EnginePhase } = await import('../../../src/components/production/EnginePhase.vue')
    const wrapper = mount(EnginePhase, {
      props: {
        cocoonName: 'Refonte de site web',
        cocoonId: 1,
      },
      global: {
        stubs: {
          KeywordBadge: keywordBadgeStub,
          ScoreGauge: scoreGaugeStub,
          DataForSeoPanel: dataForSeoPanelStub,
          ContentGapPanel: contentGapPanelStub,
          KeywordMigrationPreview: migrationPreviewStub,
        },
      },
    })

    await flushPromises()
    return wrapper
  }

  it('renders DataForSEO section', async () => {
    const wrapper = await mountEnginePhase()
    expect(wrapper.text()).toContain('Données DataForSEO')
    expect(wrapper.find('.dataforseo-stub').exists()).toBe(true)
  })

  it('renders ContentGapPanel', async () => {
    const wrapper = await mountEnginePhase()
    expect(wrapper.find('.content-gap-stub').exists()).toBe(true)
  })

  it('contains audit button', async () => {
    const wrapper = await mountEnginePhase()
    const hasAuditBtn = wrapper.find('.btn-audit').exists()
    const hasEmptyState = wrapper.find('.empty-state').exists()
    expect(hasAuditBtn || hasEmptyState).toBe(true)
  })

  it('contains migration button', async () => {
    const wrapper = await mountEnginePhase()
    const hasMigrateBtn = wrapper.find('.btn-migrate').exists()
    const hasEmptyState = wrapper.find('.empty-state').exists()
    expect(hasMigrateBtn || hasEmptyState).toBe(true)
  })

  it('emits next when clicking continue button', async () => {
    const wrapper = await mountEnginePhase()
    const btn = wrapper.find('.engine-nav .btn-primary')
    await btn.trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)
  })
})

// =============================================
// Cocoon strategy routes (backend schemas)
// =============================================
describe('Cocoon strategy schemas', () => {
  it('cocoonStrategySchema validates correctly', async () => {
    const { cocoonStrategySchema } = await import('../../../shared/schemas/strategy.schema')

    const valid = cocoonStrategySchema.parse({
      cocoonSlug: 'test-cocon',
      cible: { input: 'PME', suggestion: null, validated: '' },
      douleur: { input: '', suggestion: null, validated: '' },
      angle: { input: '', suggestion: null, validated: '' },
      promesse: { input: '', suggestion: null, validated: '' },
      cta: { input: '', suggestion: null, validated: '' },
      proposedArticles: [],
      completedSteps: 0,
      updatedAt: '2026-03-15T10:00:00.000Z',
    })
    expect(valid.cocoonSlug).toBe('test-cocon')
  })

  it('cocoonSuggestRequestSchema validates steps', async () => {
    const { cocoonSuggestRequestSchema } = await import('../../../shared/schemas/strategy.schema')

    const valid = cocoonSuggestRequestSchema.parse({
      step: 'cible',
      currentInput: 'PME du BTP',
      context: {
        cocoonName: 'Test',
        siloName: 'Test Silo',
      },
    })
    expect(valid.step).toBe('cible')

    // articles step is valid too
    const articlesStep = cocoonSuggestRequestSchema.parse({
      step: 'articles',
      currentInput: 'Propose des articles',
      context: { cocoonName: 'Test', siloName: 'Silo' },
    })
    expect(articlesStep.step).toBe('articles')

    // Invalid step
    expect(() => cocoonSuggestRequestSchema.parse({
      step: 'invalid',
      currentInput: '',
      context: { cocoonName: '', siloName: '' },
    })).toThrow()
  })

  it('proposedArticleSchema validates article proposals', async () => {
    const { proposedArticleSchema } = await import('../../../shared/schemas/strategy.schema')

    const valid = proposedArticleSchema.parse({
      title: 'Mon article',
      type: 'Pilier',
      parentTitle: null,
      rationale: 'Article principal du cocon',
      suggestedKeyword: 'refonte site web',
      accepted: true,
    })
    expect(valid.title).toBe('Mon article')
    expect(valid.type).toBe('Pilier')
  })

  it('batchCreateArticlesSchema validates', async () => {
    const { batchCreateArticlesSchema } = await import('../../../shared/schemas/article.schema')

    const valid = batchCreateArticlesSchema.parse({
      cocoonName: 'Mon cocon',
      articles: [
        { title: 'Article 1', type: 'Pilier' },
        { title: 'Article 2', type: 'Spécialisé' },
      ],
    })
    expect(valid.articles).toHaveLength(2)

    expect(() => batchCreateArticlesSchema.parse({
      cocoonName: 'Test',
      articles: [],
    })).toThrow()
  })
})

// =============================================
// Batch-status route (backend) — kept from before
// =============================================
describe('POST /strategy/batch-status — route', () => {
  it('schema validates ids array', async () => {
    const { batchStrategyStatusRequestSchema } = await import('../../../shared/schemas/strategy.schema')

    const valid = batchStrategyStatusRequestSchema.parse({ ids: [1, 2] })
    expect(valid.ids).toEqual([1, 2])

    expect(() => batchStrategyStatusRequestSchema.parse({ ids: 123 })).toThrow()
    expect(() => batchStrategyStatusRequestSchema.parse({})).toThrow()
  })
})
