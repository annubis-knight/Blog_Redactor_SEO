/**
 * Tests COMPLÉMENTAIRES pour LexiquePanel.
 *
 * Le fichier `lexique-extraction.test.ts` couvre 64 tests (extraction TF-IDF,
 * IA upfront, badges, validation/lock, error fallback). Ce fichier ajoute les
 * trous identifiés Sprint 18-bis (2026-04-27) :
 *
 * - handleAssistAdd : ajout depuis le basket via KeywordAssistPanel
 * - extractCustomKeyword (D4) : input libre + bouton Extraire pour un autre keyword
 * - pastExplorations chips : bascule entre explorations passées
 * - hydrateFromDb : restauration au mount via /articles/:id/explorations
 * - hasEverValidated (F5) : soft gate qui ne s'applique qu'au premier passage
 *
 * Mocks : apiPost, apiGet, useStreaming, store article-keywords, basket.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import LexiquePanel from '../../../src/components/moteur/LexiquePanel.vue'
import type { LexiqueAnalysisResult, TfidfResult, LexiqueTermRecommendation } from '../../../shared/types/serp-analysis.types'

// --- Mocks API ---
const mockApiPost = vi.fn()
const mockApiGet = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}))

// --- Mock useStreaming ---
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

// --- Mock store article-keywords ---
const mockKeywords = ref<{ articleId: number; capitaine: string; lieutenants: string[]; lexique: string[] } | null>(null)
const mockSaveDecisions = vi.fn().mockResolvedValue(undefined)
const mockInitEmpty = vi.fn()

vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return mockKeywords.value },
    saveDecisions: mockSaveDecisions,
    initEmpty: mockInitEmpty,
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

const TFIDF_RESULT: TfidfResult = {
  keyword: 'seo',
  totalCompetitors: 5,
  obligatoire: [
    { term: 'référencement', level: 'obligatoire', documentFrequency: 0.8, density: 4.2, competitorCount: 4, totalCompetitors: 5 },
  ],
  differenciateur: [
    { term: 'stratégie', level: 'differenciateur', documentFrequency: 0.5, density: 2.0, competitorCount: 2, totalCompetitors: 5 },
  ],
  optionnel: [],
}

const TFIDF_RESULT_2: TfidfResult = {
  keyword: 'seo local',
  totalCompetitors: 5,
  obligatoire: [
    { term: 'local-business', level: 'obligatoire', documentFrequency: 0.9, density: 5.0, competitorCount: 5, totalCompetitors: 5 },
  ],
  differenciateur: [],
  optionnel: [],
}

const SELECTED_ARTICLE = {
  id: 1,
  slug: 'test-article',
  title: 'Test',
  keyword: 'seo',
  type: 'Pilier' as const,
  locked: false,
  source: 'proposed' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  iaStreaming.chunks.value = ''
  iaStreaming.isStreaming.value = false
  iaStreaming.error.value = null
  iaStreaming.result.value = null
  mockKeywords.value = null
  // Default : pré-check SERP OK + pas d'explorations passées.
  // Chantier 3 E1-S3 : on différencie /serp/exists (200 OK avec scrape
  // existant, donc auto-fetch autorisé) vs /explorations (cache vide).
  mockApiGet.mockImplementation(async (path: string) => {
    if (path.includes('/serp/exists')) return { exists: true, scrapedAt: '2026-05-01T00:00:00.000Z' }
    return { lexique: [] }
  })
  mockApiPost.mockResolvedValue(TFIDF_RESULT)
})

const baseProps = {
  selectedArticle: SELECTED_ARTICLE,
  captainKeyword: 'seo',
  articleLevel: 'pilier' as const,
  selectedLieutenants: ['seo local', 'seo onpage'],
  isCaptaineLocked: true,
  initialLocked: false,
  cocoonSlug: 'cocon-test',
}

function mountLexique(propsOverride: Partial<typeof baseProps> = {}) {
  return mount(LexiquePanel, {
    props: { ...baseProps, ...propsOverride },
    global: {
      stubs: {
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
// Trou A — handleAssistAdd
// ============================================================================
describe('LexiquePanel — handleAssistAdd (basket)', () => {
  it('emit add depuis KeywordAssistPanel ajoute un terme à selectedTerms', async () => {
    // L'auto-fetch TF-IDF + pré-sélection peut ajouter des termes au démarrage.
    // On capture l'état avant le clic, puis on vérifie qu'un nouveau terme a
    // été ajouté après.
    // Chantier 3 E1-S3 — flushPromises pour résoudre le pré-check SERP +
    // hydrateFromDb + fetchTfidf (chaîne d'await en série).
    const wrapper = mountLexique()
    await flushPromises()
    await flushPromises()

    const assist = wrapper.findComponent({ name: 'KeywordAssistPanel' })
    const before = (assist.props('excludeKeywords') as string[]).slice()

    await wrapper.find('.assist-add').trigger('click')
    await nextTick()

    const after = assist.props('excludeKeywords') as string[]
    expect(after).toContain('kw-from-basket')
    expect(after.length).toBe(before.length + 1)
  })

  it('handleAssistAdd no-op quand isLocked=true', async () => {
    const wrapper = mountLexique({ initialLocked: true })
    await nextTick()
    await wrapper.find('.assist-add').trigger('click')
    await nextTick()

    const assist = wrapper.findComponent({ name: 'KeywordAssistPanel' })
    const exclude = assist.props('excludeKeywords') as string[]
    expect(exclude).not.toContain('kw-from-basket')
  })
})

// ============================================================================
// Trou B — extractCustomKeyword (D4)
// ============================================================================
describe('LexiquePanel — extractCustomKeyword (D4)', () => {
  it('saisie + Entrée dans .custom-keyword-input lance fetchTfidf avec le custom keyword', async () => {
    // Chantier 3 E2-S2 — sélecteur renommé .multi-keyword-input → .custom-keyword-input
    // (composant LexiqueMultiKeywordPanel renommé LexiqueCustomKeywordInput).
    const wrapper = mountLexique()
    await flushPromises()
    mockApiPost.mockClear()
    mockApiPost.mockResolvedValue(TFIDF_RESULT_2)

    const input = wrapper.find('.custom-keyword-input')
    await input.setValue('autre keyword')
    await input.trigger('keydown.enter')
    await flushPromises()

    const tfidfCalls = mockApiPost.mock.calls.filter(c => String(c[0]).includes('/serp/tfidf'))
    expect(tfidfCalls.length).toBeGreaterThan(0)
    // Le dernier appel doit utiliser le custom keyword
    const lastCall = tfidfCalls[tfidfCalls.length - 1]!
    expect((lastCall[1] as { keyword: string }).keyword).toBe('autre keyword')
  })

  it('clic « Extraire » avec input vide ne déclenche pas fetchTfidf', async () => {
    const wrapper = mountLexique()
    await flushPromises()
    mockApiPost.mockClear()

    const btnSecondary = wrapper.find('.btn-secondary')
    expect((btnSecondary.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('après extraction custom, input est vidé', async () => {
    const wrapper = mountLexique()
    await flushPromises()
    mockApiPost.mockResolvedValue(TFIDF_RESULT_2)

    const input = wrapper.find('.custom-keyword-input')
    await input.setValue('autre keyword')
    await wrapper.find('.btn-secondary').trigger('click')
    await flushPromises()

    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it.skip('input désactivé si isLocked=true (Sprint 17 — sémantique inversée : l\'utilisateur peut étendre sa sélection même avec des termes déjà cochés)', async () => {
    const wrapper = mountLexique({ initialLocked: true })
    await nextTick()
    const input = wrapper.find('.custom-keyword-input')
    expect((input.element as HTMLInputElement).disabled).toBe(true)
  })
})

// ============================================================================
// Trou C — pastExplorations onglets (chantier 3 E2-S2 : ex-chips → TabBar)
// ============================================================================
describe('LexiquePanel — pastExplorations onglets', () => {
  function mockExplorations(entries: { sourceKeyword: string; tfidf: typeof TFIDF_RESULT; recs?: Array<{ term: string; aiRecommended: boolean; aiReason: string }> }[]) {
    mockApiGet.mockImplementation(async (path: string) => {
      if (path.includes('/serp/exists')) return { exists: true, scrapedAt: '2026-05-01T00:00:00.000Z' }
      return {
        lexique: entries.map(e => ({
          articleId: 1,
          sourceKeyword: e.sourceKeyword,
          tfidfTerms: e.tfidf,
          aiRecommendations: e.recs ?? [],
          aiMissingTerms: [],
          aiSummary: null,
          exploredAt: new Date().toISOString(),
        })),
      }
    })
  }

  it('charge les past explorations au mount via /articles/:id/explorations', async () => {
    mockExplorations([
      { sourceKeyword: 'seo', tfidf: TFIDF_RESULT },
      { sourceKeyword: 'seo local', tfidf: TFIDF_RESULT_2 },
    ])
    const wrapper = mountLexique()
    await flushPromises()
    await flushPromises()

    // 2 onglets explorations + 1 onglet « + Tester » = 3 tabs role="tab"
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.length).toBe(3)
    expect(tabs[0].text()).toBe('seo')
    expect(tabs[1].text()).toBe('seo local')
    expect(tabs[2].text()).toMatch(/Tester/)
  })

  it('onglet actif (aria-selected="true") selon activeSourceKeyword', async () => {
    mockExplorations([
      { sourceKeyword: 'seo', tfidf: TFIDF_RESULT },
      { sourceKeyword: 'seo local', tfidf: TFIDF_RESULT_2 },
    ])
    const wrapper = mountLexique()
    await flushPromises()
    await flushPromises()

    // L'auto-restore se base sur captainKeyword='seo' → onglet 'seo' devrait être actif
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[1].attributes('aria-selected')).toBe('false')
  })

  it('clic sur un onglet switch tfidfResult sans appel API', async () => {
    mockExplorations([
      { sourceKeyword: 'seo', tfidf: TFIDF_RESULT },
      { sourceKeyword: 'seo local', tfidf: TFIDF_RESULT_2, recs: [{ term: 'local-business', aiRecommended: true, aiReason: 'r' }] },
    ])
    const wrapper = mountLexique()
    await flushPromises()
    await flushPromises()

    mockApiPost.mockClear()
    // Click sur le 2ème onglet ('seo local')
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[1].trigger('click')
    await flushPromises()

    // Pas d'appel API
    const tfidfCalls = mockApiPost.mock.calls.filter(c => String(c[0]).includes('/serp/tfidf'))
    expect(tfidfCalls.length).toBe(0)
    // Le 2ème onglet est maintenant actif (aria-selected="true")
    const tabsAfter = wrapper.findAll('[role="tab"]')
    expect(tabsAfter[1].attributes('aria-selected')).toBe('true')
    expect(tabsAfter[0].attributes('aria-selected')).toBe('false')
  })

  it('aucune exploration → seul l\'onglet « Tester un mot-clé » est rendu', async () => {
    // Default beforeEach mock répond { exists:true } pour /serp/exists et
    // { lexique: [] } pour /explorations.
    const wrapper = mountLexique()
    await flushPromises()
    await flushPromises()

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.length).toBe(1)
    expect(tabs[0].text()).toMatch(/Tester/)
  })
})

// ============================================================================
// Trou D — hydrateFromDb (restauration au mount)
// ============================================================================
describe('LexiquePanel — hydrateFromDb', () => {
  it('au mount avec captainLocked, GET /articles/:id/explorations est appelé', async () => {
    mockApiGet.mockClear()
    const wrapper = mountLexique()
    await nextTick()
    await nextTick()

    expect(mockApiGet).toHaveBeenCalled()
    const exploreCalls = mockApiGet.mock.calls.filter(c => String(c[0]).includes('/explorations'))
    expect(exploreCalls.length).toBeGreaterThan(0)
    void wrapper
  })

  it('restaure tfidfResult depuis DB si exploration matche le captain keyword', async () => {
    mockApiGet.mockResolvedValue({
      lexique: [
        { articleId: 1, sourceKeyword: 'seo', tfidfTerms: TFIDF_RESULT, aiRecommendations: MOCK_IA_RECS, aiMissingTerms: [], aiSummary: 'sum', exploredAt: new Date().toISOString() },
      ],
    })
    mockApiPost.mockClear()
    const wrapper = mountLexique()
    await nextTick()
    await nextTick()

    // Pas de fetchTfidf parce qu'on a hydraté depuis DB
    const tfidfCalls = mockApiPost.mock.calls.filter(c => String(c[0]).includes('/serp/tfidf'))
    expect(tfidfCalls.length).toBe(0)

    // Et les résultats sont visibles
    expect(wrapper.find('[data-testid="lexique-results"]').exists()).toBe(true)
  })

  it('si pas d\'exploration en DB, déclenche fetchTfidf normalement', async () => {
    mockApiGet.mockResolvedValue({ lexique: [] })
    mockApiPost.mockClear()
    mockApiPost.mockResolvedValue(TFIDF_RESULT)

    const wrapper = mountLexique()
    await nextTick()
    await nextTick()
    await nextTick()

    const tfidfCalls = mockApiPost.mock.calls.filter(c => String(c[0]).includes('/serp/tfidf'))
    expect(tfidfCalls.length).toBeGreaterThan(0)
    void wrapper
  })

  it('hydrateFromDb gère gracieusement une erreur API', async () => {
    // Chantier 3 E1-S3 — le pré-check SERP doit répondre OK pour que le
    // fallback fetchTfidf soit autorisé (sinon le watcher est gated par
    // serpExists=null/false). On différencie /serp/exists (200 OK) vs
    // /explorations (erreur testée).
    mockApiGet.mockImplementation(async (path: string) => {
      if (path.includes('/serp/exists')) return { exists: true, scrapedAt: '2026-05-01T00:00:00.000Z' }
      throw new Error('GET explorations failed')
    })
    mockApiPost.mockResolvedValue(TFIDF_RESULT)
    const wrapper = mountLexique()
    await nextTick()
    await nextTick()
    await nextTick()
    await nextTick()

    // Pas de crash + fallback sur fetchTfidf
    const tfidfCalls = mockApiPost.mock.calls.filter(c => String(c[0]).includes('/serp/tfidf'))
    expect(tfidfCalls.length).toBeGreaterThan(0)
    void wrapper
  })
})

// ============================================================================
// Trou E — hasEverValidated (F5 soft gate)
// ============================================================================
describe('LexiquePanel — hasEverValidated (F5 soft gate)', () => {
  it('canExtract=true si captain locked + 0 lexique en store (cas standard)', async () => {
    mockKeywords.value = { articleId: 1, capitaine: 'seo', lieutenants: [], lexique: [] }
    const wrapper = mountLexique({ isCaptaineLocked: true })
    await nextTick()

    const btn = wrapper.find('[data-testid="btn-extract"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('canExtract=true si captain UNLOCKED MAIS lexique[].length > 0 (F5 soft gate)', async () => {
    // F5 : si on a déjà validé une fois, on garde l'accès même si capitain est déverrouillé
    mockKeywords.value = { articleId: 1, capitaine: 'seo', lieutenants: [], lexique: ['terme1', 'terme2'] }
    const wrapper = mountLexique({ isCaptaineLocked: false })
    await nextTick()

    const btn = wrapper.find('[data-testid="btn-extract"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('canExtract=false si captain UNLOCKED ET lexique vide', async () => {
    mockKeywords.value = { articleId: 1, capitaine: 'seo', lieutenants: [], lexique: [] }
    const wrapper = mountLexique({ isCaptaineLocked: false })
    await nextTick()

    const btn = wrapper.find('[data-testid="btn-extract"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it.skip('canExtract=false si déjà locked (Sprint 17 — sémantique inversée : extraction reste possible pour étendre la sélection, FR-LEX-CHECKBOX-LOCK-IMMEDIATE)', async () => {
    const wrapper = mountLexique({ initialLocked: true })
    await nextTick()
    const btn = wrapper.find('[data-testid="btn-extract"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })
})

// MOCK_IA_RECS doit être déclaré ici en bas pour éviter une référence en avant
const MOCK_IA_RECS: LexiqueTermRecommendation[] = [
  { term: 'référencement', aiRecommended: true, aiReason: 'r' },
  { term: 'stratégie', aiRecommended: true, aiReason: 'r' },
]
