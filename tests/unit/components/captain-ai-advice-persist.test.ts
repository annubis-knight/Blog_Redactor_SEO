/**
 * FR-CAP-AI-PANEL, FR-MOT-NO-AUTO-ACTION — l'avis expert IA du Capitaine est
 * enregistré, relu à la réouverture, et ne part jamais seul (recette
 * 2026-09-30 : MOT-4, 01-T2, 05 point 2, 06-T2, CAP-1, CAP-7).
 *
 * Avant : choisir un article étudiait d'office son mot-clé suggéré (scan
 * DataForSEO + Google) et redemandait l'avis de chaque candidat, racines
 * comprises (jusqu'à 19 appels payants par clic) ; `saveCaptainExplorationAiPanel`
 * n'était jamais appelé. Aussi : FR-CAP-LOCK-RADIO — « Tout réinitialiser »
 * annonçait « 0 lieutenant(s) archivé(s) » (INFRA-18).
 *
 * Le vrai `useExploredKeywords` tourne ; seuls le réseau et le store sont simulés.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import CaptainPanel from '../../../src/components/moteur/CaptainPanel.vue'

// --- Réseau ---------------------------------------------------------------

const scanCalls: string[] = []
let scanResolvers: Array<() => void> = []
let deferScans = false

function scanResponse(keyword: string) {
  return {
    keyword,
    articleLevel: 'intermediaire',
    kpis: [
      { name: 'volume', rawValue: 1200, color: 'green', label: 'Volume' },
      { name: 'kd', rawValue: 30, color: 'green', label: 'KD' },
    ],
    verdict: { level: 'GO', greenCount: 2, totalKpis: 2, autoNoGo: false },
    fromCache: false,
    cachedAt: null,
    relevanceScore: null,
  }
}

const mockApiPost = vi.fn(async (path: string) => {
  const match = /^\/keywords\/(.+)\/scan$/.exec(path)
  if (!match) throw new Error(`POST inattendu : ${path}`)
  const keyword = decodeURIComponent(match[1]!)
  scanCalls.push(keyword)
  if (deferScans) await new Promise<void>(resolve => scanResolvers.push(resolve))
  return scanResponse(keyword)
})

const streamCalls: string[] = []
let streamOutcome: { errorMessage: string | null } = { errorMessage: null }
const mockApiStream = vi.fn(async (path: string, _body: unknown, callbacks?: { onChunkRaw?: (p: string) => void }) => {
  streamCalls.push(path)
  if (!streamOutcome.errorMessage) callbacks?.onChunkRaw?.('1. Potentiel éditorial — avis simulé.')
  return { result: null, usage: null, errorMessage: streamOutcome.errorMessage, aborted: false }
})

vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...(args as [string])),
  apiStream: (...args: unknown[]) => mockApiStream(...(args as [string, unknown])),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

// --- Store des mots-clés d'article -------------------------------------------

const storeKeywords = ref<Record<string, unknown> | null>(null)
const lockedLieutenants = ref<unknown[]>([])
const mockSaveAiPanel = vi.fn(async () => {})
const mockUpdateAiPanel = vi.fn()
const mockArchive = vi.fn(() => { lockedLieutenants.value = [] })
vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return storeKeywords.value },
    get lockedLieutenants() { return lockedLieutenants.value },
    lockCaptain: vi.fn(),
    unlockCaptain: vi.fn(),
    setRootKeywords: vi.fn(),
    saveKeywords: vi.fn(async () => true),
    saveCaptainExplorationAiPanel: mockSaveAiPanel,
    updateCaptainValidationAiPanel: mockUpdateAiPanel,
    addCaptainPanel: vi.fn(),
    addRootKeywordValidation: vi.fn(),
    archiveLockedLieutenants: mockArchive,
    loadCaptainPaaJudgments: vi.fn(),
    getPaaJudgment: vi.fn(() => null),
    isPaaJudgmentLoading: vi.fn(() => false),
  }),
}))

const mockNotifyInfo = vi.fn()
vi.mock('../../../src/composables/ui/useNotify', () => ({
  useNotify: () => ({ info: mockNotifyInfo, success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const stubs = {
  CaptainRadarList: {
    name: 'CaptainRadarList',
    template: '<div />',
    emits: ['select', 'lock', 'unlock', 'word-toggle', 'recompute-relevance', 'sort-change'],
  },
  CaptainSidePanel: { name: 'CaptainSidePanel', template: '<div />', props: ['parsedMarkdown', 'entry'], emits: ['ai-regenerate', 'switch-variant', 'goto-locked', 'close'] },
  CaptainInput: { name: 'CaptainInput', template: '<div />', props: ['modelValue'], emits: ['submit', 'update:modelValue'] },
  AiPanel: { template: '<div />' },
  AiAdviceMarkdown: { template: '<div />' },
  CaptainLockPanel: { template: '<div />' },
  CaptainRootsSidebar: { template: '<div />' },
  CollapsableSection: { template: '<div><slot /></div>' },
  RadarKeywordCard: { template: '<div />' },
  UnlockLieutenantsModal: { name: 'UnlockLieutenantsModal', template: '<div />', emits: ['keep', 'archive', 'cancel'] },
}

const ARTICLE = { id: 7, slug: 'art', title: 'Prix d’un site', keyword: 'prix site vitrine', painPoint: 'Le lecteur ne sait pas par où commencer.', type: 'intermediaire', locked: false, source: 'proposed' }

function historyEntry(keyword: string, aiPanelMarkdown: string | null) {
  return {
    keyword,
    kpis: [{ name: 'volume', rawValue: 1200 }, { name: 'kd', rawValue: 30 }],
    articleLevel: 'intermediaire',
    rootKeywords: [],
    paaQuestions: [],
    aiPanelMarkdown,
    marketScore: null,
    relevanceScore: null,
  }
}

function mountPanel(radarCards: unknown[] = []) {
  return mount(CaptainPanel, {
    props: { selectedArticle: ARTICLE as never, mode: 'workflow', initialLocked: false, suggestedKeywords: [], radarCards: radarCards as never },
    global: { stubs },
  })
}

async function typeAndAnalyse(wrapper: ReturnType<typeof mountPanel>, keyword: string, clicks = 1) {
  const input = wrapper.findComponent({ name: 'CaptainInput' })
  input.vm.$emit('update:modelValue', keyword)
  await flushPromises()
  for (let i = 0; i < clicks; i++) input.vm.$emit('submit')
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  scanCalls.length = 0
  streamCalls.length = 0
  scanResolvers = []
  deferScans = false
  streamOutcome = { errorMessage: null }
  lockedLieutenants.value = []
  storeKeywords.value = { articleId: ARTICLE.id, capitaine: '', lieutenants: [], lexique: [], rootKeywords: [] }
})

describe('FR-MOT-NO-AUTO-ACTION — choisir un article n’étudie rien et ne redemande aucun avis', () => {
  it('article jamais étudié : le mot-clé proposé attend le clic (aucun scan, aucun avis)', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    expect(scanCalls, 'aucune étude d’office (CAP-1)').toEqual([])
    expect(streamCalls, 'aucun avis IA d’office').toEqual([])
    expect(wrapper.findComponent({ name: 'CaptainInput' }).props('modelValue'), 'le champ est prérempli').toBe(ARTICLE.keyword)
  })

  it('réouverture : les candidats reviennent de la base, avec leur avis enregistré, sans aucun appel (MOT-4)', async () => {
    storeKeywords.value = {
      articleId: ARTICLE.id, capitaine: '', lieutenants: [], lexique: [], rootKeywords: [],
      richCaptain: {
        keyword: '', status: 'suggested', aiPanelMarkdown: null,
        exploredKeywords: [historyEntry('agence web', 'Avis enregistré.'), historyEntry('création site', null)],
      },
      richRootKeywords: [],
    }
    const wrapper = mountPanel()
    await flushPromises()
    expect(scanCalls).toEqual([])
    expect(streamCalls, 'ni l’avis enregistré, ni celui qui manque, ne sont redemandés').toEqual([])

    // L'avis enregistré s'affiche quand on ouvre le candidat.
    wrapper.findComponent({ name: 'CaptainRadarList' }).vm.$emit('select', 0)
    await flushPromises()
    expect(wrapper.findComponent({ name: 'CaptainSidePanel' }).props('parsedMarkdown')).toContain('Avis enregistré.')
  })

  it('réouverture, candidats arrivés de la base après le montage : toujours aucun appel', async () => {
    storeKeywords.value = null
    mountPanel()
    await flushPromises()
    storeKeywords.value = {
      articleId: ARTICLE.id, capitaine: '', lieutenants: [], lexique: [], rootKeywords: [],
      richCaptain: {
        keyword: '', status: 'suggested', aiPanelMarkdown: null,
        exploredKeywords: [historyEntry('agence web', null), historyEntry('création site', null), historyEntry('création site internet', null)],
      },
      richRootKeywords: [],
    }
    await flushPromises()
    expect(scanCalls).toEqual([])
    expect(streamCalls, 'un avis par candidat était repayé à chaque sélection').toEqual([])
  })
})

describe('FR-CAP-AI-PANEL — une étude demandée reçoit son avis, qui est enregistré', () => {
  it('« Analyser » : une étude, puis un avis, enregistré pour l’article (CAP-7)', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    await typeAndAnalyse(wrapper, 'agence web')
    await flushPromises()

    expect(scanCalls).toEqual(['agence web'])
    expect(streamCalls).toEqual(['/keywords/agence%20web/ai-panel'])
    expect(mockSaveAiPanel, 'l’avis est enregistré (PATCH ai-panel)')
      .toHaveBeenCalledWith(ARTICLE.id, 'agence web', '1. Potentiel éditorial — avis simulé.')
  })

  it('un avis en échec n’est pas redemandé seul : « Régénérer » reste le geste', async () => {
    streamOutcome = { errorMessage: 'IA indisponible' }
    const wrapper = mountPanel()
    await flushPromises()
    await typeAndAnalyse(wrapper, 'agence web')
    await flushPromises()
    expect(streamCalls).toHaveLength(1)
    expect(mockSaveAiPanel).not.toHaveBeenCalled()

    // Une autre étude modifie la liste : l'avis en échec ne repart pas.
    await typeAndAnalyse(wrapper, 'création site')
    await flushPromises()
    expect(streamCalls.filter(p => p.includes('agence')), 'pas de relance automatique').toHaveLength(1)

    // « Régénérer » relance explicitement.
    streamOutcome = { errorMessage: null }
    wrapper.findComponent({ name: 'CaptainRadarList' }).vm.$emit('select', 0)
    await flushPromises()
    wrapper.findComponent({ name: 'CaptainSidePanel' }).vm.$emit('ai-regenerate')
    await flushPromises()
    expect(streamCalls.filter(p => p.includes('agence'))).toHaveLength(2)
    expect(mockSaveAiPanel).toHaveBeenCalledWith(ARTICLE.id, 'agence web', expect.any(String))
  })

  it('double-clic sur « Analyser » : une seule étude (recette 05, point 3)', async () => {
    deferScans = true
    const wrapper = mountPanel()
    await flushPromises()
    await typeAndAnalyse(wrapper, 'zqxw vitrine kvj', 2)
    await flushPromises()
    expect(scanCalls).toEqual(['zqxw vitrine kvj'])
    scanResolvers.forEach(resolve => resolve())
    await flushPromises()
    expect(streamCalls, 'et un seul avis').toHaveLength(1)
  })
})

describe('FR-CAP-LOCK-RADIO, FR-INFRA-LIEUTENANT-EXPLORATIONS — « Tout réinitialiser » annonce le bon nombre (INFRA-18)', () => {
  it('2 lieutenants verrouillés archivés → « 2 lieutenant(s) archivé(s) »', async () => {
    storeKeywords.value = {
      articleId: ARTICLE.id, capitaine: 'agence web', lieutenants: ['a', 'b'], lexique: [], rootKeywords: [],
      richCaptain: { keyword: 'agence web', status: 'locked', aiPanelMarkdown: null, exploredKeywords: [historyEntry('agence web', 'Avis.')] },
      richRootKeywords: [],
    }
    lockedLieutenants.value = [{ keyword: 'a' }, { keyword: 'b' }]
    const wrapper = mountPanel()
    await flushPromises()
    wrapper.findComponent({ name: 'CaptainRadarList' }).vm.$emit('unlock')
    await flushPromises()
    wrapper.findComponent({ name: 'UnlockLieutenantsModal' }).vm.$emit('archive')
    await flushPromises()
    expect(mockArchive).toHaveBeenCalled()
    expect(mockNotifyInfo).toHaveBeenCalledWith('2 lieutenant(s) archivé(s)')
  })
})
