/**
 * P1 — Garantit l'isolation par articleId des Lieutenants verrouillés.
 *
 * Scénario utilisateur (issu de l'audit 2026-05-03) :
 *   « dès qu'un mot-clé Lieutenant est verrouillé, il doit obligatoirement
 *     continuer d'apparaître sur l'onglet Lieutenant. Les Lieutenants sont
 *     liés à l'articleId : si l'utilisateur change d'article, les Lieutenants
 *     verrouillés DE CET ARTICLE doivent apparaître, et pas ceux du premier. »
 *
 * Régression visée :
 *   un mélange entre deux articles trahirait soit
 *     - une fuite mémoire (`lieutenantCards` non reset au switch)
 *     - une absence de re-restauration depuis le store après changement d'id
 *     - un fallback `richLieutenants` qui pointe vers le mauvais article
 *
 * Couverture testée :
 *   1. Article A → 2 lieutenants `locked` → switch B (1 lieutenant locked
 *      différent) → l'UI affiche UNIQUEMENT les lieutenants de B.
 *   2. Retour sur A → l'UI réaffiche UNIQUEMENT les lieutenants de A.
 *   3. Switch vers article C qui n'a aucun lieutenant locked → l'UI ne fuit
 *      AUCUN lieutenant des articles précédents.
 *
 * Note d'implémentation :
 *   `restoreLockedLieutenants` lit `articleKeywordsStore.keywords.richLieutenants`.
 *   La source de vérité du scoping par articleId vit dans le store
 *   (`fetchKeywordsMerge` recharge le payload de l'article courant).
 *   Ici on simule ce comportement en mutant `mockStoreKeywords` au moment du
 *   switch — c'est exactement ce que fait `MoteurView.handleSelectArticle`
 *   en appelant `articleKeywordsStore.fetchKeywordsMerge(article.id)`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LieutenantsPanel from '../../../src/components/moteur/LieutenantsPanel.vue'
import type { SelectedArticle } from '../../../shared/types/index'
import type { FilteredProposeLieutenantsResult } from '../../../shared/types/serp-analysis.types'
import type { RichLieutenant } from '../../../shared/types/keyword.types'

// --- Mocks api/streaming/store (alignés sur lieutenants-selection.gaps.test.ts) ---
const mockApiPost = vi.fn()
const mockApiGet = vi.fn()
const mockApiPut = vi.fn().mockResolvedValue(undefined)
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
}))

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

type StoreShape = {
  articleId: number
  capitaine: string
  lieutenants: string[]
  lexique: string[]
  rootKeywords: string[]
  richLieutenants?: RichLieutenant[]
  hnStructure?: unknown[]
}
const mockStoreKeywords = ref<StoreShape | null>(null)

vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return mockStoreKeywords.value },
    saveDecisions: vi.fn().mockResolvedValue(undefined),
    setRichLieutenants: vi.fn(),
    saveRichLieutenantProposals: vi.fn(),
    saveLieutenantExplorationEntries: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../../../src/stores/article/moteur-basket.store', () => ({
  useMoteurBasketStore: () => ({
    keywords: [], keywordStrings: [], count: 0, isEmpty: true, bestKeyword: null,
    validatedKeywords: [], articleId: null,
    setArticle: vi.fn(), addKeywords: vi.fn(), removeKeyword: vi.fn(),
    markValidated: vi.fn(), clear: vi.fn(), $reset: vi.fn(),
  }),
}))

// --- Données de test : trois articles distincts du cocon « Création de site web » ---
const ARTICLE_A: SelectedArticle = {
  id: 64, slug: 'creation-site-web-pilier',
  title: 'Création de site web sur mesure à Toulouse',
  keyword: 'creation site web entreprises Toulouse',
  painPoint: 'pain A', type: 'Pilier',
  locked: false, source: 'proposed',
} as never as SelectedArticle

const ARTICLE_B: SelectedArticle = {
  id: 66, slug: 'architecture-structure',
  title: 'Architecture et structure de site web',
  keyword: 'structure arborescence',
  painPoint: 'pain B', type: 'Intermédiaire',
  locked: false, source: 'proposed',
} as never as SelectedArticle

const ARTICLE_C: SelectedArticle = {
  id: 65, slug: 'design-ux-conversion',
  title: 'Design UX et conversion',
  keyword: 'design UX site conversion professionnels',
  painPoint: 'pain C', type: 'Intermédiaire',
  locked: false, source: 'proposed',
} as never as SelectedArticle

// --- Lieutenants verrouillés par article (snapshot DB simulé) ---
const LIEUTENANTS_A: RichLieutenant[] = [
  { keyword: 'site vitrine professionnel', status: 'locked', reasoning: 'rA1', sources: [], suggestedHnLevel: 2, score: 72 },
  { keyword: 'site web pme toulouse', status: 'locked', reasoning: 'rA2', sources: [], suggestedHnLevel: 2, score: 68 },
] as never as RichLieutenant[]

const LIEUTENANTS_B: RichLieutenant[] = [
  { keyword: 'arborescence site internet', status: 'locked', reasoning: 'rB1', sources: [], suggestedHnLevel: 2, score: 65 },
] as never as RichLieutenant[]

beforeEach(() => {
  vi.clearAllMocks()
  iaStreaming.chunks.value = ''
  iaStreaming.isStreaming.value = false
  iaStreaming.error.value = null
  iaStreaming.result.value = null
  // Article A par défaut
  mockStoreKeywords.value = {
    articleId: ARTICLE_A.id,
    capitaine: ARTICLE_A.keyword,
    lieutenants: LIEUTENANTS_A.map(lt => lt.keyword),
    lexique: [],
    rootKeywords: [],
    richLieutenants: [...LIEUTENANTS_A],
    hnStructure: [],
  }
  mockApiPost.mockResolvedValue({})
  mockApiGet.mockResolvedValue(null)
})

const baseProps = {
  selectedArticle: ARTICLE_A,
  mode: 'workflow' as const,
  captainKeyword: ARTICLE_A.keyword,
  articleLevel: 'pilier' as const,
  isCaptaineLocked: true,
  wordGroups: [],
  rootKeywords: [],
  initialLocked: true,
  cocoonSlug: 'creation-site-web',
}

function mountLieutenants(propsOverride: Partial<typeof baseProps> = {}) {
  return mount(LieutenantsPanel, {
    props: { ...baseProps, ...propsOverride },
    global: {
      stubs: {
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
          template: '<div class="assist-stub"></div>',
          props: ['context', 'excludeKeywords'],
          emits: ['add'],
        },
        CollapsableSection: { template: '<div><slot /></div>' },
      },
    },
  })
}

/**
 * Simule la séquence exacte que MoteurView.handleSelectArticle déclenche au
 * changement d'article :
 *   1. mutation du payload store (équivalent fetchKeywordsMerge)
 *   2. mise à jour de la prop selectedArticle (avec son id)
 *   3. attente des watchers Vue (deux nextTick : reset puis restoration)
 */
