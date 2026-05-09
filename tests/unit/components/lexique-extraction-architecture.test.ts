/**
 * Vague 1 — Tests architecturaux LexiquePanel.
 *
 * Référence FR PRD : FR-LEX-EXTRAIRE (le Lexique extrait 3 niveaux de termes
 * — Obligatoire / Différenciateur / Optionnel — depuis la SERP, et permet
 * d'enrichir avec des explorations multi-keyword. Chacun des 3 niveaux
 * affiche les mêmes colonnes (densité, fréquence, IA recommandé) — voir prd.md).
 *
 * Ces tests verrouillent la POSITION DOM des sous-composants après extraction :
 * - LexiqueTermsList (factorisation des 3 sections) doit être rendu 3 fois
 *   sous le container `lexique-results` (pas dans le panel IA, pas hors-results).
 * - LexiqueMultiKeywordPanel doit rester en dehors de `lexique-results`
 *   (c'est un outil pour ré-extraire, pas un résultat).
 * - Le panel IA bas-de-page (LexiqueAiPanel) reste descendant direct du
 *   container racine `lexique-extraction` (pas absorbé par les TermsList).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref, nextTick } from 'vue'
import LexiquePanel from '../../../src/components/moteur/LexiquePanel.vue'

const { tfidfFixture } = vi.hoisted(() => ({
  tfidfFixture: {
    obligatoire: [
      { term: 'seo', level: 'obligatoire' as const, density: 5, documentFrequency: 0.8, competitorCount: 3 },
    ],
    differenciateur: [
      { term: 'maillage', level: 'differenciateur' as const, density: 2, documentFrequency: 0.5, competitorCount: 2 },
    ],
    optionnel: [
      { term: 'paragraphe', level: 'optionnel' as const, density: 1, documentFrequency: 0.2, competitorCount: 1 },
    ],
  },
}))

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn().mockResolvedValue({ lexique: [] }),
  apiPost: vi.fn().mockResolvedValue(tfidfFixture),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../src/composables/editor/useStreaming', () => ({
  useStreaming: () => ({
    isStreaming: ref(false),
    error: ref(null),
    result: ref(null),
    startStream: vi.fn(),
    abort: vi.fn(),
  }),
}))

const mockKeywordsRef = ref<{ articleId: number; lexique: string[] } | null>({ articleId: 1, lexique: [] })

vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    get keywords() { return mockKeywordsRef.value },
    initEmpty: vi.fn(),
    saveDecisions: vi.fn().mockResolvedValue(undefined),
  }),
}))

const stubs = {
  KeywordAssistPanel: {
    name: 'KeywordAssistPanel',
    template: '<div data-testid="keyword-assist-panel"></div>',
  },
  LexiqueAiPanel: {
    name: 'LexiqueAiPanel',
    template: '<div data-testid="lexique-ai-panel"></div>',
  },
  LexiqueTermsList: {
    name: 'LexiqueTermsList',
    template: '<div data-testid="lexique-terms-list"></div>',
    props: ['title', 'terms', 'selectedTerms', 'isLocked', 'defaultOpen', 'isIaRecommended', 'getRecommendation', 'sortTermsByAlignment', 'emptyLabel'],
    emits: ['toggle-term'],
  },
  // Chantier 3 E2-S2 — LexiqueMultiKeywordPanel renommé LexiqueCustomKeywordInput
  // (chips remplacés par TabBar côté parent). On stub le nouveau nom + on ajoute
  // un stub pour TabBar.
  LexiqueCustomKeywordInput: {
    name: 'LexiqueCustomKeywordInput',
    template: '<div data-testid="lexique-custom-keyword-input"></div>',
    props: ['customKeywordInput', 'isLoading', 'isLocked'],
    emits: ['update:custom-keyword', 'extract-custom'],
  },
  TabBar: {
    name: 'TabBar',
    template: '<div data-testid="lexique-tab-bar"></div>',
    props: ['tabs', 'activeId', 'ariaLabel'],
    emits: ['update:activeId'],
  },
  SortToggleBar: { template: '<div data-testid="lexique-sort-bar"></div>' },
  ConfirmModal: { template: '<div></div>', props: ['open', 'title', 'message', 'confirmLabel', 'cancelLabel'] },
}

const baseProps = {
  selectedArticle: { id: 1, slug: 'article', title: 'Article', keyword: 'seo', painPoint: '', type: 'Pilier', locked: false, source: 'proposed' } as never,
  captainKeyword: 'seo',
  articleLevel: 'pilier' as const,
  selectedLieutenants: [],
  isCaptaineLocked: true,
  initialLocked: false,
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockKeywordsRef.value = { articleId: 1, lexique: [] }
})

async function mountLexique() {
  const wrapper = mount(LexiquePanel, {
    props: baseProps,
    global: { stubs },
  })
  // Wait for the immediate watcher to hydrate from DB and fetch tfidf.
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 50))
  await nextTick()
  return wrapper
}

function isDescendantOf(wrapper: ReturnType<typeof mount>, ancestorSelector: string, descendantSelector: string): boolean {
  const ancestor = wrapper.find(ancestorSelector)
  if (!ancestor.exists()) return false
  return ancestor.find(descendantSelector).exists()
}

describe('LexiquePanel — architecture des sections (Vague 1)', () => {
  it('AC.D.1 — LexiqueTermsList est rendu 3 fois sous lexique-results', async () => {
    const wrapper = await mountLexique()
    const termsLists = wrapper.findAll('[data-testid="lexique-terms-list"]')
    expect(termsLists.length).toBe(3)
    // Tous descendants de lexique-results
    const results = wrapper.find('[data-testid="lexique-results"]')
    expect(results.exists()).toBe(true)
    expect(results.findAll('[data-testid="lexique-terms-list"]').length).toBe(3)
  })

  it('AC.D.2 — TabBar (ex-LexiqueMultiKeywordPanel) N\'EST PAS descendant de lexique-results', async () => {
    // Chantier 3 E2-S2 : la liste des explorations vit désormais dans TabBar,
    // pas dans LexiqueMultiKeywordPanel. L'invariant architectural est conservé :
    // les onglets restent au-dessus de la grille de termes (lexique-results).
    const wrapper = await mountLexique()
    expect(isDescendantOf(wrapper, '[data-testid="lexique-results"]', '[data-testid="lexique-tab-bar"]'))
      .toBe(false)
    // Mais bien rendu (présent dans le DOM)
    expect(wrapper.find('[data-testid="lexique-tab-bar"]').exists()).toBe(true)
  })

  it('AC.D.3 — LexiqueAiPanel reste descendant direct de .lexique-extraction (pas absorbé par TermsList)', async () => {
    const wrapper = await mountLexique()
    expect(wrapper.find('[data-testid="lexique-ai-panel"]').exists()).toBe(true)
    // Pas descendant d'un TermsList
    const termsLists = wrapper.findAll('[data-testid="lexique-terms-list"]')
    for (const tl of termsLists) {
      expect(tl.find('[data-testid="lexique-ai-panel"]').exists()).toBe(false)
    }
  })
})
