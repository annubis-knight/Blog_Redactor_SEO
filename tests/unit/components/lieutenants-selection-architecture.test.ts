/**
 * Sprint 1 — Tests architecturaux anti-régression Sprint C-1.
 *
 * Friction utilisateur (audit 2026-05-03) :
 *   « Au click sur DB de tab-cache-panel, j'ai voulu afficher des mots clefs
 *     lieutenants chargés depuis la database dans l'onglet lieutenant. Mais ces
 *     mots clefs ont été affichés dans le ia panel plutôt que dans le container
 *     de mots clefs lieutenant principal. »
 *
 * Cause racine : Sprint C-1 (commit 890b285, 2026-05-02) a unifié les panels IA
 * et a, ce faisant, absorbé les containers principaux Lieutenants
 * (LieutenantProposals + LieutenantH2Structure) DANS le wrapper visuel
 * LieutenantsAiPanel (coque purple "Suggestions IA").
 *
 * Ces tests verrouillent la séparation sémantique : les containers principaux
 * doivent vivre HORS de la coque IA. Si quelqu'un re-fusionne, ces tests
 * cassent — et ce sera une bonne chose.
 *
 * Note pédagogique : un "container principal" = la zone DOM où l'utilisateur
 * voit ses propres données (cards lieutenants, structure Hn). Un "panel IA" =
 * la zone DOM dédiée aux suggestions IA streamées. Mélanger les deux fait que
 * l'utilisateur ne sait plus si une donnée est *à lui* ou *suggérée par l'IA*.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LieutenantsPanel from '../../../src/components/moteur/LieutenantsPanel.vue'
import type { SelectedArticle } from '../../../shared/types/index'
import type { FilteredProposeLieutenantsResult } from '../../../shared/types/serp-analysis.types'
import type { RichLieutenant } from '../../../shared/types/keyword.types'

// ---- Mocks (alignés sur lieutenants-selection-isolation.test.ts) ----
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

const ARTICLE: SelectedArticle = {
  id: 64, slug: 'creation-site-web-pilier',
  title: 'Création de site web sur mesure à Toulouse',
  keyword: 'creation site web entreprises Toulouse',
  painPoint: 'pain', type: 'Pilier',
  locked: false, source: 'proposed',
} as never as SelectedArticle

const LOCKED_LIEUTENANTS: RichLieutenant[] = [
  { keyword: 'site vitrine professionnel', status: 'locked', reasoning: 'r1', sources: [], suggestedHnLevel: 2, score: 72 },
  { keyword: 'site web pme toulouse', status: 'locked', reasoning: 'r2', sources: [], suggestedHnLevel: 2, score: 68 },
] as never as RichLieutenant[]

beforeEach(() => {
  vi.clearAllMocks()
  iaStreaming.chunks.value = ''
  iaStreaming.isStreaming.value = false
  iaStreaming.error.value = null
  iaStreaming.result.value = null
  mockStoreKeywords.value = {
    articleId: ARTICLE.id,
    capitaine: ARTICLE.keyword,
    lieutenants: LOCKED_LIEUTENANTS.map(lt => lt.keyword),
    lexique: [],
    rootKeywords: [],
    richLieutenants: [...LOCKED_LIEUTENANTS],
    hnStructure: [{ level: 2, text: 'H2 a', children: [] }],
  }
  mockApiPost.mockResolvedValue({})
  mockApiGet.mockResolvedValue(null)
})

const baseProps = {
  selectedArticle: ARTICLE,
  mode: 'workflow' as const,
  captainKeyword: ARTICLE.keyword,
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
        // Stubs minimaux qui rendent un placeholder identifiable par data-testid.
        // L'enjeu de ces tests est la POSITION dans l'arbre, pas le contenu.
        LieutenantSerpAnalysis: {
          name: 'LieutenantSerpAnalysis',
          template: '<div class="serp-stub" data-testid="serp-stub"></div>',
          props: ['serpResultsByKeyword', 'activeSerpTab', 'activeSerpTabResult', 'displayedCompetitors', 'serpResult', 'sliderValue', 'isLoading', 'canAnalyze', 'iaIsStreaming', 'serpDoneCount', 'serpTotalCount', 'serpPendingKeywords', 'serpCurrentKeyword', 'iaChunks', 'currentStep'],
          emits: ['analyze', 'refresh', 'update:slider-value', 'update:active-serp-tab'],
        },
        LieutenantH2Structure: {
          name: 'LieutenantH2Structure',
          template: '<div class="hn-stub" data-testid="lieutenant-h2-structure"></div>',
          props: ['hnStructure', 'activeHnRecurrence', 'hnRecurrence', 'serpResultsByKeyword', 'activeHnTab', 'hnSaved', 'isSavingHn'],
          emits: ['save-hn', 'update:active-hn-tab'],
        },
        LieutenantProposals: {
          name: 'LieutenantProposals',
          template: '<div class="prop-stub" data-testid="lieutenants-container"></div>',
          props: ['iaIsStreaming', 'iaChunks', 'iaError', 'lieutenantCards', 'eliminatedCards', 'totalGenerated', 'selectedCards', 'contentGapInsights'],
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
 * Vérifie qu'un noeud DOM est descendant d'un autre (sélecteur ancêtre).
 * Retourne true si `descendantSelector` est trouvé À L'INTÉRIEUR de
 * `ancestorSelector`. Si l'ancêtre n'existe pas, retourne false.
 */
function isDescendantOf(wrapper: ReturnType<typeof mountLieutenants>, ancestorSelector: string, descendantSelector: string): boolean {
  const ancestor = wrapper.find(ancestorSelector)
  if (!ancestor.exists()) return false
  return ancestor.find(descendantSelector).exists()
}

describe('LieutenantsPanel — architecture des sections (anti-régression Sprint C-1)', () => {
  it('AC1.1 — lieutenants-container N\'EST PAS descendant de ai-panel-suggestion', async () => {
    const wrapper = mountLieutenants()
    await nextTick()
    await nextTick()

    expect(isDescendantOf(wrapper, '[data-testid="ai-panel-suggestion"]', '[data-testid="lieutenants-container"]'))
      .toBe(false)
  })

  it('AC1.2 — lieutenant-h2-structure N\'EST PAS descendant de ai-panel-suggestion', async () => {
    const wrapper = mountLieutenants()
    await nextTick()
    await nextTick()

    expect(isDescendantOf(wrapper, '[data-testid="ai-panel-suggestion"]', '[data-testid="lieutenant-h2-structure"]'))
      .toBe(false)
  })

  it('AC1.3 — LieutenantProposals est rendu au moins une fois (container principal accessible)', async () => {
    const wrapper = mountLieutenants()
    await nextTick()
    await nextTick()

    const container = wrapper.find('[data-testid="lieutenants-container"]')
    expect(container.exists()).toBe(true)
  })

  it('AC2 — lieutenants-header (bloc legacy) n\'existe plus dans le DOM', async () => {
    const wrapper = mountLieutenants()
    await nextTick()
    await nextTick()

    // Le bloc <div class="lieutenants-header"> doit être supprimé.
    const legacyHeader = wrapper.find('.lieutenants-header')
    expect(legacyHeader.exists()).toBe(false)
  })

  it('AC2.bis — le badge level (article level) reste affiché quelque part dans le DOM', async () => {
    // Le badge level migre dans la nouvelle UI mais ne disparaît pas. Garde-fou.
    const wrapper = mountLieutenants({ articleLevel: 'pilier' })
    await nextTick()
    await nextTick()

    const html = wrapper.html().toLowerCase()
    expect(html).toContain('pilier')
  })
})
