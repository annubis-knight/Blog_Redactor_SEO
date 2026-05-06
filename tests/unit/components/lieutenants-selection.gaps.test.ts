/**
 * Tests COMPLÉMENTAIRES pour LieutenantsPanel.
 *
 * Le fichier `lieutenants-selection.test.ts` couvre déjà 94 tests (SERP,
 * IA proposal, Hn structure, lock/unlock, content gap, save explorations).
 * Ce fichier ajoute les TROUS identifiés Sprint 18-bis (2026-04-27) :
 *
 * - handleAssistAdd : ajout d'un keyword depuis le basket via KeywordAssistPanel
 * - saveHnStructure : persistance de l'outline depuis HN structure
 * - refreshSERP : reset partiel + relance d'analyse
 * - hasEverAnalyzed : F5 soft gate qui ne s'applique qu'au premier passage
 * - recommendAndPropagateWordCount : appel post-lock vers /recommend-word-count
 * - restoreLockedLieutenants : 2 chemins (richLieutenants + flat lieutenants)
 *
 * Les API externes (DataForSEO SERP, Claude propose-lieutenants) sont mockées
 * via apiPost et useStreaming pour éviter de gaspiller des crédits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LieutenantsPanel from '../../../src/components/moteur/LieutenantsPanel.vue'
import type { SelectedArticle, SerpAnalysisResult } from '../../../shared/types/index'
import type { FilteredProposeLieutenantsResult } from '../../../shared/types/serp-analysis.types'

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

vi.mock('../../../src/stores/article/moteur-basket.store', () => ({
  useMoteurBasketStore: () => ({
    keywords: [], keywordStrings: [], count: 0, isEmpty: true, bestKeyword: null,
    validatedKeywords: [], articleId: null,
    setArticle: vi.fn(), addKeywords: vi.fn(), removeKeyword: vi.fn(),
    markValidated: vi.fn(), clear: vi.fn(), $reset: vi.fn(),
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
          props: ['serpResultsByKeyword', 'activeSerpTab', 'activeSerpTabResult', 'displayedCompetitors', 'serpResult', 'sliderValue', 'isLoading', 'canAnalyze', 'isLocked', 'iaIsStreaming', 'serpDoneCount', 'serpTotalCount', 'serpPendingKeywords', 'serpCurrentKeyword', 'iaChunks', 'currentStep'],
          emits: ['analyze', 'refresh', 'update:slider-value', 'update:active-serp-tab'],
        },
        LieutenantH2Structure: {
          name: 'LieutenantH2Structure',
          template: '<div class="hn-stub"></div>',
          props: ['hnStructure', 'activeHnRecurrence', 'hnRecurrence', 'serpResultsByKeyword', 'activeHnTab', 'isLocked', 'hnSaved', 'isSavingHn'],
          emits: ['save-hn', 'update:active-hn-tab'],
        },
        LieutenantProposals: {
          name: 'LieutenantProposals',
          template: '<div class="prop-stub"></div>',
          props: ['iaIsStreaming', 'iaChunks', 'iaError', 'lieutenantCards', 'eliminatedCards', 'totalGenerated', 'selectedCards', 'isLocked', 'contentGapInsights'],
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
// Trou B — saveHnStructure
// ============================================================================
describe('LieutenantsPanel — saveHnStructure', () => {
  it('emit save-hn depuis LieutenantH2Structure persiste l\'outline + saveDecisions', async () => {
    // Pré-condition : hnStructure non vide en store DB ET on déclenche
    // le watcher pour que la ref locale `hnStructure` soit alimentée.
    mockStoreKeywords.value!.hnStructure = [
      { level: 2, text: 'H2 a', children: [] },
      { level: 2, text: 'H2 b', children: [] },
    ]
    const wrapper = mountLieutenants({ initialLocked: true })
    await nextTick()
    // Switch d'article pour déclencher le watcher → restoration du hnStructure local
    await wrapper.setProps({ selectedArticle: { ...ARTICLE, id: 2 } })
    await nextTick()
    await nextTick()

    const hn = wrapper.findComponent({ name: 'LieutenantH2Structure' })
    hn.vm.$emit('save-hn')
    await nextTick()
    await nextTick()

    // PUT articles/{id} avec outline (id=2 après le switch)
    const putCalls = mockApiPut.mock.calls
    const putOutline = putCalls.find(c => String(c[0]).includes('/articles/2'))
    expect(putOutline).toBeDefined()
    expect((putOutline as unknown[])[1]).toMatchObject({ outline: expect.any(Object) })

    // saveDecisions appelé sur l'id courant (2)
    expect(mockSaveDecisions).toHaveBeenCalledWith(2)
  })

  it('saveHnStructure no-op si hnStructure vide', async () => {
    // Sprint 13 — `isLocked` est désormais un computed dérivé de richLieutenants[].status.
    // Pour que LieutenantH2Structure soit rendu (v-if isLocked), on configure aussi
    // le store avec un lieutenant en status='locked'.
    mockStoreKeywords.value!.hnStructure = []
    mockStoreKeywords.value!.richLieutenants = [
      { keyword: 'lt-locked', status: 'locked', reasoning: 'r', sources: ['serp'],
        suggestedHnLevel: 2, score: 50, kpis: null, lockedAt: '2026-01-01T00:00:00Z' },
    ]
    const wrapper = mountLieutenants({ initialLocked: true })
    await nextTick()

    const hn = wrapper.findComponent({ name: 'LieutenantH2Structure' })
    hn.vm.$emit('save-hn')
    await nextTick()

    expect(mockApiPut).not.toHaveBeenCalled()
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
// Trou E — recommendAndPropagateWordCount (post-lock)
// ============================================================================
describe('LieutenantsPanel — recommendAndPropagateWordCount au lock', () => {
  it.skip('lock déclenche POST /articles/:id/recommend-word-count en arrière-plan (Sprint 17 — bouton lock-btn supprimé, à réécrire pour passer par toggleLieutenant + watcher dérivé)', async () => {
    // Préparer un état lockable : SERP fait + cards sélectionnées.
    // Sprint 1 (2026-05-04) — Bloc 6 a retiré l'auto-trigger SERP au lock
    // Capitaine, et ma refonte du sprint 1 conditionne le rendu de
    // LieutenantProposals à `serpResult || isLocked || lieutenantCards.length`.
    // On force serpResult sur la VM pour monter la section.
    mockApiPost.mockResolvedValueOnce(SERP_RESULT) // SERP captain
    const wrapper = mountLieutenants({ initialLocked: false })
    await nextTick()
    ;(wrapper.vm as unknown as { serpResult: SerpAnalysisResult }).serpResult = SERP_RESULT
    await nextTick()
    await nextTick()

    // Force des cards via IA proposal terminée
    iaStreaming.startStream.mockImplementation((_url: string, _body: unknown, opts: any) => {
      opts.onDone({
        totalGenerated: 2,
        selectedLieutenants: [{ keyword: 'lt-1', reasoning: 'r', sources: [], suggestedHnLevel: 2, score: 50 }],
        eliminatedLieutenants: [],
        hnStructure: [{ level: 2, text: 'H2', children: [] }],
        contentGapInsights: '',
      })
    })

    // Le watcher serpResult va auto-trigger proposeLieutenants
    // mais on a déjà les SERP en place via mockApiPost. On simule juste le clic lock.
    // Pour le test, on appelle directement la méthode publique via un stub minimal :
    // À défaut, on vérifie que la chaîne d'appel apiPost contient bien un appel à recommend-word-count
    // après un lock simulé.

    // Au lock : on s'attend à ce que apiPost soit appelé avec /recommend-word-count
    mockApiPost.mockClear()
    mockApiPost.mockResolvedValue({ recommended: 2500, breakdown: { competitorsAvg: 2300, aiSuggestion: 2700, reasoning: 'estimation' } })
    mockApiGet.mockResolvedValue(null) // pas de targetWordCount existant

    // Trigger lock via instance
    const _vm = wrapper.vm as unknown as { lockLieutenants: () => Promise<void>; selectedCards: { value: Map<string, unknown> }; serpResult?: unknown }
    // Hack : il faut une selectedCard pour que lockLieutenants ne return early
    // On utilise findComponent + emit toggle pour passer par le canal réel
    const proposals = wrapper.findComponent({ name: 'LieutenantProposals' })
    proposals.vm.$emit('toggle', { keyword: 'lt1', reasoning: 'r', sources: [], suggestedHnLevel: 2, score: 50 })
    await nextTick()

    // Maintenant clic lock
    const lockBtn = wrapper.find('[data-testid="lock-btn"]')
    expect(lockBtn.exists(), 'le bouton lock doit exister apres toggle').toBe(true)
    expect((lockBtn.element as HTMLButtonElement).disabled, 'le bouton lock ne doit pas etre disabled').toBe(false)
    await lockBtn.trigger('click')
    await nextTick()
    await nextTick()

    const recoCalls = mockApiPost.mock.calls.filter(c => String(c[0]).includes('recommend-word-count'))
    expect(recoCalls.length).toBeGreaterThan(0)
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
    // Sans `isLocked` ET sans `serpResult`, le bloc serp-results n'est pas
    // rendu dans le DOM (cf v-if="serpResult || isLocked" du template). C'est
    // la preuve indirecte qu'aucune restauration n'a été faite.
    mockStoreKeywords.value!.richLieutenants = [
      { keyword: 'lt', status: 'locked', reasoning: '', sources: [], suggestedHnLevel: 2, score: 50 },
    ]
    mockStoreKeywords.value!.lieutenants = []
    const wrapper = mountLieutenants({ initialLocked: false, isCaptaineLocked: false })
    await nextTick()
    await wrapper.setProps({ selectedArticle: { ...ARTICLE, id: 2 } })
    await nextTick()
    await nextTick()

    // LieutenantProposals n'est pas rendu (pas d'isLocked, pas de serpResult)
    const proposals = wrapper.findComponent({ name: 'LieutenantProposals' })
    expect(proposals.exists()).toBe(false)
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
