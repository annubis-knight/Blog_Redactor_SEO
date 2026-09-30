// @vitest-environment node
/**
 * FR-LEX-AI-PANEL — l'analyse de l'IA affichée est UNE liste : celle du mot-clé
 * dont la liste de termes est à l'écran (recette du 2026-09-30, lot 6).
 *
 * `useLexiqueExplorations` porte l'analyse affichée (relue en base, ou reçue de
 * l'IA) ; `useLexiqueIa` lance l'analyse et compte sur cette même liste. Les
 * badges, les compteurs du panneau, le résumé et les termes manquants ne
 * peuvent donc plus se contredire, quel que soit le chemin : première analyse,
 * rechargement, changement d'onglet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type {
  LexiqueAnalysisResult,
  LexiqueExploration,
  TfidfResult,
} from '@shared/types/serp-analysis.types.js'

const mockApiGet = vi.fn()
vi.mock('@/services/api.service', () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}))

const mockStartStream = vi.fn()
vi.mock('@/composables/editor/useStreaming', () => ({
  useStreaming: () => ({
    chunks: ref(''),
    isStreaming: ref(false),
    error: ref<string | null>(null),
    result: ref(null),
    usage: ref(null),
    startStream: mockStartStream,
    abort: vi.fn(),
  }),
}))

vi.mock('@/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { useLexiqueExplorations } = await import('@/composables/lexique/useLexiqueExplorations')
const { useLexiqueIa } = await import('@/composables/lexique/useLexiqueIa')

const KW_A = 'isolation combles'
const KW_B = 'isolation murs'

function tfidf(keyword: string, terms: string[]): TfidfResult {
  return {
    keyword,
    totalCompetitors: 5,
    obligatoire: terms.map(t => ({ term: t, level: 'obligatoire' as const, documentFrequency: 0.8, density: 3, competitorCount: 4, totalCompetitors: 5 })),
    differenciateur: [],
    optionnel: [],
  }
}

const TFIDF_A = tfidf(KW_A, ['laine', 'soufflage', 'pare-vapeur'])
const TFIDF_B = tfidf(KW_B, ['laine', 'enduit'])

const ANALYSIS_A: LexiqueAnalysisResult = {
  recommendations: [
    { term: 'laine', aiRecommended: true, aiReason: 'r' },
    { term: 'soufflage', aiRecommended: true, aiReason: 'r' },
    { term: 'pare-vapeur', aiRecommended: false, aiReason: 'r' },
  ],
  missingTerms: ['déperdition'],
  summary: 'Résumé des combles',
}

function exploration(sourceKeyword: string, terms: TfidfResult, ai?: LexiqueAnalysisResult): LexiqueExploration {
  return {
    articleId: 42,
    sourceKeyword,
    tfidfTerms: terms,
    aiRecommendations: ai?.recommendations ?? [],
    aiMissingTerms: ai?.missingTerms ?? [],
    aiSummary: ai?.summary ?? null,
    exploredAt: '2026-09-30T10:00:00.000Z',
  }
}

/** Le panneau Lexique tel que `LexiquePanel` câble ses deux composables. */
function setup() {
  const articleId = ref<number | undefined>(42)
  const explorations = useLexiqueExplorations({ articleId, captainKeyword: ref<string | null>(KW_A) })
  const ia = useLexiqueIa({
    tfidfResult: explorations.tfidfResult,
    analysisKeyword: explorations.analysisKeyword,
    iaRecommendations: explorations.iaRecommendations,
    onAnalysisDone: explorations.applyIaAnalysis,
    articleLevel: ref('pilier'),
    cocoonSlug: ref(''),
    selectedArticleId: articleId,
  })
  return { explorations, ia }
}

/** Ce que l'écran montre de l'analyse : panneau, badges, résumé, termes manquants. */
function shown({ explorations, ia }: ReturnType<typeof setup>, term: string) {
  return {
    analysed: explorations.iaRecommendations.value.size,
    recommended: ia.iaRecommendedCount.value,
    rejected: ia.iaNotRecommendedCount.value,
    badge: ia.isIaRecommended(term),
    summary: explorations.iaSummary.value,
    missing: explorations.iaMissingTerms.value,
  }
}

function finishAnalysis(result: LexiqueAnalysisResult) {
  const call = mockStartStream.mock.calls.at(-1)
  if (!call) throw new Error('aucune analyse lancée')
  ;(call[2] as { onDone: (r: LexiqueAnalysisResult) => void }).onDone(result)
}

