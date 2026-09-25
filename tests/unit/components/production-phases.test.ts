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
import { useWorkflowNavStore } from '../../../src/stores/ui/workflow-nav.store'
const mockApiPost = vi.mocked(apiPost)
const mockApiGet = vi.mocked(apiGet)
const mockApiPut = vi.mocked(apiPut)

const strategyStepStub = {
  name: 'StrategyStep',
  template: '<div class="strategy-step-stub" />',
  props: ['title', 'description', 'stepData', 'isSuggesting'],
  emits: ['update:stepData', 'request-suggestion'],
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
    // PUT /strategy/cocoon/:slug renvoie la stratégie enregistrée (saveStrategy la reprend)
    mockApiPut.mockImplementation((_url, body) => Promise.resolve(body))

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
          ContextRecap: { template: '<div class="context-recap-stub" />' },
          CocoonTreeBuilder: { template: '<div class="cocoon-tree-stub" />', props: ['cocoonId', 'cocoonName', 'cocoonSlug'] },
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

  // 2026-09-25 (épopée qualité SEO, C2 · T2) : l'en-tête « Brainstorm
  // stratégique » et la barre de progression ont quitté BrainPhase (tests
  // retirés) ; le stepper des 6 étapes vit dans la barre du haut
  // (workflow-nav store) : les tests qui le visaient passent par lui.
  it('publie les 6 étapes du Cerveau dans la barre de navigation', async () => {
    await mountBrainPhase()

    const nav = useWorkflowNavStore().state
    expect(nav?.workflow).toBe('cerveau')
    expect(nav?.activeId).toBe('cible')
    expect(nav?.steps?.map(s => [s.id, s.number, s.done, s.locked])).toEqual([
      ['cible', 1, false, false],
      ['douleur', 2, false, true],
      ['angle', 3, false, true],
      ['promesse', 4, false, true],
      ['cta', 5, false, true],
      ['articles', 6, false, true],
    ])
  })

  it('shows StrategyStep for steps 1-5', async () => {
    const wrapper = await mountBrainPhase()

    const strategyStep = wrapper.findComponent(strategyStepStub)
    expect(strategyStep.exists()).toBe(true)
    expect(strategyStep.props('title')).toBe('À qui parlez-vous ?')
    expect(strategyStep.props('description')).toContain('persona du lecteur idéal')
  })

  it('l’étape Articles, atteinte depuis la barre, montre la carte en 3 colonnes', async () => {
    const wrapper = await mountBrainPhase()

    useWorkflowNavStore().navigate('articles')
    await flushPromises()

    expect(wrapper.findComponent(strategyStepStub).exists()).toBe(false)
    expect(wrapper.find('.step-title').text()).toBe("Proposition d'articles")
    expect(wrapper.get('[data-testid="brain-generate-articles"]').text()).toBe('Générer avec Claude')
    expect(wrapper.findAll('.article-column')).toHaveLength(3)
    expect(wrapper.findAll('.add-article-placeholder')).toHaveLength(3)
    expect(useWorkflowNavStore().state?.activeId).toBe('articles')
  })

  it('shows "Suivant" button for steps 1-5 and "Terminer" for step 6', async () => {
    const wrapper = await mountBrainPhase()

    expect(wrapper.get('[data-testid="brain-next"]').text()).toBe('Suivant')

    useWorkflowNavStore().navigate('articles')
    await flushPromises()

    expect(wrapper.get('[data-testid="brain-next"]').text()).toBe('Terminer le brainstorm')
  })

  it('« Suivant » avance d’une étape sans quitter le Cerveau', async () => {
    const wrapper = await mountBrainPhase()

    await wrapper.get('[data-testid="brain-next"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('next')).toBeUndefined()
    expect(wrapper.findComponent(strategyStepStub).props('title')).toBe('Quelle douleur adressez-vous ?')
    expect(mockApiPut).toHaveBeenCalledWith(
      '/strategy/cocoon/refonte-de-site-web',
      expect.objectContaining({ completedSteps: 1 }),
    )
  })

  it('emits next when clicking « Terminer le brainstorm » (stratégie marquée complète)', async () => {
    const wrapper = await mountBrainPhase()
    useWorkflowNavStore().navigate('articles')
    await flushPromises()

    await wrapper.get('[data-testid="brain-next"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('next')).toHaveLength(1)
    expect(mockApiPut).toHaveBeenCalledWith(
      '/strategy/cocoon/refonte-de-site-web',
      expect.objectContaining({ completedSteps: 6 }),
    )
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

    // completedSteps = 1 → reprise à l'étape 2 (« douleur »), « cible » faite.
    expect(wrapper.findComponent(strategyStepStub).props('title')).toBe('Quelle douleur adressez-vous ?')
    const nav = useWorkflowNavStore().state
    expect(nav?.activeId).toBe('douleur')
    expect(nav?.steps?.slice(0, 3).map(s => [s.id, s.done, s.locked])).toEqual([
      ['cible', true, false],
      ['douleur', false, false],
      ['angle', false, true],
    ])
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
          ContextRecap: { template: '<div class="context-recap-stub" />' },
          ProposedArticleRow: { template: '<div class="proposed-article-row-stub" />' },
        },
      },
    })

    await flushPromises()

    // Repli : stratégie vide, questionnaire ouvert à la première étape.
    expect(wrapper.findComponent(strategyStepStub).props('title')).toBe('À qui parlez-vous ?')
    expect(wrapper.find('[data-testid="brain-prev"]').exists()).toBe(false)
    expect(useWorkflowNavStore().state?.activeId).toBe('cible')
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
      type: 'pilier',
      parentTitle: null,
      rationale: 'Article principal du cocon',
      suggestedKeyword: 'refonte site web',
      accepted: true,
    })
    expect(valid.title).toBe('Mon article')
    expect(valid.type).toBe('pilier')
  })

  // C7 (K6) : la création en lot a disparu ; un article se crée à la fois.
  it('createCocoonArticleSchema validates', async () => {
    const { createCocoonArticleSchema } = await import('../../../shared/schemas/article.schema')

    const pilier = createCocoonArticleSchema.parse({ title: 'Article 1', type: 'pilier' })
    expect(pilier.type).toBe('pilier')
    const enfant = createCocoonArticleSchema.parse({ title: 'Article 2', type: 'specifique', parentId: 4, parentSection: 'Le prix' })
    expect(enfant).toMatchObject({ parentId: 4, parentSection: 'Le prix' })

    expect(createCocoonArticleSchema.safeParse({ title: 'x', type: 'pilier' }).success, 'titre trop court').toBe(false)
    expect(createCocoonArticleSchema.safeParse({ title: 'Article 3', type: 'Pilier' }).success, 'type au format base').toBe(false)
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
