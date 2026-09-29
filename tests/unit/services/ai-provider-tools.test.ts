// @vitest-environment node
/**
 * FR-RED-ENRICH-SOURCES (R9) — la recherche web ne se perd pas en route.
 *
 * Crédit Claude épuisé, la chaîne de repli passait à Gemini en jetant l'outil :
 * la passe « sources » rendait alors un texte sans aucune source réelle, sans le
 * dire. Avec un outil, seul Claude (ou la simulation) est essayé ; sinon, erreur
 * explicite.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { claude, gemini, openrouter } = vi.hoisted(() => ({
  claude: vi.fn(),
  gemini: vi.fn(),
  openrouter: vi.fn(),
}))

vi.mock('../../../server/services/external/claude.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../server/services/external/claude.service')>()),
  streamChatCompletion: claude,
}))
vi.mock('../../../server/services/external/gemini.service', () => ({
  streamChatCompletionGemini: gemini,
  classifyJsonGemini: vi.fn(),
  calculateGeminiCost: vi.fn(),
}))
vi.mock('../../../server/services/external/openrouter.service', () => ({
  streamChatCompletionOpenRouter: openrouter,
  classifyJsonOpenRouter: vi.fn(),
  calculateOpenRouterCost: vi.fn(),
}))

import {
  streamChatCompletion,
  AIProviderQuotaError,
  AIProviderUnavailableError,
  webSearchTool,
} from '../../../server/services/external/ai-provider.service'

const WEB_SEARCH = webSearchTool()

async function* texte(t: string): AsyncGenerator<string> {
  yield t
}

async function* creditEpuise(): AsyncGenerator<string> {
  yield* [] // aucun texte : l'erreur tombe au premier morceau attendu
  throw new Error('Your credit balance is too low to access the Anthropic API.')
}

async function lire(stream: AsyncGenerator<string>): Promise<string> {
  let out = ''
  for await (const chunk of stream) out += chunk
  return out
}

beforeEach(() => {
  claude.mockReset()
  gemini.mockReset()
  openrouter.mockReset()
  vi.stubEnv('AI_PROVIDER_NO_FALLBACK', '')
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('streamChatCompletion avec la recherche web', () => {
  it('Claude épuisé : pas de repli vers un fournisseur qui ne sait pas chercher', async () => {
    vi.stubEnv('AI_PROVIDER', 'claude')
    claude.mockImplementation(creditEpuise)
    gemini.mockImplementation(() => texte('texte sans source'))

    await expect(lire(streamChatCompletion('s', 'u', 4096, [WEB_SEARCH]))).rejects.toBeInstanceOf(AIProviderQuotaError)
    expect(gemini).not.toHaveBeenCalled()
    expect(openrouter).not.toHaveBeenCalled()
  })

  it('fournisseur principal Gemini : la recherche passe par Claude', async () => {
    vi.stubEnv('AI_PROVIDER', 'gemini')
    claude.mockImplementation(() => texte('texte sourcé'))

    expect(await lire(streamChatCompletion('s', 'u', 4096, [WEB_SEARCH]))).toBe('texte sourcé')
    expect(gemini).not.toHaveBeenCalled()
    expect(claude).toHaveBeenCalledWith('s', 'u', 4096, [WEB_SEARCH])
  })

  it('aucun fournisseur capable dans la chaîne : erreur qui dit pourquoi', async () => {
    vi.stubEnv('AI_PROVIDER', 'gemini')
    vi.stubEnv('AI_PROVIDER_NO_FALLBACK', '1')

    const err = await lire(streamChatCompletion('s', 'u', 4096, [WEB_SEARCH])).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AIProviderUnavailableError)
    expect((err as Error).message).toMatch(/recherche web exige Claude/)
    expect(gemini).not.toHaveBeenCalled()
  })

  it('sans outil, le repli habituel reste en place', async () => {
    vi.stubEnv('AI_PROVIDER', 'claude')
    claude.mockImplementation(creditEpuise)
    gemini.mockImplementation(() => texte('texte de repli'))

    expect(await lire(streamChatCompletion('s', 'u', 4096))).toBe('texte de repli')
  })
})
