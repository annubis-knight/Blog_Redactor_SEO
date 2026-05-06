/**
 * Vague 1 — Tests architecturaux BrainPhase.
 *
 * Référence FR PRD : FR-CER-PROPOSE (le Cerveau doit proposer des articles
 * structurés en 3 colonnes Pilier/Intermédiaire/Spécialisé à l'étape 6, après
 * que les étapes 1-5 ont été complétées — voir prd.md).
 *
 * Ces tests verrouillent la POSITION DOM des deux blocs principaux :
 * - Étapes 1-5 : <StrategyStep> (Q&R guidé)
 * - Étape 6 : <BrainArticleProposalView> (3 colonnes d'articles)
 *
 * Aucun des deux blocs ne doit être visible en même temps. Et le sous-composant
 * d'étape 6 ne doit pas se retrouver descendant de StrategyStep (régression
 * possible si quelqu'un fusionne les deux par erreur).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

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
    cocoons: [], isLoading: false, error: null, fetchCocoons: vi.fn(),
  }),
}))

vi.mock('../../../src/stores/strategy/silos.store', () => ({
  useSilosStore: () => ({
    silos: [], theme: null, isLoading: false, error: null, fetchSilos: vi.fn(),
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
    isLoading: false, error: null, fetchConfig: vi.fn(),
  }),
}))

vi.mock('../../../src/composables/seo/useCompositionCheck', () => ({
  checkKeywordComposition: vi.fn(() => ({ allPass: true, warningCount: 0, results: [] })),
}))

vi.mock('../../../src/composables/keyword/useCapitaineScan', () => ({
  articleTypeToLevel: vi.fn(() => 'N4'),
}))

import BrainPhase from '../../../src/components/production/BrainPhase.vue'
import { useCocoonStrategyStore } from '../../../src/stores/strategy/cocoon-strategy.store'

const stubs = {
  StrategyStep: {
    name: 'StrategyStep',
    template: '<div data-testid="strategy-step"></div>',
    props: ['title', 'description', 'stepData', 'isSuggesting', 'isDeepening', 'suggestingSubId'],
  },
  ContextRecap: {
    name: 'ContextRecap',
    template: '<div data-testid="context-recap"></div>',
    props: ['themeName', 'themeDescription', 'siloName', 'siloDescription', 'cocoonName', 'cocoonArticles', 'previousAnswers', 'themeConfig'],
  },
  BrainArticleProposalView: {
    name: 'BrainArticleProposalView',
    template: '<div data-testid="brain-article-proposal-view"></div>',
    props: ['articleColumns', 'groupedSpecArticles', 'compositionResults', 'articleWarnings', 'intermediateTitles', 'globalWarnings', 'truncationWarning', 'generationWarning', 'generationPhase', 'addingArticleType', 'topicsLoading', 'topicsError', 'proposedArticlesCount', 'suggestedTopics', 'topicsUserContext'],
  },
}

function buildEmptyStrategy(currentStep: number) {
  const empty = { input: '', suggestion: null, validated: '', subQuestions: [] }
  return {
    completedSteps: currentStep,
    cible: { ...empty },
    douleur: { ...empty },
    angle: { ...empty },
    promesse: { ...empty },
    cta: { ...empty },
    proposedArticles: [],
    suggestedTopics: [],
    topicsUserContext: '',
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

function mountBrain(currentStep: number) {
  const store = useCocoonStrategyStore()
  store.strategy = buildEmptyStrategy(currentStep) as never
  store.currentStep = currentStep
  store.isLoading = false
  return mount(BrainPhase, {
    props: { cocoonName: 'cocoon-test', siloName: 'silo-test', cocoonId: 1 },
    global: { stubs },
  })
}

function isDescendantOf(wrapper: ReturnType<typeof mountBrain>, ancestorSelector: string, descendantSelector: string): boolean {
  const ancestor = wrapper.find(ancestorSelector)
  if (!ancestor.exists()) return false
  return ancestor.find(descendantSelector).exists()
}

describe('BrainPhase — architecture des étapes (Vague 1)', () => {
  it('AC.C.1 — currentStep < 5 → StrategyStep rendu, BrainArticleProposalView absent', async () => {
    const wrapper = mountBrain(2)
    expect(wrapper.find('[data-testid="strategy-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="brain-article-proposal-view"]').exists()).toBe(false)
  })

  it('AC.C.2 — currentStep === 5 → BrainArticleProposalView rendu, StrategyStep absent', async () => {
    const wrapper = mountBrain(5)
    expect(wrapper.find('[data-testid="brain-article-proposal-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="strategy-step"]').exists()).toBe(false)
  })

  it('AC.C.3 — BrainArticleProposalView N\'EST PAS descendant de StrategyStep', async () => {
    const wrapper = mountBrain(5)
    expect(isDescendantOf(wrapper, '[data-testid="strategy-step"]', '[data-testid="brain-article-proposal-view"]'))
      .toBe(false)
  })
})
