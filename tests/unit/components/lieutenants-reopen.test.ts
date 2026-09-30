/**
 * Onglet Lieutenants d'un article rouvert (recette du 2026-09-30).
 *
 * - FR-MOT-EXPLORATIONS-HYDRATATION : les propositions enregistrées reviennent à
 *   l'ouverture de l'onglet, même sans lieutenant retenu (le panneau est monté
 *   une fois les données de l'article relues).
 * - FR-LIE-CHECKBOX-COUNT (LIE-8, INFRA-16) : « N / 0 sélectionnés » après un
 *   rechargement ; le compte des propositions est relu avec elles.
 * - FR-LIE-SERP-ANALYZE (FIN-4) : Capitaine déverrouillé (« Les garder »),
 *   « Analyser SERP » reste actif tant que des propositions existent.
 * - FR-UI-AI-PANELS-PATTERN (01-T9) : « Lancer une suggestion IA » ne fait rien
 *   sans analyse SERP ; il est grisé et dit pourquoi, jamais un clic muet.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { ref } from 'vue'
import LieutenantsPanel from '../../../src/components/moteur/LieutenantsPanel.vue'
import LieutenantsAiPanel from '../../../src/components/moteur/LieutenantsAiPanel.vue'
import type { SelectedArticle } from '../../../shared/types/index'
import type { RichLieutenant } from '../../../shared/types/keyword.types'

vi.mock('../../../src/stores/article/radar-exploration.store', () => ({
  useRadarExplorationStore: () => ({
    entry: null, articleId: null, isLoading: false, isMutating: false,
    generatedKeywords: [], scanCards: [], hasScanResult: false, scanResult: null,
    setArticle: vi.fn(), hydrate: vi.fn(), addKeyword: vi.fn(),
    removeKeyword: vi.fn(), addKeywordsBatch: vi.fn(), setScanResultLocal: vi.fn(),
    $reset: vi.fn(),
  }),
}))
vi.mock('../../../src/services/api.service', () => ({
  apiPost: vi.fn().mockResolvedValue({}),
  apiGet: vi.fn().mockResolvedValue(null),
  apiPut: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../../src/composables/editor/useStreaming', async () => {
  const { ref: vueRef } = await import('vue')
  return {
    useStreaming: () => ({
      chunks: vueRef(''), isStreaming: vueRef(false), error: vueRef(null),
      result: vueRef(null), usage: vueRef(null), startStream: vi.fn(), abort: vi.fn(),
    }),
  }
})

const storeKeywords = ref<Record<string, unknown> | null>(null)
vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return storeKeywords.value },
    get lockedLieutenants() {
      return ((storeKeywords.value?.richLieutenants as RichLieutenant[] | undefined) ?? []).filter(l => l.status === 'locked')
    },
    saveDecisions: vi.fn(async () => true),
    setRichLieutenants: vi.fn(),
    saveRichLieutenantProposals: vi.fn(),
    saveLieutenantExplorationEntries: vi.fn().mockResolvedValue(undefined),
    lockLieutenant: vi.fn(),
    unlockLieutenant: vi.fn(),
  }),
}))
vi.mock('../../../src/stores/article/article-progress.store', () => ({
  useArticleProgressStore: () => ({ getProgress: () => ({ completedChecks: [] }) }),
}))
vi.mock('../../../src/stores/ui/gate-alarm.store', () => ({
  useGateAlarmStore: () => ({ evaluate: vi.fn(), ensure: vi.fn() }),
}))
vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('../../../src/stores/ui/cost-log.store', () => ({
  useCostLogStore: () => ({
    entries: [], isCollapsed: true, totalCost: 0, entryCount: 0,
    addEntry: vi.fn(), addMessage: vi.fn(), removeEntry: vi.fn(), clearAll: vi.fn(), toggleCollapsed: vi.fn(),
  }),
}))

const ENFANT = {
  id: 1345, slug: 'budget', title: 'Budget à prévoir : le guide complet', keyword: 'budget à prévoir',
  painPoint: 'douleur', type: 'intermediaire', locked: false, source: 'proposed',
} as never as SelectedArticle

function proposition(keyword: string, status: RichLieutenant['status']): RichLieutenant {
  return { keyword, status, reasoning: 'r', sources: [], suggestedHnLevel: 2, score: 70 } as never as RichLieutenant
}

function mountPanel(overrides: Record<string, unknown> = {}) {
  return mount(LieutenantsPanel, {
    props: {
      selectedArticle: ENFANT, mode: 'workflow', captainKeyword: 'budget à prévoir',
      articleLevel: 'intermediaire', isCaptaineLocked: true, wordGroups: [], rootKeywords: [],
      initialLocked: false, cocoonSlug: 'recette-b', ...overrides,
    },
    global: {
      stubs: {
        LieutenantSerpAnalysis: true,
        LieutenantsResultsLayout: true,
        KeywordAssistPanel: true,
      },
    },
  })
}

type Wrapper = ReturnType<typeof mountPanel>
const layout = (wrapper: Wrapper) => wrapper.findComponent({ name: 'LieutenantsResultsLayout' })
const serp = (wrapper: Wrapper) => wrapper.findComponent({ name: 'LieutenantSerpAnalysis' })

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  // Données déjà relues (MoteurView monte l'onglet après la lecture) : aucune
  // retenue, deux propositions et une écartée.
  storeKeywords.value = {
    articleId: ENFANT.id, capitaine: 'budget à prévoir', lieutenants: [], lexique: [], rootKeywords: [],
    richLieutenants: [
      proposition('prix budget à prévoir', 'suggested'),
      proposition('budget à prévoir avis', 'suggested'),
      proposition('budget à prévoir délai', 'eliminated'),
    ],
  }
})

describe('LieutenantsPanel — un article rouvert retrouve ses propositions', () => {
  it('FR-MOT-EXPLORATIONS-HYDRATATION — les propositions enregistrées s’affichent à l’ouverture, sans lieutenant retenu', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const cards = layout(wrapper).props('lieutenantCards') as Array<{ keyword: string }>
    expect(cards.map(c => c.keyword)).toEqual(['prix budget à prévoir', 'budget à prévoir avis'])
    expect((layout(wrapper).props('eliminatedCards') as unknown[]).length).toBe(1)
  })

  it('FR-LIE-CHECKBOX-COUNT — le compte des propositions est relu avec elles (« 0 / 3 », pas « 0 / 0 »)', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    expect(layout(wrapper).props('totalGenerated')).toBe(3)
  })

  it('FR-LIE-SERP-ANALYZE — Capitaine déverrouillé, des propositions existent : « Analyser SERP » reste actif', async () => {
    const wrapper = mountPanel({ isCaptaineLocked: false })
    await flushPromises()
    expect(serp(wrapper).props('canAnalyze')).toBe(true)
  })
})

describe('Suggestion IA des Lieutenants — préalable manquant (FR-UI-AI-PANELS-PATTERN)', () => {
  it('sans analyse SERP, la relance est grisée et dit pourquoi', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const reason = layout(wrapper).props('proposeDisabledReason') as string | null
    expect(reason).toMatch(/Analyser SERP/)
  })

  it('le bouton grisé n’envoie rien au clic, et son infobulle donne la raison', async () => {
    const panel = mount(LieutenantsAiPanel, {
      props: {
        iaIsStreaming: false, iaChunks: '', iaError: null, contentGapInsights: '', totalGenerated: 0,
        proposeDisabledReason: 'Lancez d’abord « Analyser SERP ».',
      },
      global: { stubs: { AiPanelHeader: true } },
    })
    const button = panel.get('[data-testid="ai-regen-btn"]')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('title')).toBe('Lancez d’abord « Analyser SERP ».')
    await button.trigger('click')
    expect(panel.emitted('retry')).toBeUndefined()
    expect(panel.text()).toContain('Lancez d’abord « Analyser SERP ».')
  })
})
