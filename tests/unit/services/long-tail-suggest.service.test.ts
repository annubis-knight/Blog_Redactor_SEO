/**
 * S2 — Tests unit du service long-tail-suggest.
 *
 * Stratégie : on mocke `ai-provider.service` (classifyWithTool) et
 * `db/cache-helpers` (getCached/setCached) ET `radar-exploration.service`
 * pour rester en pure logique, sans I/O DB ni réseau.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mocks (vi.hoisted lifte ces decls AVANT vi.mock, qui est lui-meme hoiste).
const {
  mockClassifyWithTool,
  mockGetCached,
  mockSetCached,
  mockGetRadarExploration,
  mockSaveRadarExploration,
  mockPersistLongTail,
} = vi.hoisted(() => ({
  mockClassifyWithTool: vi.fn(),
  mockGetCached: vi.fn(),
  mockSetCached: vi.fn(),
  mockGetRadarExploration: vi.fn(),
  mockSaveRadarExploration: vi.fn(),
  mockPersistLongTail: vi.fn(),
}))

vi.mock('../../../server/services/external/ai-provider.service.js', () => ({
  classifyWithTool: mockClassifyWithTool,
}))
vi.mock('../../../server/db/cache-helpers.js', () => ({
  getCached: mockGetCached,
  setCached: mockSetCached,
  deleteCached: vi.fn(),
  slugify: (s: string) => s.toLowerCase(),
}))
vi.mock('../../../server/services/infra/radar-exploration.service.js', () => ({
  getRadarExploration: mockGetRadarExploration,
  saveRadarExploration: mockSaveRadarExploration,
  persistLongTailSuggestions: mockPersistLongTail,
}))
vi.mock('../../../server/utils/prompt-loader.js', () => ({
  loadPrompt: vi.fn(async (_name: string, vars: Record<string, string>) =>
    `[mocked prompt]\n${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n')}`,
  ),
  escapePromptContent: (s: string) => s,
  buildCocoonStrategyBlock: () => '',
}))
vi.mock('../../../server/utils/logger.js', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import {
  generateLongTailSuggestions,
  LongTailSuggestionsValidationError,
} from '../../../server/services/keyword/long-tail-suggest.service'

describe('moteur:radar long-tail-suggest service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClassifyWithTool.mockReset()
    mockGetCached.mockReset()
    mockSetCached.mockReset()
    mockGetRadarExploration.mockReset()
    mockSaveRadarExploration.mockReset()
  })

  const validInput = {
    articleId: 42,
    radarKeywords: [
      { keyword: 'copywriting email' },
      { keyword: 'pme industriel' },
      { keyword: 'taux conversion' },
    ],
    articleTitle: 'Copywriting B2B',
    articlePainPoint: 'Mes emails sont ignorés',
    strategyContext: '',
  }

  const validAiResponse = {
    suggestions: [
      {
        keyword: 'copywriting email pme industriel',
        rationale: 'Combine cible (PME industriel) avec format (email) — directement aligné avec la douleur',
        preferenceScore: 9,
        derivedFromRoots: ['copywriting email', 'pme industriel'],
      },
      {
        keyword: 'taux conversion email pme',
        rationale: 'Connecte la métrique de douleur (taux conversion) au format et à la cible',
        preferenceScore: 7,
        derivedFromRoots: ['copywriting email', 'taux conversion', 'pme industriel'],
      },
    ],
  }

  describe('happy path (mock provider)', () => {
    it('appelle classifyWithTool avec le prompt chargé et retourne suggestions validées', async () => {
      mockGetCached.mockResolvedValueOnce(null) // cache miss
      mockClassifyWithTool.mockResolvedValueOnce({ result: validAiResponse, usage: {} })
      mockGetRadarExploration.mockResolvedValueOnce({
        articleId: 42,
        seed: 'copywriting',
        context: { broadKeyword: '', specificTopic: '', painPoint: '', depth: 1 },
        generatedKeywords: [],
        scanResult: { cards: [] },
        scannedAt: new Date().toISOString(),
      })

      const out = await generateLongTailSuggestions(validInput)

      expect(out.suggestions).toHaveLength(2)
      expect(out.suggestions[0]!.keyword).toBe('copywriting email pme industriel')
      expect(out.suggestions[0]!.preferenceScore).toBe(9)
      expect(out.fromCache).toBe(false)
      expect(mockClassifyWithTool).toHaveBeenCalledTimes(1)
    })
  })

  describe('cache behavior', () => {
    it('cache HIT → ne rappelle pas l\'IA, retourne fromCache=true', async () => {
      mockGetCached.mockResolvedValueOnce(validAiResponse)

      const out = await generateLongTailSuggestions(validInput)

      expect(out.suggestions).toHaveLength(2)
      expect(out.fromCache).toBe(true)
      expect(mockClassifyWithTool).not.toHaveBeenCalled()
    })

    it('cache MISS → consulte cache, appelle IA, écrit dans le cache', async () => {
      mockGetCached.mockResolvedValueOnce(null)
      mockClassifyWithTool.mockResolvedValueOnce({ result: validAiResponse, usage: {} })
      mockGetRadarExploration.mockResolvedValueOnce(null)

      await generateLongTailSuggestions(validInput)

      expect(mockGetCached).toHaveBeenCalledTimes(1)
      expect(mockSetCached).toHaveBeenCalledTimes(1)
      const [cacheType, cacheKey] = mockSetCached.mock.calls[0]!
      expect(cacheType).toBe('long-tail-suggest')
      expect(typeof cacheKey).toBe('string')
      expect(cacheKey.length).toBeGreaterThan(10)
    })

    it('cache key dépend des inputs (titre + pain + keywords sorted)', async () => {
      mockGetCached.mockResolvedValue(null)
      mockClassifyWithTool.mockResolvedValue({ result: validAiResponse, usage: {} })
      mockGetRadarExploration.mockResolvedValue(null)

      await generateLongTailSuggestions(validInput)
      const keyA = mockSetCached.mock.calls[0]![1]

      // Mêmes inputs (mais ordre différent des keywords) → même clé (sorted)
      await generateLongTailSuggestions({
        ...validInput,
        radarKeywords: [
          { keyword: 'taux conversion' },
          { keyword: 'copywriting email' },
          { keyword: 'pme industriel' },
        ],
      })
      const keyB = mockSetCached.mock.calls[1]![1]

      expect(keyA).toBe(keyB)

      // Pain différent → clé différente
      await generateLongTailSuggestions({
        ...validInput,
        articlePainPoint: 'Autre douleur',
      })
      const keyC = mockSetCached.mock.calls[2]![1]
      expect(keyA).not.toBe(keyC)
    })
  })

  describe('Zod validation', () => {
    it('throw si IA retourne preferenceScore hors bornes', async () => {
      mockGetCached.mockResolvedValueOnce(null)
      mockClassifyWithTool.mockResolvedValueOnce({
        result: {
          suggestions: [
            { keyword: 'a b c', rationale: 'too long score', preferenceScore: 42, derivedFromRoots: ['a'] },
          ],
        },
        usage: {},
      })

      await expect(generateLongTailSuggestions(validInput))
        .rejects
        .toBeInstanceOf(LongTailSuggestionsValidationError)
      // Pas de cache en cas d'invalid
      expect(mockSetCached).not.toHaveBeenCalled()
    })

    it('throw si missing rationale', async () => {
      mockGetCached.mockResolvedValueOnce(null)
      mockClassifyWithTool.mockResolvedValueOnce({
        result: {
          suggestions: [
            { keyword: 'a b c', preferenceScore: 5, derivedFromRoots: ['a'] },
          ],
        },
        usage: {},
      })

      await expect(generateLongTailSuggestions(validInput))
        .rejects
        .toBeInstanceOf(LongTailSuggestionsValidationError)
    })

    it('limite à 10 suggestions max', async () => {
      mockGetCached.mockResolvedValueOnce(null)
      const overflow = {
        suggestions: Array.from({ length: 12 }, (_, i) => ({
          keyword: `kw ${i} variant`,
          rationale: 'rationale long enough for validation',
          preferenceScore: 5,
          derivedFromRoots: ['root'],
        })),
      }
      mockClassifyWithTool.mockResolvedValueOnce({ result: overflow, usage: {} })

      await expect(generateLongTailSuggestions(validInput))
        .rejects
        .toBeInstanceOf(LongTailSuggestionsValidationError)
    })
  })

  describe('input validation', () => {
    it('throw si moins de 2 radarKeywords', async () => {
      await expect(
        generateLongTailSuggestions({
          ...validInput,
          radarKeywords: [{ keyword: 'only one' }],
        }),
      ).rejects.toThrow()
    })
  })

  describe('combinator integration', () => {
    it('passe les combinaisons candidates au prompt comme variable', async () => {
      mockGetCached.mockResolvedValueOnce(null)
      mockClassifyWithTool.mockResolvedValueOnce({ result: validAiResponse, usage: {} })
      mockGetRadarExploration.mockResolvedValueOnce(null)

      await generateLongTailSuggestions(validInput)

      // Le prompt système (1er arg) doit contenir les combinaisons générées
      // par le combinator déterministe.
      const [, userPrompt] = mockClassifyWithTool.mock.calls[0]!
      const txt = String(userPrompt)
      // au moins une combinaison doit apparaître
      expect(txt.toLowerCase()).toContain('copywriting')
    })
  })
})
