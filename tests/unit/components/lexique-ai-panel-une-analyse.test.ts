/**
 * FR-LEX-AI-PANEL — le panneau « Analyse IA Lexique », les badges, le résumé et
 * les termes manquants lisent UNE seule analyse : celle du mot-clé affiché.
 *
 * Recette du 2026-09-30 (lot 6) : le panneau lisait deux listes de
 * recommandations différentes. Après une première analyse il restait « à
 * lancer » ; après un rechargement il annonçait « N analysés, 0 recommandés »,
 * sans pastilles, sans résumé ni termes manquants ; un changement d'onglet
 * montrait l'analyse de la dernière analyse, faite sur un autre mot-clé.
 *
 * Trois chemins, un seul affichage : première analyse, rechargement, onglet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import LexiquePanel from '../../../src/components/moteur/LexiquePanel.vue'
import LexiqueAiPanel from '../../../src/components/moteur/LexiqueAiPanel.vue'
import type {
  LexiqueAnalysisResult,
  LexiqueExploration,
  TfidfResult,
  TfidfTerm,
} from '../../../shared/types/serp-analysis.types'

vi.mock('../../../src/stores/article/radar-exploration.store', () => ({
  useRadarExplorationStore: () => ({ generatedKeywords: [], scanCards: [] }),
}))

const mockApiPost = vi.fn()
const mockApiGet = vi.fn()
vi.mock('../../../src/services/api.service', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}))

// Comme le vrai `useStreaming` : à la fin du flux, `result` reçoit la réponse
// PUIS `onDone` est appelé (voir `finishAnalysis`).
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

vi.mock('../../../src/stores/article/article-keywords.store', () => ({
  useArticleKeywordsStore: () => ({
    keywords: null,
    saveDecisions: vi.fn().mockResolvedValue(true),
    addLexiqueTerm: vi.fn(),
    removeLexiqueTerm: vi.fn(),
  }),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const KW_A = 'isolation combles'
const KW_B = 'isolation murs'

function term(t: string, level: TfidfTerm['level']): TfidfTerm {
  return { term: t, level, documentFrequency: 0.8, density: 3, competitorCount: 4, totalCompetitors: 5 }
}

// « laine » est commun aux deux mots-clés : son badge ne doit jamais passer de l'un à l'autre.
const TFIDF_A: TfidfResult = {
  keyword: KW_A,
  totalCompetitors: 5,
  obligatoire: [term('laine', 'obligatoire'), term('soufflage', 'obligatoire')],
  differenciateur: [term('pare-vapeur', 'differenciateur')],
  optionnel: [],
}
const TFIDF_B: TfidfResult = {
  keyword: KW_B,
  totalCompetitors: 5,
  obligatoire: [term('laine', 'obligatoire'), term('enduit', 'obligatoire')],
  differenciateur: [],
  optionnel: [],
}

const ANALYSIS_A: LexiqueAnalysisResult = {
  recommendations: [
    { term: 'laine', aiRecommended: true, aiReason: 'Isolant le plus cité' },
    { term: 'soufflage', aiRecommended: true, aiReason: 'Technique des combles' },
    { term: 'pare-vapeur', aiRecommended: false, aiReason: 'Trop technique ici' },
  ],
  missingTerms: ['déperdition'],
  summary: 'Résumé des combles',
}

const ANALYSIS_B: LexiqueAnalysisResult = {
  recommendations: [{ term: 'enduit', aiRecommended: true, aiReason: 'Finition des murs' }],
  missingTerms: [],
  summary: 'Résumé des murs',
}

function exploration(sourceKeyword: string, tfidf: TfidfResult, ai?: LexiqueAnalysisResult): LexiqueExploration {
  return {
    articleId: 1,
    sourceKeyword,
    tfidfTerms: tfidf,
    aiRecommendations: ai?.recommendations ?? [],
    aiMissingTerms: ai?.missingTerms ?? [],
    aiSummary: ai?.summary ?? null,
    exploredAt: new Date().toISOString(),
  }
}

/** Ce que la base renvoie : pages présentes, explorations enregistrées de l'article. */
function mockDb(entries: LexiqueExploration[]) {
  mockApiGet.mockImplementation(async (path: string) => {
    if (path.includes('/serp/exists')) return { exists: true, scrapedAt: '2026-09-30T00:00:00.000Z' }
    return { lexique: entries }
  })
}

function mountLexique() {
  return mount(LexiquePanel, {
    props: {
      selectedArticle: { id: 1, slug: 'isolation', title: 'Isolation', keyword: KW_A, type: 'pilier', locked: false, source: 'proposed' as const },
      captainKeyword: KW_A,
      articleLevel: 'pilier' as const,
      selectedLieutenants: [],
      isCaptaineLocked: true,
      cocoonSlug: 'cocon-isolation',
    },
    global: {
      stubs: {
        KeywordAssistPanel: true,
        CollapsableSection: { template: '<div><slot /></div>' },
      },
    },
  })
}

type Wrapper = ReturnType<typeof mountLexique>

/** « Analyser avec l'IA » (le seul geste qui lance l'analyse). */
async function clickAnalyse(wrapper: Wrapper) {
  wrapper.findComponent(LexiqueAiPanel).vm.$emit('trigger')
  await flushPromises()
}

