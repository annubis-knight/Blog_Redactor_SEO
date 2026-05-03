// @vitest-environment node
/**
 * Tests de caractérisation pour keyword-radar.service.
 *
 * S2.1 — Sprint 2 stabilisation. On fige le **contrat de surface** de
 * `generateRadarKeywords` (forme du retour, dédoublonnage, cap à 25).
 * Le orchestrateur `scanRadarKeywords` est trop couplé pour un unit test
 * propre — couverture déléguée aux tests d'intégration.
 *
 * **Pré-requis cartographie (CLAUDE.md §2.0)** : ce service produit
 * RadarCard.{marketScore, relevanceScore} consommés par RadarKeywordCard
 * (affichage) et useRadarRanking (tri). La séparation affichage/calcul
 * sera durcie en Sprint 3 via shared/score/.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks de TOUTES les deps externes — ce service est un orchestrateur lourd
const mockClassifyWithTool = vi.fn()
const mockLoadPrompt = vi.fn()

vi.mock('../../../server/services/external/ai-provider.service', () => ({
  classifyWithTool: (...args: unknown[]) => mockClassifyWithTool(...args),
}))

vi.mock('../../../server/utils/prompt-loader', () => ({
  loadPrompt: (...args: unknown[]) => mockLoadPrompt(...args),
}))

vi.mock('../../../server/services/external/dataforseo.service', () => ({
  fetchKeywordOverviewBatch: vi.fn(),
  fetchSearchIntentBatch: vi.fn(),
}))

vi.mock('../../../server/services/intent/intent-scan.service', () => ({
  fetchSerpAdvanced: vi.fn(),
  extractPaaFromSerp: vi.fn(() => []),
  extractTopicWords: vi.fn(() => []),
  matchResonance: vi.fn(),
  matchResonanceDetailed: vi.fn(),
  bestMatch: vi.fn(),
  getHeatLevel: vi.fn(),
  getVerdict: vi.fn(),
  fetchAutocompleteMergedGrouped: vi.fn(),
  // Vraie fonction `normalize` pour que la déduplication fonctionne
  normalize: (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(),
  computePaaWeightedScore: vi.fn(),
  computePaaPainAlignmentCumulative: vi.fn(),
}))

vi.mock('../../../server/services/infra/paa-cache.service', () => ({
  readPaaCache: vi.fn(),
  writePaaCache: vi.fn(),
}))

vi.mock('../../../server/services/external/embedding.service', () => ({
  computeSemanticScores: vi.fn(),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { generateRadarKeywords } = await import('../../../server/services/keyword/keyword-radar.service')

const fakeUsage = {
  inputTokens: 100,
  outputTokens: 50,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  model: 'haiku',
  estimatedCost: 0.001,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadPrompt.mockResolvedValue('mock prompt')
})

describe('moteur:keyword-radar:generateRadarKeywords', () => {
  it('returns the expected shape (articleTitle, articleKeyword, painPoint, keywords[], generatedAt)', async () => {
    mockClassifyWithTool.mockResolvedValueOnce({
      result: { keywords: [{ keyword: 'seo audit', reasoning: 'pertinence' }] },
      usage: fakeUsage,
    })
    const result = await generateRadarKeywords('Article', 'seo', 'Pas trouvable')
    expect(result).toMatchObject({
      articleTitle: 'Article',
      articleKeyword: 'seo',
      painPoint: 'Pas trouvable',
      keywords: expect.any(Array),
      generatedAt: expect.any(String),
    })
  })

  it('returns ISO 8601 generatedAt', async () => {
    mockClassifyWithTool.mockResolvedValueOnce({ result: { keywords: [] }, usage: fakeUsage })
    const result = await generateRadarKeywords('a', 'b', 'c')
    expect(() => new Date(result.generatedAt).toISOString()).not.toThrow()
  })

  it('caps keywords at 25 even if AI returns more', async () => {
    const lots = Array.from({ length: 40 }, (_, i) => ({
      keyword: `keyword${i}`,
      reasoning: `r${i}`,
    }))
    mockClassifyWithTool.mockResolvedValueOnce({ result: { keywords: lots }, usage: fakeUsage })
    const result = await generateRadarKeywords('a', 'b', 'c')
    expect(result.keywords).toHaveLength(25)
  })

  it('deduplicates keywords by normalized form (case + accents insensitive)', async () => {
    mockClassifyWithTool.mockResolvedValueOnce({
      result: {
        keywords: [
          { keyword: 'SEO Audit', reasoning: 'r1' },
          { keyword: 'seo audit', reasoning: 'r2' }, // doublon
          { keyword: 'séo audit', reasoning: 'r3' }, // doublon (accent)
          { keyword: 'autre', reasoning: 'r4' },
        ],
      },
      usage: fakeUsage,
    })
    const result = await generateRadarKeywords('a', 'b', 'c')
    expect(result.keywords).toHaveLength(2)
    // Le premier gagne
    expect(result.keywords[0]!.keyword).toBe('SEO Audit')
  })

  it('filters out empty keywords', async () => {
    mockClassifyWithTool.mockResolvedValueOnce({
      result: {
        keywords: [
          { keyword: '', reasoning: 'r' },
          { keyword: '   ', reasoning: 'r' },
          { keyword: 'valide', reasoning: 'r' },
        ],
      },
      usage: fakeUsage,
    })
    const result = await generateRadarKeywords('a', 'b', 'c')
    expect(result.keywords).toHaveLength(1)
    expect(result.keywords[0]!.keyword).toBe('valide')
  })

  it('trims keyword and reasoning', async () => {
    mockClassifyWithTool.mockResolvedValueOnce({
      result: {
        keywords: [{ keyword: '  seo  ', reasoning: '  raison  ' }],
      },
      usage: fakeUsage,
    })
    const result = await generateRadarKeywords('a', 'b', 'c')
    expect(result.keywords[0]).toEqual({ keyword: 'seo', reasoning: 'raison' })
  })

  it('returns empty keywords when AI call fails — does not throw', async () => {
    mockClassifyWithTool.mockRejectedValueOnce(new Error('AI down'))
    const result = await generateRadarKeywords('a', 'b', 'c')
    expect(result.keywords).toEqual([])
  })

  it('handles AI returning malformed payload (no keywords key)', async () => {
    // @ts-expect-error - shape volontairement malformée pour caractérisation
    mockClassifyWithTool.mockResolvedValueOnce({ result: {}, usage: fakeUsage })
    const result = await generateRadarKeywords('a', 'b', 'c')
    expect(result.keywords).toEqual([])
  })

  it('passes painPoint through unchanged', async () => {
    mockClassifyWithTool.mockResolvedValueOnce({ result: { keywords: [] }, usage: fakeUsage })
    const painPoint = 'Pain spécifique avec accents éàù'
    const result = await generateRadarKeywords('t', 'k', painPoint)
    expect(result.painPoint).toBe(painPoint)
  })
})
