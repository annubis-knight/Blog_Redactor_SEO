/**
 * FR-LIE-LOCK-GATE — l'étape Lieutenants n'est accordée que si la porte passe.
 *
 * Comportements vérifiés (tests négatifs d'abord, NFR-TEST-BEHAVIORAL) :
 *   - porte refusée → AUCUN check émis, un bandeau « Étape non validée » ;
 *   - les décisions sont enregistrées AVANT de demander le verdict (la porte
 *     lit la base, pas l'écran) ;
 *   - le bouton du bandeau ouvre l'alarme ; une dérogation accordée émet l'étape ;
 *   - porte qui passe → l'étape est émise une seule fois.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { ref } from 'vue'
import LieutenantsPanel from '../../../src/components/moteur/LieutenantsPanel.vue'
import { MOTEUR_LIEUTENANTS_LOCKED } from '../../../shared/constants/workflow-checks.constants'
import type { SelectedArticle } from '../../../shared/types/index'
import type { RichLieutenant } from '../../../shared/types/keyword.types'
import type { GateEvaluation } from '../../../shared/verifiers/gate'

vi.mock('../../../src/stores/article/radar-exploration.store', () => ({
  useRadarExplorationStore: () => ({
    entry: null, articleId: null, isLoading: false, isMutating: false,
    generatedKeywords: [], scanCards: [], hasScanResult: false, scanResult: null,
    setArticle: vi.fn(), hydrate: vi.fn(), addKeyword: vi.fn(),
    removeKeyword: vi.fn(), addKeywordsBatch: vi.fn(), setScanResultLocal: vi.fn(),
    $reset: vi.fn(),
  }),
}))

const calls: string[] = []

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

const mockStoreKeywords = ref<Record<string, unknown> | null>(null)
vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return mockStoreKeywords.value },
    get lockedLieutenants() {
      return ((mockStoreKeywords.value?.richLieutenants as RichLieutenant[] | undefined) ?? []).filter(l => l.status === 'locked')
    },
    saveDecisions: vi.fn(async () => { calls.push('saveDecisions'); return true }),
    setRichLieutenants: vi.fn(),
    saveRichLieutenantProposals: vi.fn(),
    saveLieutenantExplorationEntries: vi.fn().mockResolvedValue(undefined),
  }),
}))

const completedChecks = ref<string[]>([])
vi.mock('../../../src/stores/article/article-progress.store', () => ({
  useArticleProgressStore: () => ({
    getProgress: () => ({ completedChecks: completedChecks.value }),
  }),
}))

const mockEvaluate = vi.fn()
const mockEnsure = vi.fn()
vi.mock('../../../src/stores/ui/gate-alarm.store', () => ({
  useGateAlarmStore: () => ({
    evaluate: (...args: unknown[]) => { calls.push('evaluate'); return mockEvaluate(...args) },
    ensure: (...args: unknown[]) => mockEnsure(...args),
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../src/stores/ui/cost-log.store', () => ({
  useCostLogStore: () => ({
    entries: [], isCollapsed: true, totalCost: 0, entryCount: 0,
    addEntry: vi.fn(), addMessage: vi.fn(), removeEntry: vi.fn(),
    clearAll: vi.fn(), toggleCollapsed: vi.fn(),
  }),
}))

const PILIER: SelectedArticle = {
  id: 64, slug: 'creation-site-web-pilier', title: 'Création de site web à Toulouse',
  keyword: 'creation site web toulouse', painPoint: 'pain', type: 'pilier',
  locked: false, source: 'proposed',
} as never as SelectedArticle

const UN_LIEUTENANT = [
  { keyword: 'site vitrine professionnel', status: 'locked', reasoning: 'r', sources: [], suggestedHnLevel: 2, score: 72 },
] as never as RichLieutenant[]

const TOO_FEW: GateEvaluation = {
  gateId: 'lieutenants-lock', passed: false, inputHash: 'h', waived: [],
  issues: [{ rule: 'lieutenants-too-few', level: 'risque', message: 'Un pilier appelle au moins 3 lieutenants (1 retenu).' }],
  blocking: [{ rule: 'lieutenants-too-few', level: 'risque', message: 'Un pilier appelle au moins 3 lieutenants (1 retenu).' }],
}
const PASSED: GateEvaluation = { ...TOO_FEW, passed: true, issues: [], blocking: [] }

function mountPanel() {
  return mount(LieutenantsPanel, {
    props: {
      selectedArticle: PILIER, mode: 'workflow', captainKeyword: PILIER.keyword,
      articleLevel: 'pilier', isCaptaineLocked: true, wordGroups: [], rootKeywords: [],
      initialLocked: true, cocoonSlug: 'creation-site-web',
    },
    global: {
      stubs: {
        LieutenantSerpAnalysis: { template: '<div />' },
        LieutenantsResultsLayout: { template: '<div />' },
        KeywordAssistPanel: { template: '<div />' },
        CollapsableSection: { template: '<div><slot /></div>' },
      },
    },
  })
}

function checkEmissions(wrapper: ReturnType<typeof mountPanel>, event: string): number {
  return (wrapper.emitted(event) ?? []).filter(args => args[0] === MOTEUR_LIEUTENANTS_LOCKED).length
}

// Un panneau resté monté réagirait aux mots-clés du test suivant.
enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.clearAllMocks()
  calls.length = 0
  completedChecks.value = []
  mockStoreKeywords.value = {
    articleId: PILIER.id, capitaine: PILIER.keyword,
    lieutenants: UN_LIEUTENANT.map(l => l.keyword), lexique: [], rootKeywords: [],
    richLieutenants: [...UN_LIEUTENANT],
    hnStructure: [{ level: 2, text: 'Pourquoi un site vitrine' }],
  }
})

describe('LieutenantsPanel — porte « valider les lieutenants »', () => {
  it('porte refusée : aucune étape émise, un bandeau explique pourquoi', async () => {
    mockEvaluate.mockResolvedValue(TOO_FEW)
    const wrapper = mountPanel()
    await flushPromises()

    expect(mockEvaluate).toHaveBeenCalledWith(PILIER.id, 'lieutenants-lock')
    expect(checkEmissions(wrapper, 'check-completed')).toBe(0)
    const banner = wrapper.get('[data-testid="lieutenants-gate-banner"]')
    expect(banner.text()).toContain('Étape non validée')
    expect(banner.text()).toContain('au moins 3 lieutenants')
  })

  it('les décisions sont enregistrées avant de demander le verdict', async () => {
    mockEvaluate.mockResolvedValue(TOO_FEW)
    mountPanel()
    await flushPromises()
    expect(calls.indexOf('saveDecisions')).toBeGreaterThan(-1)
    expect(calls.indexOf('saveDecisions')).toBeLessThan(calls.indexOf('evaluate'))
  })

  it('le bandeau ouvre l’alarme ; une dérogation accordée valide l’étape', async () => {
    mockEvaluate.mockResolvedValue(TOO_FEW)
    mockEnsure.mockResolvedValue(true)
    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.get('[data-testid="lieutenants-gate-review"]').trigger('click')
    await flushPromises()
    expect(mockEnsure).toHaveBeenCalledWith(PILIER.id, 'lieutenants-lock')
    expect(checkEmissions(wrapper, 'check-completed')).toBe(1)
    expect(wrapper.find('[data-testid="lieutenants-gate-banner"]').exists()).toBe(false)
  })

  it('revenir corriger depuis l’alarme laisse l’étape non validée', async () => {
    mockEvaluate.mockResolvedValue(TOO_FEW)
    mockEnsure.mockResolvedValue(false)
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.get('[data-testid="lieutenants-gate-review"]').trigger('click')
    await flushPromises()
    expect(checkEmissions(wrapper, 'check-completed')).toBe(0)
    expect(wrapper.find('[data-testid="lieutenants-gate-banner"]').exists()).toBe(true)
  })

  it('porte qui passe : l’étape est émise une seule fois, sans bandeau', async () => {
    mockEvaluate.mockResolvedValue(PASSED)
    const wrapper = mountPanel()
    await flushPromises()
    expect(checkEmissions(wrapper, 'check-completed')).toBe(1)
    expect(wrapper.find('[data-testid="lieutenants-gate-banner"]').exists()).toBe(false)
  })

  it('un lieutenant ajouté ensuite relance la porte, qui accorde alors l’étape', async () => {
    mockEvaluate.mockResolvedValueOnce(TOO_FEW).mockResolvedValue(PASSED)
    const wrapper = mountPanel()
    await flushPromises()
    expect(checkEmissions(wrapper, 'check-completed')).toBe(0)

    const kw = mockStoreKeywords.value!
    mockStoreKeywords.value = {
      ...kw,
      richLieutenants: [
        ...UN_LIEUTENANT,
        { keyword: 'site web pme', status: 'locked', reasoning: 'r', sources: [], suggestedHnLevel: 2, score: 60 },
        { keyword: 'refonte site internet', status: 'locked', reasoning: 'r', sources: [], suggestedHnLevel: 2, score: 58 },
      ],
    }
    await flushPromises()
    expect(mockEvaluate).toHaveBeenCalledTimes(2)
    expect(checkEmissions(wrapper, 'check-completed')).toBe(1)
  })

  it('cocher le lieutenant qui active l’étape ne lance qu’une vérification, et une seule étape', async () => {
    mockStoreKeywords.value = { ...mockStoreKeywords.value!, richLieutenants: [] }
    mockEvaluate.mockResolvedValue(PASSED)
    const wrapper = mountPanel()
    await flushPromises()
    expect(mockEvaluate).not.toHaveBeenCalled()

    mockStoreKeywords.value = {
      ...mockStoreKeywords.value!,
      richLieutenants: [
        ...UN_LIEUTENANT,
        { keyword: 'site web pme', status: 'locked', reasoning: 'r', sources: [], suggestedHnLevel: 2, score: 60 },
        { keyword: 'refonte site internet', status: 'locked', reasoning: 'r', sources: [], suggestedHnLevel: 2, score: 58 },
      ],
    }
    await flushPromises()
    expect(mockEvaluate).toHaveBeenCalledTimes(1)
    expect(checkEmissions(wrapper, 'check-completed')).toBe(1)
  })

  it('l’étape déjà accordée est retirée si la porte refuse après un changement', async () => {
    completedChecks.value = []
    mockEvaluate.mockResolvedValueOnce(PASSED).mockResolvedValue(TOO_FEW)
    const wrapper = mountPanel()
    await flushPromises()
    expect(checkEmissions(wrapper, 'check-completed')).toBe(1)
    completedChecks.value = [MOTEUR_LIEUTENANTS_LOCKED]

    const kw = mockStoreKeywords.value!
    mockStoreKeywords.value = {
      ...kw,
      richLieutenants: [
        ...UN_LIEUTENANT,
        { keyword: 'audit site web', status: 'locked', reasoning: 'r', sources: [], suggestedHnLevel: 2, score: 50 },
      ],
    }
    await flushPromises()
    expect(checkEmissions(wrapper, 'check-removed')).toBe(1)
    expect(wrapper.find('[data-testid="lieutenants-gate-banner"]').exists()).toBe(true)
  })
})
