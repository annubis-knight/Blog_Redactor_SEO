// @vitest-environment node
/**
 * NFR-COST-CACHE-FIRST, FR-INFRA-KEYWORD-METRICS — le scan Radar relit
 * `keyword_metrics` avant DataForSEO et y écrit ce qu'il mesure.
 *
 * Recette 2026-09-30 (MOT-8) : le Radar ne gardait ses mesures que dans
 * `radar_explorations.scan_result` ; le Capitaine remesurait donc le même
 * mot-clé (double achat en réel, et en simulé deux chiffres différents pour un
 * même mot-clé). Et le Radar rachetait à chaque scan des mesures déjà gardées.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockOverviewBatch = vi.fn()
const mockIntentBatch = vi.fn()
vi.mock('../../../server/services/external/dataforseo.service', () => ({
  fetchKeywordOverviewBatch: (...args: unknown[]) => mockOverviewBatch(...args),
  fetchSearchIntentBatch: (...args: unknown[]) => mockIntentBatch(...args),
}))

vi.mock('../../../server/services/intent/intent-scan.service', () => ({
  fetchSerpAdvanced: vi.fn(async () => null),
  extractPaaFromSerp: vi.fn(() => []),
  extractTopicWords: vi.fn(() => []),
  matchResonanceDetailed: vi.fn(() => ({ match: 'none', quality: 'stem' })),
  bestMatch: vi.fn(() => 'none'),
  getHeatLevel: vi.fn(() => 'tiede'),
  getVerdict: vi.fn(() => ''),
  fetchAutocompleteMergedGrouped: vi.fn(async () => ({ suggestions: [], totalCount: 0 })),
  normalize: (s: string) => s.toLowerCase(),
  computePaaWeightedScore: vi.fn(() => 0),
}))

vi.mock('../../../server/services/external/autocomplete.service', () => ({
  fetchAutocomplete: vi.fn(async () => ({ suggestionsCount: 3, suggestions: ['a', 'b', 'c'], hasKeyword: false, position: null })),
}))

const PAA_ITEMS = [
  { question: 'Combien coûte un plombier ?', answer: 'Environ 60 €', depth: 1 },
  { question: 'Question fille', answer: null, depth: 2, parentQuestion: 'Combien coûte un plombier ?' },
  { question: '  ', answer: null, depth: 1 },
]
vi.mock('../../../server/services/infra/paa-cache.service', () => ({
  readPaaCache: vi.fn(async () => ({ paaItems: PAA_ITEMS })),
  writePaaCache: vi.fn(),
}))

vi.mock('../../../server/services/external/embedding.service', () => ({
  computeSemanticScores: vi.fn(async () => null),
}))

const stored = new Map<string, Record<string, unknown>>()
const mockUpsertKpis = vi.fn()
const mockUpsertPaa = vi.fn()
vi.mock('../../../server/services/keyword/keyword-metrics.service', () => ({
  getKeywordMetrics: vi.fn(async (kw: string) => stored.get(kw) ?? null),
  isKeywordMetricsFresh: (fetchedAt: string, ttlDays: number) => Date.now() - new Date(fetchedAt).getTime() < ttlDays * 86_400_000,
  upsertKeywordKpis: (...args: unknown[]) => mockUpsertKpis(...args),
  upsertKeywordPaa: (...args: unknown[]) => mockUpsertPaa(...args),
}))

vi.mock('../../../server/services/external/ai-provider.service', () => ({ classifyWithTool: vi.fn() }))
vi.mock('../../../server/utils/prompt-loader', () => ({ loadPrompt: vi.fn() }))
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { scanRadarKeywords } = await import('../../../server/services/keyword/keyword-radar.service')

function storedMeasure(overrides: Record<string, unknown> = {}) {
  return {
    searchVolume: 550000, keywordDifficulty: 54, cpc: 1.39, competition: 0.4,
    intentRaw: 0.8, intentLabel: 'transactional',
    autocompleteSuggestions: [], autocompleteSource: 'google', paaQuestions: [],
    fetchedAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  stored.clear()
  mockOverviewBatch.mockImplementation(async (kws: string[]) => new Map(kws.map(k => [k.toLowerCase(), {
    searchVolume: 673000, difficulty: 54, cpc: 4.63, competition: 0.3, monthlySearches: [],
  }])))
  mockIntentBatch.mockImplementation(async (kws: string[]) => new Map(kws.map(k => [k.toLowerCase(), {
    intent: 'informational', intentProbability: 0.9,
  }])))
})

describe('MOT-8 — le Radar écrit ses mesures dans keyword_metrics', () => {
  it('chaque mot-clé mesuré est gardé (KPI, intention, questions PAA de premier niveau)', async () => {
    await scanRadarKeywords('plombier', 'Plombier à Toulouse', [{ keyword: 'plombier toulouse urgence', reasoning: '' }], 1, undefined, 'intermediaire')

    expect(mockUpsertKpis).toHaveBeenCalledWith('plombier toulouse urgence', {
      searchVolume: 673000, keywordDifficulty: 54, cpc: 4.63, competition: 0.3,
      intentRaw: 0.9, intentLabel: 'informational',
    })
    expect(mockUpsertPaa).toHaveBeenCalledWith('plombier toulouse urgence', [
      { question: 'Combien coûte un plombier ?', answer: 'Environ 60 €' },
    ])
  })

  it('un mot-clé que DataForSEO n’a pas mesuré n’est pas écrit (pas de ligne vide « fraîche »)', async () => {
    mockOverviewBatch.mockResolvedValue(new Map())
    await scanRadarKeywords('plombier', 'Plombier', [{ keyword: 'zqxw', reasoning: '' }])
    expect(mockUpsertKpis).not.toHaveBeenCalled()
    expect(mockUpsertPaa).not.toHaveBeenCalled()
  })
})

describe('NFR-COST-CACHE-FIRST — le Radar relit keyword_metrics avant DataForSEO', () => {
  it('une mesure fraîche et complète est reprise, sans appel payant ni réécriture', async () => {
    stored.set('plombier toulouse tarif', storedMeasure())
    const result = await scanRadarKeywords('plombier', 'Plombier', [
      { keyword: 'plombier toulouse tarif', reasoning: '' },
      { keyword: 'plombier toulouse nuit', reasoning: '' },
    ])

    expect(mockOverviewBatch).toHaveBeenCalledWith(['plombier toulouse nuit'])
    expect(mockIntentBatch).toHaveBeenCalledWith(['plombier toulouse nuit'])
    const tarif = result.cards.find(c => c.keyword === 'plombier toulouse tarif')!
    expect(tarif.kpis.searchVolume, 'la même mesure qu’au Capitaine').toBe(550000)
    expect(tarif.kpis.cpc).toBe(1.39)
    expect(tarif.kpis.intentTypes).toEqual(['transactional'])
    expect(mockUpsertKpis.mock.calls.map(c => c[0])).toEqual(['plombier toulouse nuit'])
  })

  it('tout est déjà mesuré : aucun appel DataForSEO', async () => {
    stored.set('a', storedMeasure())
    stored.set('b', storedMeasure())
    await scanRadarKeywords('x', 'x', [{ keyword: 'a', reasoning: '' }, { keyword: 'b', reasoning: '' }])
    expect(mockOverviewBatch).not.toHaveBeenCalled()
    expect(mockIntentBatch).not.toHaveBeenCalled()
  })

  it('une mesure trop vieille ou incomplète est refaite', async () => {
    stored.set('vieux', storedMeasure({ fetchedAt: new Date(Date.now() - 8 * 86_400_000).toISOString() }))
    stored.set('sans cpc', storedMeasure({ cpc: null }))
    stored.set('sans intention', storedMeasure({ intentLabel: null }))
    await scanRadarKeywords('x', 'x', [
      { keyword: 'vieux', reasoning: '' }, { keyword: 'sans cpc', reasoning: '' }, { keyword: 'sans intention', reasoning: '' },
    ])
    expect(mockOverviewBatch).toHaveBeenCalledWith(['vieux', 'sans cpc', 'sans intention'])
  })
})
