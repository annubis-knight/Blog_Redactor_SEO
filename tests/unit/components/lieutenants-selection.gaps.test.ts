/**
 * Tests COMPLÉMENTAIRES pour LieutenantsPanel.
 *
 * Le fichier `lieutenants-selection.test.ts` couvre déjà 94 tests (SERP,
 * IA proposal, Hn structure, lock/unlock, content gap, save explorations).
 * Ce fichier ajoute les TROUS identifiés Sprint 18-bis (2026-04-27) :
 *
 * - handleAssistAdd : ajout d'un keyword depuis le basket via KeywordAssistPanel
 * - verrouillage du premier lieutenant (FR-HN-TAB, M7) : décisions enregistrées,
 *   mais ni structure Hn, ni sommaire (outline), ni longueur conseillée — ils
 *   partent à la validation de la structure (onglet Structure, `useStructureHn`)
 * - refreshSERP : reset partiel + relance d'analyse
 * - hasEverAnalyzed : F5 soft gate qui ne s'applique qu'au premier passage
 * - restoreLockedLieutenants : 2 chemins (richLieutenants + flat lieutenants)
 *
 * Les API externes (DataForSEO SERP, Claude propose-lieutenants) sont mockées
 * via apiPost et useStreaming pour éviter de gaspiller des crédits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LieutenantsPanel from '../../../src/components/moteur/LieutenantsPanel.vue'
import type { SelectedArticle, SerpAnalysisResult } from '../../../shared/types/index'
import type { FilteredProposeLieutenantsResult } from '../../../shared/types/serp-analysis.types'


vi.mock('../../../src/stores/article/radar-exploration.store', () => ({
  useRadarExplorationStore: () => ({
    entry: null, articleId: null, isLoading: false, isMutating: false,
    generatedKeywords: [], scanCards: [], hasScanResult: false, scanResult: null,
    setArticle: vi.fn(), hydrate: vi.fn(), addKeyword: vi.fn(),
    removeKeyword: vi.fn(), addKeywordsBatch: vi.fn(), setScanResultLocal: vi.fn(),
    $reset: vi.fn(),
  }),
}))

// --- Mock api.service ---
const mockApiPost = vi.fn()
const mockApiGet = vi.fn()
const mockApiPut = vi.fn().mockResolvedValue(undefined)
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
}))

// --- Mock useStreaming ---
const iaStreaming = {
  chunks: ref(''),
  isStreaming: ref(false),
  error: ref<string | null>(null),
  result: ref<FilteredProposeLieutenantsResult | null>(null),
  usage: ref(null),
  startStream: vi.fn(),
  abort: vi.fn(),
}
vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => iaStreaming,
}))

// --- Mock article-keywords store ---
const mockStoreKeywords = ref<{
  articleId: number
  capitaine: string
  lieutenants: string[]
  lexique: string[]
  rootKeywords: string[]
  richLieutenants?: any[]
  hnStructure?: unknown[]
} | null>({
  articleId: 1,
  capitaine: 'seo local',
  lieutenants: [],
  lexique: [],
  rootKeywords: [],
  richLieutenants: [],
  hnStructure: [],
})
const mockSaveDecisions = vi.fn().mockResolvedValue(undefined)
const mockSetRichLieutenants = vi.fn()
const mockSaveRichLieutenantProposals = vi.fn()
const mockSaveLieutenantExplorationEntries = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return mockStoreKeywords.value },
    saveDecisions: mockSaveDecisions,
    setRichLieutenants: mockSetRichLieutenants,
    saveRichLieutenantProposals: mockSaveRichLieutenantProposals,
    saveLieutenantExplorationEntries: mockSaveLieutenantExplorationEntries,
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockAddMessage = vi.fn()
vi.mock('../../../src/stores/ui/cost-log.store', () => ({
  useCostLogStore: () => ({
    entries: [], isCollapsed: true, totalCost: 0, entryCount: 0,
    addEntry: vi.fn(),
    addMessage: mockAddMessage,
    removeEntry: vi.fn(),
    clearAll: vi.fn(),
    toggleCollapsed: vi.fn(),
  }),
}))


const ARTICLE: SelectedArticle = {
  id: 1, slug: 'test-article', title: 'Test Article',
  keyword: 'seo local', painPoint: 'pain',
  type: 'Cluster', locked: false, source: 'proposed',
} as never as SelectedArticle

const SERP_RESULT: SerpAnalysisResult = {
  keyword: 'seo local',
  articleLevel: 'intermediaire',
  competitors: [
    { position: 1, title: 'P1', url: 'https://a.com', domain: 'a.com', headings: [{ level: 2, text: 'H' }], textContent: 't' },
  ],
  paaQuestions: [{ question: 'Q?', answer: 'A' }],
  maxScraped: 1,
  cachedAt: null,
  fromCache: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  iaStreaming.chunks.value = ''
  iaStreaming.isStreaming.value = false
  iaStreaming.error.value = null
  iaStreaming.result.value = null
  mockStoreKeywords.value = {
    articleId: 1,
    capitaine: 'seo local',
    lieutenants: [],
    lexique: [],
    rootKeywords: [],
    richLieutenants: [],
    hnStructure: [],
  }
  // SERP par défaut OK
  mockApiPost.mockResolvedValue(SERP_RESULT)
  mockApiGet.mockResolvedValue(null)
})

const baseProps = {
  selectedArticle: ARTICLE,
  mode: 'workflow' as const,
  captainKeyword: 'seo local',
  articleLevel: 'intermediaire' as const,
  isCaptaineLocked: true,
  wordGroups: [],
  rootKeywords: [],
  initialLocked: false,
  cocoonSlug: 'cocon-test',
}

function mountLieutenants(propsOverride: Partial<typeof baseProps> = {}) {
  return mount(LieutenantsPanel, {
    props: { ...baseProps, ...propsOverride },
    global: {
      stubs: {
        // Stubs déclarant les props pour pouvoir les inspecter via .props('xxx')
        LieutenantSerpAnalysis: {
          name: 'LieutenantSerpAnalysis',
          template: '<div class="serp-stub"></div>',
          props: ['serpResultsByKeyword', 'activeSerpTab', 'activeSerpTabResult', 'displayedCompetitors', 'serpResult', 'sliderValue', 'isLoading', 'canAnalyze', 'iaIsStreaming', 'serpDoneCount', 'serpTotalCount', 'serpPendingKeywords', 'serpCurrentKeyword', 'iaChunks', 'currentStep'],
          emits: ['analyze', 'refresh', 'update:slider-value', 'update:active-serp-tab'],
        },
        LieutenantProposals: {
          name: 'LieutenantProposals',
          template: '<div class="prop-stub"></div>',
          props: ['iaIsStreaming', 'iaChunks', 'iaError', 'lieutenantCards', 'eliminatedCards', 'totalGenerated', 'selectedCards', 'contentGapInsights'],
          emits: ['toggle', 'retry'],
        },
        KeywordAssistPanel: {
          name: 'KeywordAssistPanel',
          template: '<button class="assist-add" @click="$emit(\'add\', \'kw-from-basket\')">Add</button>',
          props: ['context', 'excludeKeywords'],
          emits: ['add'],
        },
        CollapsableSection: { template: '<div><slot /></div>' },
      },
    },
  })
}

// ============================================================================
// Trou A — handleAssistAdd : ajout depuis basket via KeywordAssistPanel
// ============================================================================
describe('LieutenantsPanel — handleAssistAdd (basket)', () => {
  it('emit add depuis KeywordAssistPanel ajoute un lieutenant card', async () => {
    const wrapper = mountLieutenants()
    // Le stub émet 'add' avec 'kw-from-basket' au clic
    await wrapper.find('.assist-add').trigger('click')
    await nextTick()

    // Vérifie que la card a bien été propagée jusqu'à LieutenantProposals
    const proposals = wrapper.findComponent({ name: 'LieutenantProposals' })
    const cards = proposals.props('lieutenantCards') as { keyword: string }[]
    expect(cards.length).toBe(1)
    expect(cards[0]!.keyword).toBe('kw-from-basket')
  })

  it('handleAssistAdd ne duplique pas un keyword déjà présent', async () => {
    const wrapper = mountLieutenants()
    // Premier ajout
    await wrapper.find('.assist-add').trigger('click')
    await nextTick()
    // Second clic même keyword
    await wrapper.find('.assist-add').trigger('click')
    await nextTick()

    // Récupère le composant LieutenantProposals stubbed pour lire son prop
    const proposals = wrapper.findComponent({ name: 'LieutenantProposals' })
    const cards = proposals.props('lieutenantCards') as { keyword: string }[]
    expect(cards.length).toBe(1)
    expect(cards[0]!.keyword).toBe('kw-from-basket')
  })

  it('handleAssistAdd respecte la casse mais évite les doublons insensibles à la casse', async () => {
    const wrapper = mountLieutenants()
    // Premier ajout via le stub avec 'kw-from-basket'
    await wrapper.find('.assist-add').trigger('click')
    await nextTick()
    // Second ajout : on simule un autre stub qui émet la même clé en majuscules
    const assist = wrapper.findComponent({ name: 'KeywordAssistPanel' })
    assist.vm.$emit('add', 'KW-FROM-BASKET')
    await nextTick()

    const cards = wrapper.findComponent({ name: 'LieutenantProposals' }).props('lieutenantCards') as { keyword: string }[]
    expect(cards.length).toBe(1) // dédup case-insensitive
  })
})

// ============================================================================
// Trou B — verrouillage du premier lieutenant : plus de structure (FR-HN-TAB, M7)
// ============================================================================
// Avant C6, la transition « aucun → un lieutenant verrouillé » écrivait aussi la
// structure Hn, le sommaire (`PUT /articles/:id { outline }`) et la longueur
// conseillée (`POST /articles/:id/recommend-word-count`). Tout cela part
// désormais à la validation de la structure (onglet Structure, useStructureHn).
// Les anciens tests `saveHnStructure` (émission `save-hn`) et
// `recommendAndPropagateWordCount au lock` n'ont plus d'objet ici.
describe('LieutenantsPanel — verrouillage sans structure (FR-HN-TAB, M7)', () => {
  it('verrouiller le premier lieutenant enregistre les décisions, sans structure, sommaire ni longueur conseillée', async () => {
    const storedStructure = [{ level: 2, text: 'H2 déjà validé', children: [] }]
    mockStoreKeywords.value!.hnStructure = storedStructure
    const wrapper = mountLieutenants()
    await flushPromises()
    expect(mockSaveDecisions).not.toHaveBeenCalled()

    // Transition « aucun → un lieutenant verrouillé » (checkbox = lock immédiat).
    mockStoreKeywords.value = {
      ...mockStoreKeywords.value!,
      richLieutenants: [
        { keyword: 'lt-locked', status: 'locked', reasoning: 'r', sources: ['serp'], suggestedHnLevel: 2, score: 50, kpis: null },
      ],
      lieutenants: ['lt-locked'],
    }
    await flushPromises()

    expect(mockSaveDecisions).toHaveBeenCalledWith(1)
    expect(wrapper.emitted('lieutenants-updated')).toBeTruthy()
    // Ni sommaire écrit…
    expect(mockApiPut).not.toHaveBeenCalled()
    // … ni longueur conseillée demandée…
    expect(mockApiPost.mock.calls.filter(c => String(c[0]).includes('recommend-word-count'))).toHaveLength(0)
    // … ni structure écrasée (vidée) dans le store avant l'enregistrement.
    expect(mockStoreKeywords.value!.hnStructure).toEqual(storedStructure)
  })

  it('le panneau ne rend plus de composant de structure Hn', async () => {
    mockStoreKeywords.value!.richLieutenants = [
      { keyword: 'lt-locked', status: 'locked', reasoning: 'r', sources: ['serp'], suggestedHnLevel: 2, score: 50, kpis: null },
    ]
    mockStoreKeywords.value!.lieutenants = ['lt-locked']
    mockStoreKeywords.value!.hnStructure = [{ level: 2, text: 'H2 a', children: [] }]
    const wrapper = mountLieutenants({ initialLocked: true })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'LieutenantProposals' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'LieutenantH2Structure' }).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('H2 a')
  })
})

// ============================================================================
// Trou C — refreshSERP
// ============================================================================
describe('LieutenantsPanel — refreshSERP', () => {
  it('emit refresh depuis LieutenantSerpAnalysis reset le state + relance analyzeSERP', async () => {
    const wrapper = mountLieutenants()
    await nextTick()

    // Première analyse pour avoir un état non-vide
    mockApiPost.mockClear()
    const serp = wrapper.findComponent({ name: 'LieutenantSerpAnalysis' })

    serp.vm.$emit('analyze')
    await nextTick()
    await nextTick()

    // Maintenant refresh
    mockApiPost.mockClear()
    serp.vm.$emit('refresh')
    await nextTick()
    await nextTick()

    // Une nouvelle requête SERP a été lancée
    expect(mockApiPost).toHaveBeenCalled()
    const serpCalls = mockApiPost.mock.calls.filter(c => String(c[0]).includes('/serp/analyze'))
    expect(serpCalls.length).toBeGreaterThan(0)
  })

  it('refreshSERP émet lieutenants-updated avec liste vide', async () => {
    const wrapper = mountLieutenants()
    await nextTick()

    const serp = wrapper.findComponent({ name: 'LieutenantSerpAnalysis' })
    serp.vm.$emit('refresh')
    await nextTick()

    // L'événement lieutenants-updated est émis avec []
    const events = wrapper.emitted('lieutenants-updated') as string[][][] | undefined
    expect(events).toBeTruthy()
    // Le dernier call doit être un tableau vide
    const last = events![events!.length - 1]!
    expect(last[0]).toEqual([])
  })
})

// ============================================================================
// Trou D — hasEverAnalyzed (F5 soft gate)
// ============================================================================
describe('LieutenantsPanel — hasEverAnalyzed (F5 soft gate)', () => {
  it('soft gate visible : !isCaptaineLocked + 0 lieutenants en DB', () => {
    mockStoreKeywords.value!.richLieutenants = []
    const wrapper = mountLieutenants({ isCaptaineLocked: false })
    expect(wrapper.find('.soft-gate-message').exists()).toBe(true)
  })

  it('soft gate MASQUÉ : isCaptaineLocked=false MAIS richLieutenants déjà présents', () => {
    // F5 : si l'IA a déjà généré des propositions, on garde l'accès même
    // après un déverrouillage du Capitaine.
    mockStoreKeywords.value!.richLieutenants = [
      { keyword: 'lt1', status: 'suggested' },
    ]
    const wrapper = mountLieutenants({ isCaptaineLocked: false })
    expect(wrapper.find('.soft-gate-message').exists()).toBe(false)
  })

  it('soft gate MASQUÉ : isCaptaineLocked=true (cas standard)', () => {
    mockStoreKeywords.value!.richLieutenants = []
    const wrapper = mountLieutenants({ isCaptaineLocked: true })
    expect(wrapper.find('.soft-gate-message').exists()).toBe(false)
  })
})

// ============================================================================
// Trou F — restoreLockedLieutenants
// ============================================================================
describe('LieutenantsPanel — restoreLockedLieutenants', () => {
  /**
   * Note : `restoreLockedLieutenants` est appelé via :
   * 1. Le watcher `selectedArticle.id` quand `initialLocked === true` ET que l'id change
   *    (pas `immediate: true` → pas déclenché au mount initial)
   * 2. Le watcher `keywords.lieutenants` quand `isLocked === true` et qu'une liste arrive
   * On simule donc un changement d'article post-mount pour déclencher la restoration.
   */
  it('chemin richLieutenants : sépare locked / suggested / eliminated', async () => {
    mockStoreKeywords.value!.richLieutenants = [
      { keyword: 'lt-locked', status: 'locked', reasoning: 'r1', sources: [], suggestedHnLevel: 2, score: 70 },
      { keyword: 'lt-sugg', status: 'suggested', reasoning: 'r2', sources: [], suggestedHnLevel: 3, score: 50 },
      { keyword: 'lt-elim', status: 'eliminated', reasoning: 'r3', sources: [], suggestedHnLevel: 2, score: 20 },
    ]
    const wrapper = mountLieutenants({ initialLocked: true })
    await nextTick()

    // Force le watcher selectedArticle.id en changeant l'id (= cas typique de switch d'article)
    await wrapper.setProps({ selectedArticle: { ...ARTICLE, id: 2 } })
    await nextTick()
    await nextTick()

    const proposals = wrapper.findComponent({ name: 'LieutenantProposals' })
    const cards = proposals.props('lieutenantCards') as { keyword: string }[]
    const eliminated = proposals.props('eliminatedCards') as { keyword: string }[]
    const selected = proposals.props('selectedCards') as Map<string, unknown>

    expect(cards.length).toBe(2)
    expect(cards.map(c => c.keyword).sort()).toEqual(['lt-locked', 'lt-sugg'])
    expect(eliminated.length).toBe(1)
    expect(eliminated[0]!.keyword).toBe('lt-elim')
    expect(selected.size).toBe(1)
    expect(selected.has('lt-locked')).toBe(true)
  })

  it('chemin fallback flat lieutenants[] (backward compat)', async () => {
    mockStoreKeywords.value!.richLieutenants = []
    mockStoreKeywords.value!.lieutenants = ['legacy-lt-1', 'legacy-lt-2']
    const wrapper = mountLieutenants({ initialLocked: true })
    await nextTick()

    // Switch d'article pour déclencher le watcher
    await wrapper.setProps({ selectedArticle: { ...ARTICLE, id: 2 } })
    await nextTick()
    await nextTick()

    const proposals = wrapper.findComponent({ name: 'LieutenantProposals' })
    const cards = proposals.props('lieutenantCards') as { keyword: string }[]
    expect(cards.length).toBe(2)
    expect(cards.map(c => c.keyword).sort()).toEqual(['legacy-lt-1', 'legacy-lt-2'])
  })

  it('aucune restauration si initialLocked=false (LieutenantProposals non rendu)', async () => {
    // 2026-05-08 — Inversion semantique : la restauration des cards depuis le
    // store est maintenant inconditionnelle (plus de garde `isLocked` /
    // `initialLocked`). Si la DB contient des richLieutenants, ils sont
    // restaures automatiquement → LieutenantProposals est rendu.
    // C'est coherent avec la suppression du concept "panel locked" :
    // l'utilisateur voit toujours ses lieutenants existants.
    mockStoreKeywords.value!.richLieutenants = [
      { keyword: 'lt', status: 'locked', reasoning: '', sources: [], suggestedHnLevel: 2, score: 50 },
    ]
    mockStoreKeywords.value!.lieutenants = ['lt']
    const wrapper = mountLieutenants({ initialLocked: false, isCaptaineLocked: false })
    await nextTick()
    await wrapper.setProps({ selectedArticle: { ...ARTICLE, id: 2 } })
    await nextTick()
    await nextTick()

    // LieutenantProposals EST rendu maintenant (la restauration s'est faite).
    const proposals = wrapper.findComponent({ name: 'LieutenantProposals' })
    expect(proposals.exists()).toBe(true)
  })
})

