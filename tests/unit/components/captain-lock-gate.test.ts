/**
 * FR-CAP-LOCK-GATE — verrouiller un capitaine passe par la porte de qualité.
 *
 * En mode workflow, le verrou part de la liste radar (`lockEntry`). La porte
 * est vérifiée AVANT tout changement ; refusée, rien ne bouge (ni verrou, ni
 * enregistrement, ni étape, ni déverrouillage du capitaine précédent).
 * Tests négatifs d'abord (NFR-TEST-BEHAVIORAL).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import CaptainPanel from '../../../src/components/moteur/CaptainPanel.vue'
import { MOTEUR_CAPITAINE_LOCKED } from '../../../shared/constants/workflow-checks.constants'

const calls: string[] = []

vi.mock('../../../src/composables/keyword/useCapitaineScan', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../../src/composables/keyword/useCapitaineScan')
  const { ref: vueRef } = await import('vue')
  return {
    ...actual,
    useCapitaineScan: () => ({
      currentResult: vueRef(null), isLoading: vueRef(false), error: vueRef(null),
      history: vueRef([]), historyIndex: vueRef(-1), rootResult: vueRef(null),
      isLoadingRoot: vueRef(false), radarCard: vueRef(null), isLoadingRadar: vueRef(false),
      scanKeyword: vi.fn(), navigateHistory: vi.fn(), reset: vi.fn(),
    }),
  }
})

const ENTRY = {
  originalCard: { keyword: 'plombier toulouse' },
  card: { keyword: 'plombier toulouse' },
  validation: { keyword: 'plombier toulouse', verdict: { level: 'GO', greenCount: 5, totalKpis: 6, autoNoGo: false }, kpis: [] },
  rootVariants: new Map(),
}
vi.mock('../../../src/composables/keyword/useExploredKeywords', async () => {
  const { ref: vueRef } = await import('vue')
  return {
    useExploredKeywords: () => ({
      entries: vueRef([ENTRY]), currentIndex: vueRef(0), isActive: vueRef(true), count: vueRef(1),
      currentEntry: vueRef(ENTRY), loadCards: vi.fn(), addEntry: vi.fn(), addRootVariantToEntry: vi.fn(),
      next: vi.fn(), prev: vi.fn(), goTo: vi.fn(), reset: vi.fn(), effectiveVerdict: vi.fn(() => 'GO'),
      setActiveWordIndices: vi.fn(), refreshFromValidation: vi.fn(), setRecomputedCard: vi.fn(),
    }),
  }
})

const storeKeywords = ref<Record<string, unknown> | null>(null)
const saveResult = { value: true as boolean | undefined }
const mockLockCaptain = vi.fn((keyword: string) => {
  calls.push('lockCaptain')
  storeKeywords.value = { articleId: 1, capitaine: keyword, richCaptain: { keyword, status: 'locked', exploredKeywords: [] } }
})
const mockUnlockCaptain = vi.fn(() => { calls.push('unlockCaptain') })
vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return storeKeywords.value },
    lockedLieutenants: [],
    lockCaptain: mockLockCaptain,
    unlockCaptain: mockUnlockCaptain,
    setRootKeywords: vi.fn(),
    saveKeywords: vi.fn(async () => { calls.push('saveKeywords'); return saveResult.value }),
    saveDecisions: vi.fn(async () => true),
    initEmpty: vi.fn(),
    saveCaptainExplorationEntry: vi.fn(),
    saveCaptainExplorationAiPanel: vi.fn(),
    loadCaptainPaaJudgments: vi.fn(),
    getPaaJudgment: vi.fn(() => null),
    isPaaJudgmentLoading: vi.fn(() => false),
  }),
}))

const mockEnsure = vi.fn()
vi.mock('../../../src/stores/ui/gate-alarm.store', () => ({
  useGateAlarmStore: () => ({
    ensure: (...args: unknown[]) => { calls.push('ensure'); return mockEnsure(...args) },
  }),
}))

const mockNotifyError = vi.fn()
vi.mock('../../../src/composables/ui/useNotify', () => ({
  useNotify: () => ({ info: vi.fn(), success: vi.fn(), error: mockNotifyError, warning: vi.fn() }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const stubs = {
  CaptainRadarList: {
    name: 'CaptainRadarList',
    template: '<div data-testid="captain-radar-list"></div>',
    emits: ['select', 'lock', 'unlock', 'word-toggle', 'recompute-relevance', 'sort-change'],
  },
  CaptainSidePanel: { template: '<div />' },
  CaptainInput: { template: '<div />' },
  AiPanel: { template: '<div />' },
  AiAdviceMarkdown: { template: '<div />' },
  CaptainLockPanel: { template: '<div />' },
  CaptainRootsSidebar: { template: '<div />' },
  CollapsableSection: { template: '<div><slot /></div>' },
  RadarKeywordCard: { template: '<div />' },
  UnlockLieutenantsModal: { template: '<div />' },
}

function mountWorkflow() {
  return mount(CaptainPanel, {
    props: {
      selectedArticle: { id: 1, slug: 'art', title: 'Plombier à Toulouse', keyword: 'plombier toulouse', painPoint: 'p', type: 'pilier', locked: false, source: 'proposed' } as never,
      mode: 'workflow', initialLocked: false, suggestedKeywords: [], radarCards: [],
    },
    global: { stubs },
  })
}

async function lockFirstEntry(wrapper: ReturnType<typeof mountWorkflow>) {
  wrapper.findComponent({ name: 'CaptainRadarList' }).vm.$emit('lock', 0)
  await flushPromises()
}

function emissions(wrapper: ReturnType<typeof mountWorkflow>, event: string): number {
  return (wrapper.emitted(event) ?? []).filter(args => args[0] === MOTEUR_CAPITAINE_LOCKED).length
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  calls.length = 0
  storeKeywords.value = null
  saveResult.value = true
})

describe('CaptainPanel — porte « verrouiller le capitaine » (mode workflow)', () => {
  it('porte refusée : ni verrou, ni enregistrement, ni étape', async () => {
    mockEnsure.mockResolvedValue(false)
    const wrapper = mountWorkflow()
    await flushPromises()
    await lockFirstEntry(wrapper)

    expect(mockEnsure).toHaveBeenCalledWith(1, 'captain-lock', { keyword: 'plombier toulouse' })
    expect(mockLockCaptain).not.toHaveBeenCalled()
    expect(calls).not.toContain('saveKeywords')
    expect(emissions(wrapper, 'check-completed')).toBe(0)
  })

  it('porte refusée sur un nouveau capitaine : le précédent reste verrouillé', async () => {
    storeKeywords.value = { articleId: 1, capitaine: 'ancien capitaine', richCaptain: { keyword: 'ancien capitaine', status: 'locked', exploredKeywords: [] } }
    mockEnsure.mockResolvedValue(false)
    const wrapper = mountWorkflow()
    await flushPromises()
    await lockFirstEntry(wrapper)
    expect(emissions(wrapper, 'check-removed')).toBe(0)
    expect(mockLockCaptain).not.toHaveBeenCalled()
  })

  it('vérification impossible (réseau) : on ne verrouille pas, et on le dit', async () => {
    mockEnsure.mockRejectedValue(new Error('Serveur injoignable'))
    const wrapper = mountWorkflow()
    await flushPromises()
    await lockFirstEntry(wrapper)
    expect(mockLockCaptain).not.toHaveBeenCalled()
    expect(mockNotifyError).toHaveBeenCalledWith(expect.stringContaining('Serveur injoignable'))
  })

  it('porte franchie : verrou, enregistrement, puis l’étape — dans cet ordre', async () => {
    mockEnsure.mockResolvedValue(true)
    const wrapper = mountWorkflow()
    await flushPromises()
    await lockFirstEntry(wrapper)

    expect(calls).toEqual(['ensure', 'lockCaptain', 'saveKeywords'])
    expect(emissions(wrapper, 'check-completed')).toBe(1)
  })

  it('déverrouiller retire l’étape, sans repasser par la porte', async () => {
    storeKeywords.value = { articleId: 1, capitaine: 'plombier toulouse', richCaptain: { keyword: 'plombier toulouse', status: 'locked', exploredKeywords: [] } }
    const wrapper = mountWorkflow()
    await flushPromises()
    wrapper.findComponent({ name: 'CaptainRadarList' }).vm.$emit('unlock')
    await flushPromises()
    expect(mockEnsure).not.toHaveBeenCalled()
    expect(emissions(wrapper, 'check-removed')).toBe(1)
  })

  it('enregistrement raté : l’étape n’est pas demandée, et l’écran revient à l’état d’avant', async () => {
    mockEnsure.mockResolvedValue(true)
    saveResult.value = false
    const wrapper = mountWorkflow()
    await flushPromises()
    await lockFirstEntry(wrapper)
    expect(emissions(wrapper, 'check-completed')).toBe(0)
    expect(mockNotifyError).toHaveBeenCalledWith(expect.stringContaining('n’a pas pu être enregistré'))
    expect(calls, 'le verrou local est défait').toEqual(['ensure', 'lockCaptain', 'saveKeywords', 'unlockCaptain'])
  })

  it('article changé pendant l’alarme : rien n’est verrouillé sur le nouvel article', async () => {
    storeKeywords.value = { articleId: 1, capitaine: null }
    mockEnsure.mockImplementation(async () => {
      storeKeywords.value = { articleId: 2, capitaine: null }
      return true
    })
    const wrapper = mountWorkflow()
    await flushPromises()
    await lockFirstEntry(wrapper)
    expect(mockLockCaptain).not.toHaveBeenCalled()
    expect(calls).not.toContain('saveKeywords')
    expect(emissions(wrapper, 'check-completed')).toBe(0)
  })
})
