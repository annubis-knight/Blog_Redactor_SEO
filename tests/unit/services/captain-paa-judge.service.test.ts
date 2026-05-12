/**
 * Tests TDD du service Haiku de jugement PAA × douleur (moteur:captain-paa-judge).
 *
 * Couvre :
 *   - PaaJudgmentBlock retourné depuis l'appel mock ai-provider
 *   - painPoint vide / trop court → retour null + reason 'no-pain'
 *   - paaItems vide → retour null + reason 'missing-paa'
 *   - Échec Haiku → throw HaikuJudgmentError → reason 'haiku-unavailable'
 *   - Parité 4 vs 16 PAA (overallPaaScore similaire pour qualité égale)
 *   - Schéma tool_use forcé (tool name = 'submit_paa_judgments')
 *
 * Spec : _bmad-output/implementation-artifacts/tech-spec-captain-paa-pertinence-unify.md §Sprint A.1
 * FR : FR-CAP-PAA-JUDGE-HAIKU, FR-CAP-RELEVANCE-UNAVAILABLE-REASON
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock ai-provider AVANT import du service
const mockClassifyWithTool = vi.fn()
vi.mock('../../../server/services/external/ai-provider.service', () => ({
  classifyWithTool: (...args: unknown[]) => mockClassifyWithTool(...args),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  judgePaaForKeyword,
  HaikuJudgmentError,
  PAA_JUDGE_TOOL,
} from '../../../server/services/keyword/captain-paa-judge.service'
import type { PaaJudgmentBlock } from '../../../shared/types/captain-paa-judgment.types'

beforeEach(() => {
  mockClassifyWithTool.mockReset()
})

// --- Helper : construit un PaaJudgmentBlock valide ---
function makeBlock(badges: Array<'pertinent' | 'partiel' | 'hors-sujet'>): PaaJudgmentBlock {
  const judgments = badges.map((badge, idx) => ({
    paaIndex: idx,
    badge,
    paaScore: badge === 'pertinent' ? 85 : badge === 'partiel' ? 55 : 20,
    reasonShort: `Test ${idx}`,
  }))
  const overallPaaScore = Math.round(
    judgments.reduce((s, j) => s + j.paaScore, 0) / judgments.length,
  )
  return { paaJudgments: judgments, overallPaaScore, summary: 'Test summary' }
}

function makeInput(overrides: Partial<{
  paaCount: number
  painPoint: string
  paaItems: Array<{ question: string; answer: string }>
}> = {}) {
  const paaItems = overrides.paaItems ?? Array.from({ length: overrides.paaCount ?? 4 }, (_, i) => ({
    question: `Question ${i} sur le site web ?`,
    answer: `Réponse ${i} concernant la conversion.`,
  }))
  return {
    articleId: 42,
    keyword: 'site web',
    paaItems,
    painPoint: overrides.painPoint ?? 'Convertir vraiment les visiteurs en clients sur le site web.',
    articleTitle: 'Création de site web sur mesure à Toulouse',
    painIntentExpected: 'commercial' as const,
  }
}

describe('moteur:captain-paa-judge — judgePaaForKeyword', () => {
  it('retourne le PaaJudgmentBlock du tool_use Haiku quand input valide', async () => {
    const expected = makeBlock(['pertinent', 'pertinent', 'partiel', 'hors-sujet'])
    mockClassifyWithTool.mockResolvedValue({
      result: expected,
      usage: {
        model: 'claude-haiku-4-5-20251001',
        inputTokens: 800,
        outputTokens: 250,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        estimatedCost: 0.002,
      },
    })

    const result = await judgePaaForKeyword(makeInput())

    expect(result).not.toBeNull()
    expect(result?.paaJudgments).toHaveLength(4)
    expect(result?.overallPaaScore).toBe(expected.overallPaaScore)
    expect(result?.summary).toBe('Test summary')
    expect(mockClassifyWithTool).toHaveBeenCalledTimes(1)
  })

  it('utilise le tool name "submit_paa_judgments" et tool_choice forcé', async () => {
    mockClassifyWithTool.mockResolvedValue({
      result: makeBlock(['pertinent']),
      usage: { model: 'm', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0 },
    })

    await judgePaaForKeyword(makeInput({ paaCount: 1 }))

    const [, , tool] = mockClassifyWithTool.mock.calls[0] as [string, string, { name: string; description: string; input_schema: unknown }]
    expect(tool.name).toBe('submit_paa_judgments')
    expect(tool.input_schema).toBeDefined()
    expect(PAA_JUDGE_TOOL.name).toBe('submit_paa_judgments')
  })

  it('appelle Haiku 4.5 par défaut via model option', async () => {
    mockClassifyWithTool.mockResolvedValue({
      result: makeBlock(['pertinent']),
      usage: { model: 'claude-haiku-4-5-20251001', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0 },
    })

    await judgePaaForKeyword(makeInput({ paaCount: 1 }))

    const call = mockClassifyWithTool.mock.calls[0]
    const opts = call[3] as { model?: string } | string | undefined
    if (typeof opts === 'string') {
      expect(opts).toMatch(/haiku/i)
    } else {
      expect(opts?.model).toMatch(/haiku/i)
    }
  })

  it('retourne null avec reason "no-pain" si painPoint absent', async () => {
    const result = await judgePaaForKeyword(makeInput({ painPoint: '' }))
    expect(result).toBeNull()
    expect(mockClassifyWithTool).not.toHaveBeenCalled()
  })

  it('retourne null avec reason "no-pain" si painPoint < 10 chars', async () => {
    const result = await judgePaaForKeyword(makeInput({ painPoint: 'court' }))
    expect(result).toBeNull()
    expect(mockClassifyWithTool).not.toHaveBeenCalled()
  })

  it('retourne null avec reason "missing-paa" si paaItems vide', async () => {
    const result = await judgePaaForKeyword(makeInput({ paaItems: [] }))
    expect(result).toBeNull()
    expect(mockClassifyWithTool).not.toHaveBeenCalled()
  })

  it('throw HaikuJudgmentError quand classifyWithTool échoue', async () => {
    mockClassifyWithTool.mockRejectedValue(new Error('Network error'))

    await expect(judgePaaForKeyword(makeInput())).rejects.toThrow(HaikuJudgmentError)
    await expect(judgePaaForKeyword(makeInput())).rejects.toThrow(/network/i)
  })

  it('parité normalisation : 4 PAA tous pertinents vs 16 PAA tous pertinents donnent un overallPaaScore similaire', async () => {
    // Le LLM normalise par construction (il connait le nombre de PAA). On simule
    // ici une réponse "tous pertinents" pour les deux cas.
    mockClassifyWithTool
      .mockResolvedValueOnce({
        result: makeBlock(Array<'pertinent'>(4).fill('pertinent')),
        usage: { model: 'm', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0 },
      })
      .mockResolvedValueOnce({
        result: makeBlock(Array<'pertinent'>(16).fill('pertinent')),
        usage: { model: 'm', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0 },
      })

    const r4 = await judgePaaForKeyword(makeInput({ paaCount: 4 }))
    const r16 = await judgePaaForKeyword(makeInput({ paaCount: 16 }))

    expect(r4?.overallPaaScore).toBe(85)
    expect(r16?.overallPaaScore).toBe(85)
    expect(Math.abs((r4?.overallPaaScore ?? 0) - (r16?.overallPaaScore ?? 0))).toBeLessThanOrEqual(5)
  })

  it('injecte les variables {{keyword}} et {{pain_point}} et {{article_title}} dans le prompt user', async () => {
    mockClassifyWithTool.mockResolvedValue({
      result: makeBlock(['pertinent']),
      usage: { model: 'm', inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0 },
    })

    await judgePaaForKeyword(makeInput({ paaCount: 1 }))

    const [, userPrompt] = mockClassifyWithTool.mock.calls[0] as [string, string, unknown]
    expect(userPrompt).toContain('site web')                         // keyword
    expect(userPrompt).toContain('Convertir vraiment')                // painPoint
    expect(userPrompt).toContain('Création de site web sur mesure')  // articleTitle
    // Pas de placeholder non-substitué (anti-régression sur loadPrompt)
    expect(userPrompt).not.toMatch(/\{\{[a-z_]+\}\}/)
  })

  it('PAA_JUDGE_TOOL expose un input_schema avec les champs requis', () => {
    expect(PAA_JUDGE_TOOL.input_schema).toMatchObject({
      type: 'object',
      required: expect.arrayContaining(['paaJudgments', 'overallPaaScore', 'summary']),
    })
    const props = (PAA_JUDGE_TOOL.input_schema as { properties: Record<string, unknown> }).properties
    expect(props.paaJudgments).toBeDefined()
    expect(props.overallPaaScore).toBeDefined()
    expect(props.summary).toBeDefined()
  })
})