// ============================================================================
// Trou G — Auto-trigger SERP au lock Capitaine + skip si déjà locked
// ============================================================================
describe('LieutenantsPanel — déclenchement SERP', () => {
  // Bloc 6 (mai 2026) — l'auto-trigger SERP au lock Capitaine a été
  // retiré. L'utilisateur lance désormais le SERP manuellement via le
  // bouton "Analyser SERP". Ce test vérifie qu'aucun appel /serp/analyze
  // n'est émis automatiquement même quand toutes les conditions
  // anciennement requises sont remplies.
  it('SERP NON auto-déclenché au mount même si captainLocked + captainKeyword (Bloc 6)', async () => {
    mockApiPost.mockClear()
    const wrapper = mountLieutenants({ isCaptaineLocked: true })
    await nextTick()
    await nextTick()

    const serpCalls = mockApiPost.mock.calls.filter(c => String(c[0]).includes('/serp/analyze'))
    expect(serpCalls.length).toBe(0)
    void wrapper
  })

  it('SERP NON auto-déclenché si lieutenants déjà locked (initialLocked=true)', async () => {
    mockApiPost.mockClear()
    const wrapper = mountLieutenants({ isCaptaineLocked: true, initialLocked: true })
    await nextTick()
    await nextTick()

    const serpCalls = mockApiPost.mock.calls.filter(c => String(c[0]).includes('/serp/analyze'))
    expect(serpCalls.length).toBe(0)
    void wrapper
  })

  it('SERP NON auto-déclenché si captainKeyword null', async () => {
    mockApiPost.mockClear()
    const wrapper = mountLieutenants({ isCaptaineLocked: true, captainKeyword: null })
    await nextTick()

    const serpCalls = mockApiPost.mock.calls.filter(c => String(c[0]).includes('/serp/analyze'))
    expect(serpCalls.length).toBe(0)
    void wrapper
  })
})
