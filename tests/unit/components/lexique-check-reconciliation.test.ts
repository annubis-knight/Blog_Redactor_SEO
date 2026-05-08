/**
 * Tests pour FR-MOT-CHECK-RECONCILIATION (LexiquePanel).
 *
 * Au mount, le panel doit reconcilier l'etat reel (`article_keywords.lexique`)
 * avec le check workflow stocke en DB (`completed_checks` via le store
 * article-progress) :
 *
 *  - lexique=[] mais check 'moteur:lexique_validated' present → emit
 *    'check-removed' (cas observe article 64).
 *  - lexique=['terme1'] mais check absent → emit 'check-completed'.
 *  - DB et store coherents → no-op (aucun emit lie a la reconciliation).
 *
 * Ces tests reproduisent le bug du dot mensonger sur le Lexique : sans
 * reconciliation, un article avec lexique=[] mais check legacy en DB
 * affiche un dot vert qui ne correspond a rien.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LexiquePanel from '../../../src/components/moteur/LexiquePanel.vue'
import type { LexiqueAnalysisResult } from '../../../shared/types/serp-analysis.types'

// --- Mocks api / streaming / basket (copies du fichier lexique-extraction.test.ts) ---
const mockApiPost = vi.fn()
const mockApiGet = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}))

const iaStreaming = {
  chunks: ref(''),
  isStreaming: ref(false),
  error: ref<string | null>(null),
  result: ref<LexiqueAnalysisResult | null>(null),
  usage: ref(null),
  startStream: vi.fn(),
  abort: vi.fn(),
}
vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => iaStreaming,
}))

const mockKeywordsRef = ref<{
  articleId: number
  capitaine: string
  lieutenants: string[]
  lexique: string[]
} | null>(null)
const mockSaveKeywords = vi.fn().mockResolvedValue(undefined)
const mockSaveDecisions = vi.fn().mockResolvedValue(undefined)
const mockInitEmpty = vi.fn((id: number) => {
  if (!mockKeywordsRef.value) {
    mockKeywordsRef.value = { articleId: id, capitaine: '', lieutenants: [], lexique: [] }
  }
})
const mockAddLexiqueTerm = vi.fn()
const mockRemoveLexiqueTerm = vi.fn()

vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return mockKeywordsRef.value },
    saveKeywords: mockSaveKeywords,
    saveDecisions: mockSaveDecisions,
    initEmpty: mockInitEmpty,
    addLexiqueTerm: mockAddLexiqueTerm,
    removeLexiqueTerm: mockRemoveLexiqueTerm,
  }),
}))

// --- Mock article-progress store (la cle de la reconciliation) ---
const mockGetProgress = vi.fn()
vi.mock('../../../src/stores/article/article-progress.store', () => ({
  useArticleProgressStore: () => ({
    getProgress: mockGetProgress,
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../src/stores/article/moteur-basket.store', () => ({
  useMoteurBasketStore: () => ({
    keywords: [], keywordStrings: [], count: 0, isEmpty: true, bestKeyword: null,
    validatedKeywords: [], articleId: null,
    setArticle: vi.fn(), addKeywords: vi.fn(), removeKeyword: vi.fn(),
    markValidated: vi.fn(), clear: vi.fn(), $reset: vi.fn(),
  }),
}))

function mountComponent(overrides: Record<string, unknown> = {}) {
  return mount(LexiquePanel, {
    props: {
      selectedArticle: {
        id: 64, slug: 'test', keyword: 'seo', title: 'Test', type: 'Cluster',
        painPoint: '', locked: false, source: 'proposed' as const,
      },
      captainKeyword: 'creation site entreprises Toulouse',
      articleLevel: 'intermediaire',
      selectedLieutenants: [],
      isCaptaineLocked: true,
      ...overrides,
    },
    global: {
      stubs: {
        CollapsableSection: {
          props: ['title', 'defaultOpen'],
          template: '<div class="collapsable-stub"><slot /></div>',
        },
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // hydrateFromDb fait un GET /articles/:id/explorations — on retourne vide par defaut
  mockApiGet.mockResolvedValue({ lexique: [] })
  mockApiPost.mockResolvedValue({ obligatoire: [], differenciateur: [], optionnel: [] })
  iaStreaming.chunks.value = ''
  iaStreaming.isStreaming.value = false
  iaStreaming.error.value = null
  iaStreaming.result.value = null
  mockKeywordsRef.value = null
  mockGetProgress.mockReturnValue(null)
})

describe('LexiquePanel — FR-MOT-CHECK-RECONCILIATION', () => {
  it('AC.RECONCILE.1 : lexique=[] mais check present en DB → emit check-removed au mount', async () => {
    // Reproduction exacte article 64 : article_keywords.lexique vide,
    // mais articles.completed_checks contient encore 'moteur:lexique_validated'.
    mockKeywordsRef.value = { articleId: 64, capitaine: 'creation site entreprises Toulouse', lieutenants: [], lexique: [] }
    mockGetProgress.mockReturnValue({
      id: 64, phase: 'proposed',
      completedChecks: ['moteur:lexique_validated', 'moteur:capitaine_locked'],
    })

    const wrapper = mountComponent()
    await nextTick()
    await nextTick()

    const removedEvents = wrapper.emitted('check-removed') ?? []
    expect(removedEvents).toEqual(expect.arrayContaining([['moteur:lexique_validated']]))
    // Et on n'a PAS emis check-completed (puisque lexique est vide).
    const completedEvents = wrapper.emitted('check-completed') ?? []
    const lexiqueCompleted = completedEvents.filter(e => e[0] === 'moteur:lexique_validated')
    expect(lexiqueCompleted).toHaveLength(0)
  })

  it('AC.RECONCILE.4 : lexique=[\'terme1\'] mais check absent → emit check-completed au mount', async () => {
    mockKeywordsRef.value = { articleId: 64, capitaine: 'kw', lieutenants: [], lexique: ['terme1'] }
    mockGetProgress.mockReturnValue({
      id: 64, phase: 'proposed',
      completedChecks: ['moteur:capitaine_locked'], // check lexique absent
    })

    const wrapper = mountComponent()
    await nextTick()
    await nextTick()

    const completedEvents = wrapper.emitted('check-completed') ?? []
    expect(completedEvents).toEqual(expect.arrayContaining([['moteur:lexique_validated']]))
  })

  it('AC.RECONCILE.6 : etat coherent (lexique=[\'t1\'] + check present) → pas d\'emit lie au check au mount', async () => {
    mockKeywordsRef.value = { articleId: 64, capitaine: 'kw', lieutenants: [], lexique: ['t1'] }
    mockGetProgress.mockReturnValue({
      id: 64, phase: 'proposed',
      completedChecks: ['moteur:lexique_validated'],
    })

    const wrapper = mountComponent()
    await nextTick()
    await nextTick()

    // Aucun check-completed ni check-removed pour MOTEUR_LEXIQUE_VALIDATED.
    const completed = (wrapper.emitted('check-completed') ?? []).filter(e => e[0] === 'moteur:lexique_validated')
    const removed = (wrapper.emitted('check-removed') ?? []).filter(e => e[0] === 'moteur:lexique_validated')
    expect(completed).toHaveLength(0)
    expect(removed).toHaveLength(0)
  })

  it('etat coherent (lexique=[] + check absent) → pas d\'emit', async () => {
    mockKeywordsRef.value = { articleId: 64, capitaine: 'kw', lieutenants: [], lexique: [] }
    mockGetProgress.mockReturnValue({
      id: 64, phase: 'proposed', completedChecks: [],
    })

    const wrapper = mountComponent()
    await nextTick()
    await nextTick()

    const completed = (wrapper.emitted('check-completed') ?? []).filter(e => e[0] === 'moteur:lexique_validated')
    const removed = (wrapper.emitted('check-removed') ?? []).filter(e => e[0] === 'moteur:lexique_validated')
    expect(completed).toHaveLength(0)
    expect(removed).toHaveLength(0)
  })

  it('AC.RECONCILE.5 : pas d\'appel direct a removeCheck/addCheck — uniquement des emits', async () => {
    // Le LexiquePanel emit, le parent (MoteurView) appelle removeCheck/addCheck.
    // Le panel ne doit pas appeler les routes /progress/check directement.
    mockKeywordsRef.value = { articleId: 64, capitaine: 'kw', lieutenants: [], lexique: [] }
    mockGetProgress.mockReturnValue({
      id: 64, phase: 'proposed',
      completedChecks: ['moteur:lexique_validated'],
    })

    mountComponent()
    await nextTick()
    await nextTick()

    // Aucun POST vers /progress/check ou /progress/uncheck.
    const progressCalls = mockApiPost.mock.calls.filter(args =>
      typeof args[0] === 'string' && args[0].includes('/progress/'),
    )
    expect(progressCalls).toHaveLength(0)
  })
})