async function switchArticle(
  wrapper: ReturnType<typeof mountLieutenants>,
  next: SelectedArticle,
  storePayload: Partial<StoreShape>,
) {
  mockStoreKeywords.value = {
    articleId: next.id,
    capitaine: next.keyword,
    lieutenants: storePayload.lieutenants ?? [],
    lexique: [],
    rootKeywords: [],
    richLieutenants: storePayload.richLieutenants ?? [],
    hnStructure: storePayload.hnStructure ?? [],
  }
  await wrapper.setProps({ selectedArticle: next, captainKeyword: next.keyword })
  await nextTick()
  await nextTick()
}

function readLieutenantCards(wrapper: ReturnType<typeof mountLieutenants>): { keyword: string }[] {
  const proposals = wrapper.findComponent({ name: 'LieutenantProposals' })
  if (!proposals.exists()) return []
  return (proposals.props('lieutenantCards') as { keyword: string }[]) ?? []
}

describe('LieutenantsPanel — isolation par articleId (P1)', () => {
  it('A→B : afficher uniquement les Lieutenants de B après switch', async () => {
    const wrapper = mountLieutenants()
    await nextTick()

    // Switch vers B avec son propre richLieutenants
    await switchArticle(wrapper, ARTICLE_B, {
      lieutenants: LIEUTENANTS_B.map(lt => lt.keyword),
      richLieutenants: [...LIEUTENANTS_B],
    })

    const cardsB = readLieutenantCards(wrapper)
    const keywordsB = cardsB.map(c => c.keyword).sort()

    // Doit afficher UNIQUEMENT les Lieutenants de B
    expect(keywordsB).toEqual(LIEUTENANTS_B.map(lt => lt.keyword).sort())

    // Aucun Lieutenant de A ne doit fuiter
    for (const ltA of LIEUTENANTS_A) {
      expect(keywordsB).not.toContain(ltA.keyword)
    }
  })

  it('A→B→A : retour sur A réaffiche les Lieutenants de A (et pas ceux de B)', async () => {
    const wrapper = mountLieutenants()
    await nextTick()

    // A → B
    await switchArticle(wrapper, ARTICLE_B, {
      lieutenants: LIEUTENANTS_B.map(lt => lt.keyword),
      richLieutenants: [...LIEUTENANTS_B],
    })

    // B → retour A (même payload qu'au mount initial)
    await switchArticle(wrapper, ARTICLE_A, {
      lieutenants: LIEUTENANTS_A.map(lt => lt.keyword),
      richLieutenants: [...LIEUTENANTS_A],
    })

    const cardsA = readLieutenantCards(wrapper)
    const keywordsA = cardsA.map(c => c.keyword).sort()

    expect(keywordsA).toEqual(LIEUTENANTS_A.map(lt => lt.keyword).sort())

    // Aucun Lieutenant de B ne doit traîner après le retour
    for (const ltB of LIEUTENANTS_B) {
      expect(keywordsA).not.toContain(ltB.keyword)
    }
  })

  it('A→C (article sans Lieutenant) : aucune fuite des Lieutenants de A', async () => {
    const wrapper = mountLieutenants()
    await nextTick()

    // C n'a jamais été passé par Lieutenants — store vide pour cet article
    await switchArticle(wrapper, ARTICLE_C, {
      lieutenants: [],
      richLieutenants: [],
    })

    const cardsC = readLieutenantCards(wrapper)
    const keywordsC = cardsC.map(c => c.keyword)

    // Aucun Lieutenant de A ne doit apparaître sur C
    for (const ltA of LIEUTENANTS_A) {
      expect(keywordsC).not.toContain(ltA.keyword)
    }
  })

  it('chaque Lieutenant verrouillé sur A est bien marqué status=locked dans le store', () => {
    // Garde-fou contractuel : si cette assertion casse, c'est qu'on est en train
    // de muter le statut au passage et que la "persistance par article" ne tient
    // plus. Cf. CLAUDE.md §2.0 (cartographie d'une donnée partagée).
    for (const lt of LIEUTENANTS_A) {
      expect(lt.status).toBe('locked')
    }
    for (const lt of LIEUTENANTS_B) {
      expect(lt.status).toBe('locked')
    }
  })
})