const A_SHOWN = { analysed: 3, recommended: 2, rejected: 1, badge: true, summary: 'Résumé des combles', missing: ['déperdition'] }
const NOTHING_SHOWN = { analysed: 0, recommended: 0, rejected: 0, badge: null, summary: null, missing: [] }

beforeEach(() => {
  mockApiGet.mockReset()
  mockStartStream.mockReset()
})

describe('FR-LEX-AI-PANEL — une seule analyse, celle du mot-clé affiché', () => {
  it('après une première analyse : panneau, badges, résumé et termes manquants lisent la même liste', async () => {
    mockApiGet.mockResolvedValue({ lexique: [exploration(KW_A, TFIDF_A)] })
    const panel = setup()
    await panel.explorations.hydrateFromDb()
    expect(shown(panel, 'laine')).toEqual(NOTHING_SHOWN)

    panel.ia.generateLexiqueUpfront()
    finishAnalysis(ANALYSIS_A)

    expect(shown(panel, 'laine')).toEqual(A_SHOWN)
  })

  it('après un rechargement : la même analyse revient, relue en base, sans appel à l’IA', async () => {
    mockApiGet.mockResolvedValue({ lexique: [exploration(KW_A, TFIDF_A, ANALYSIS_A)] })
    const panel = setup()
    await panel.explorations.hydrateFromDb()

    expect(shown(panel, 'laine')).toEqual(A_SHOWN)
    expect(mockStartStream).not.toHaveBeenCalled()
  })

  it('changer d’onglet affiche l’analyse du mot-clé de l’onglet, puis la rend au retour', async () => {
    mockApiGet.mockResolvedValue({ lexique: [exploration(KW_A, TFIDF_A), exploration(KW_B, TFIDF_B)] })
    const panel = setup()
    await panel.explorations.hydrateFromDb()
    panel.ia.generateLexiqueUpfront()
    finishAnalysis(ANALYSIS_A)

    panel.explorations.selectExploration(KW_B)
    expect(shown(panel, 'laine'), '« laine » de B ne porte pas l’avis donné sur A').toEqual(NOTHING_SHOWN)

    panel.explorations.selectExploration(KW_A)
    expect(shown(panel, 'laine')).toEqual(A_SHOWN)
    expect(mockStartStream).toHaveBeenCalledTimes(1)
  })

  it('l’analyse part pour le mot-clé de la liste affichée, et se range sous lui', async () => {
    mockApiGet.mockResolvedValue({ lexique: [exploration(KW_A, TFIDF_A), exploration(KW_B, TFIDF_B)] })
    const panel = setup()
    await panel.explorations.hydrateFromDb()
    panel.explorations.selectExploration(KW_B)

    // Onglet « Tester un mot-clé » ouvert : la liste de B reste affichée dessous.
    panel.explorations.activeSourceKeyword.value = ''
    panel.ia.generateLexiqueUpfront()
    expect(String(mockStartStream.mock.calls.at(-1)![0])).toContain(encodeURIComponent(KW_B))
    finishAnalysis({ recommendations: [{ term: 'enduit', aiRecommended: true, aiReason: 'r' }], missingTerms: [], summary: 'Résumé des murs' })
    expect(panel.explorations.iaSummary.value).toBe('Résumé des murs')

    // Le Capitaine (A) n'a reçu aucune analyse.
    panel.explorations.selectExploration(KW_A)
    expect(shown(panel, 'laine')).toEqual(NOTHING_SHOWN)
  })

  it('une analyse terminée pour un article quitté ne s’affiche pas sur le suivant', async () => {
    mockApiGet.mockResolvedValue({ lexique: [exploration(KW_A, TFIDF_A)] })
    const articleId = ref<number | undefined>(42)
    const explorations = useLexiqueExplorations({ articleId, captainKeyword: ref<string | null>(KW_A) })
    const ia = useLexiqueIa({
      tfidfResult: explorations.tfidfResult,
      analysisKeyword: explorations.analysisKeyword,
      iaRecommendations: explorations.iaRecommendations,
      onAnalysisDone: explorations.applyIaAnalysis,
      articleLevel: ref('pilier'),
      cocoonSlug: ref(''),
      selectedArticleId: articleId,
    })
    await explorations.hydrateFromDb()
    ia.generateLexiqueUpfront()

    // Autre article, même capitaine : la réponse de l'ancien arrive après.
    articleId.value = 43
    explorations.reset()
    mockApiGet.mockResolvedValue({ lexique: [exploration(KW_A, TFIDF_A)] })
    await explorations.hydrateFromDb()
    finishAnalysis(ANALYSIS_A)

    expect(explorations.iaRecommendations.value.size).toBe(0)
    expect(explorations.iaSummary.value).toBeNull()
  })
})