/** Fin du flux de l'IA, dans l'ordre du vrai `useStreaming`. */
async function finishAnalysis(result: LexiqueAnalysisResult) {
  const call = iaStreaming.startStream.mock.calls.at(-1)
  if (!call) throw new Error('aucune analyse lancée')
  iaStreaming.result.value = result
  ;(call[2] as { onDone: (r: LexiqueAnalysisResult) => void }).onDone(result)
  await flushPromises()
}

/** Ce que le panneau « Analyse IA Lexique » annonce. */
function panelCounts(wrapper: Wrapper) {
  const panel = wrapper.findComponent(LexiqueAiPanel)
  return {
    analysed: panel.props('recommendationsCount'),
    recommended: panel.props('recommendedCount'),
    rejected: panel.props('notRecommendedCount'),
  }
}

function badgeCount(wrapper: Wrapper): number {
  return wrapper.findAll('.badge-ia').length
}

function tabs(wrapper: Wrapper) {
  return wrapper.findAll('[role="tab"]')
}

beforeEach(() => {
  vi.clearAllMocks()
  iaStreaming.isStreaming.value = false
  iaStreaming.error.value = null
  iaStreaming.result.value = null
  mockApiPost.mockResolvedValue(TFIDF_A)
  mockDb([])
})

describe('FR-LEX-AI-PANEL — une seule analyse affichée : celle du mot-clé affiché', () => {
  it('après une première analyse, le panneau compte ce que les badges montrent', async () => {
    const wrapper = mountLexique()
    await flushPromises()
    await wrapper.get('[data-testid="btn-extract"]').trigger('click')
    await flushPromises()

    await clickAnalyse(wrapper)
    await finishAnalysis(ANALYSIS_A)

    expect(badgeCount(wrapper)).toBe(3)
    expect(panelCounts(wrapper), 'le panneau restait « à lancer » (0 terme analysé)').toEqual({ analysed: 3, recommended: 2, rejected: 1 })
    expect(wrapper.get('[data-testid="ia-summary"]').text()).toContain('Résumé des combles')
    expect(wrapper.get('[data-testid="ia-summary"]').text()).toContain('déperdition')
  })

  it('après un rechargement, l’analyse enregistrée revient entière, sans nouvel appel', async () => {
    mockDb([exploration(KW_A, TFIDF_A, ANALYSIS_A)])
    const wrapper = mountLexique()
    await flushPromises()
    await flushPromises()

    expect(iaStreaming.startStream).not.toHaveBeenCalled()
    expect(panelCounts(wrapper), '« 3 analysés, 0 recommandés » après le rechargement').toEqual({ analysed: 3, recommended: 2, rejected: 1 })
    expect(badgeCount(wrapper), 'les pastilles disparaissaient au rechargement').toBe(3)
    expect(wrapper.findAll('.badge-ia-recommended')).toHaveLength(2)
    const summary = wrapper.find('[data-testid="ia-summary"]')
    expect(summary.exists(), 'le résumé enregistré ne s’affichait plus').toBe(true)
    expect(summary.text()).toContain('Résumé des combles')
    expect(summary.text()).toContain('déperdition')
  })

  it('changer d’onglet montre l’analyse du mot-clé affiché, jamais celle d’un autre', async () => {
    mockDb([exploration(KW_A, TFIDF_A), exploration(KW_B, TFIDF_B)])
    const wrapper = mountLexique()
    await flushPromises()
    await flushPromises()
    expect(tabs(wrapper)[0]!.attributes('aria-selected')).toBe('true')

    await clickAnalyse(wrapper)
    await finishAnalysis(ANALYSIS_A)
    expect(badgeCount(wrapper)).toBe(3)

    // Onglet B, jamais analysé : ni les pastilles, ni le résumé, ni les compteurs de A.
    await tabs(wrapper)[1]!.trigger('click')
    await flushPromises()
    expect(badgeCount(wrapper), '« laine » gardait la pastille de l’analyse de A').toBe(0)
    expect(wrapper.find('[data-testid="ia-summary"]').exists(), 'le résumé de A restait affiché sur B').toBe(false)
    expect(panelCounts(wrapper)).toEqual({ analysed: 0, recommended: 0, rejected: 0 })

    // L'analyse de B part pour B, et s'affiche sur B.
    await clickAnalyse(wrapper)
    expect(String(iaStreaming.startStream.mock.calls.at(-1)![0])).toContain(encodeURIComponent(KW_B))
    await finishAnalysis(ANALYSIS_B)
    expect(badgeCount(wrapper)).toBe(1)
    expect(wrapper.get('[data-testid="ia-summary"]').text()).toContain('Résumé des murs')
    expect(panelCounts(wrapper)).toEqual({ analysed: 1, recommended: 1, rejected: 0 })

    // Retour sur A : son analyse revient, sans nouvel appel.
    await tabs(wrapper)[0]!.trigger('click')
    await flushPromises()
    expect(iaStreaming.startStream).toHaveBeenCalledTimes(2)
    expect(badgeCount(wrapper)).toBe(3)
    expect(wrapper.get('[data-testid="ia-summary"]').text()).toContain('Résumé des combles')
    expect(panelCounts(wrapper)).toEqual({ analysed: 3, recommended: 2, rejected: 1 })
  })

  it('l’analyse ne coche aucun terme', async () => {
    mockDb([exploration(KW_A, TFIDF_A, ANALYSIS_A)])
    const wrapper = mountLexique()
    await flushPromises()
    await flushPromises()

    for (const box of wrapper.findAll('.term-checkbox')) {
      expect((box.element as HTMLInputElement).checked).toBe(false)
    }
  })
})
