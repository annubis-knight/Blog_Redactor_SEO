// @vitest-environment node
/**
 * FR-INFRA-RUNTIME-MODE — routes Express GET/POST /api/runtime-mode.
 *
 * Couvre AC5 (validation Zod sur POST) + comportement nominal des handlers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { default: router } = await import('../../../server/routes/runtime-mode.routes')
const { setRuntimeMode } = await import('../../../server/services/infra/runtime-mode.service')

interface MockRes extends Response {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
}

function createMockRes(): MockRes {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as MockRes
}

interface RouteLayer {
  route?: {
    path: string
    methods: Record<string, boolean>
    stack: Array<{ handle: (req: Request, res: Response) => unknown }>
  }
}

function findHandler(method: string, path: string) {
  const stack = (router as unknown as { stack: RouteLayer[] }).stack
  const layer = stack.find((l) => l.route?.path === path && l.route?.methods[method])
  return layer?.route?.stack[0]?.handle
}

beforeEach(() => {
  setRuntimeMode(null)
  vi.unstubAllEnvs()
})

describe('GET /runtime-mode', () => {
  const handler = findHandler('get', '/runtime-mode')

  it('retourne override null + effective dérivé du .env quand aucun override', async () => {
    vi.stubEnv('AI_PROVIDER', 'claude')
    vi.stubEnv('DATAFORSEO_SANDBOX', 'false')

    const req = {} as Request
    const res = createMockRes()
    await handler!(req, res)

    expect(res.json).toHaveBeenCalledWith({
      data: {
        override: null,
        effective: 'real',
        envAiProvider: 'claude',
        envDataforseoSandbox: false,
        aiProvider: 'claude',
      },
    })
  })

  it('retourne l\'override courant quand posé', async () => {
    setRuntimeMode('mock')
    const req = {} as Request
    const res = createMockRes()
    await handler!(req, res)

    expect(res.json).toHaveBeenCalledWith({
      data: expect.objectContaining({ override: 'mock', effective: 'mock' }),
    })
  })
})

// FR-CAP-AI-PANEL — le fournisseur d'IA effectif part avec le mode : la
// confirmation d'une régénération le nomme (« un appel Gemini ») ou dit
// qu'aucun appel payant ne part en mode simulé.
describe('FR-CAP-AI-PANEL — GET /runtime-mode nomme le fournisseur d’IA effectif', () => {
  const handler = findHandler('get', '/runtime-mode')

  async function aiProviderOf(): Promise<unknown> {
    const res = createMockRes()
    await handler!({} as Request, res)
    return (res.json.mock.calls[0]![0] as { data: { aiProvider: unknown } }).data.aiProvider
  }

  it('AI_PROVIDER=gemini sans override → gemini', async () => {
    vi.stubEnv('AI_PROVIDER', 'gemini')
    vi.stubEnv('DATAFORSEO_SANDBOX', 'false')
    expect(await aiProviderOf()).toBe('gemini')
  })

  it('bouton sur MOCK → mock, même avec AI_PROVIDER=claude', async () => {
    vi.stubEnv('AI_PROVIDER', 'claude')
    setRuntimeMode('mock')
    expect(await aiProviderOf()).toBe('mock')
  })

  it('bouton sur RÉEL → claude, le fournisseur réel par défaut', async () => {
    vi.stubEnv('AI_PROVIDER', 'gemini')
    setRuntimeMode('real')
    expect(await aiProviderOf()).toBe('claude')
  })

  it('bac à sable seul (DATAFORSEO_SANDBOX=true) → mock : rien de facturé', async () => {
    vi.stubEnv('AI_PROVIDER', 'claude')
    vi.stubEnv('DATAFORSEO_SANDBOX', 'true')
    expect(await aiProviderOf()).toBe('mock')
  })
})

describe('POST /runtime-mode', () => {
  const handler = findHandler('post', '/runtime-mode')

  it('accepte mode="mock" et persiste l\'override en mémoire', async () => {
    const req = { body: { mode: 'mock' } } as Request
    const res = createMockRes()
    await handler!(req, res)

    expect(res.status).not.toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      data: { override: 'mock', effective: 'mock', aiProvider: 'mock' },
    })
  })

  it('accepte mode="real"', async () => {
    const req = { body: { mode: 'real' } } as Request
    const res = createMockRes()
    await handler!(req, res)
    expect(res.json).toHaveBeenCalledWith({
      data: { override: 'real', effective: 'real', aiProvider: 'claude' },
    })
  })

  it('accepte mode=null pour effacer l\'override', async () => {
    setRuntimeMode('mock')
    vi.stubEnv('AI_PROVIDER', 'claude')
    vi.stubEnv('DATAFORSEO_SANDBOX', 'false')

    const req = { body: { mode: null } } as Request
    const res = createMockRes()
    await handler!(req, res)

    expect(res.json).toHaveBeenCalledWith({
      data: { override: null, effective: 'real', aiProvider: 'claude' },
    })
  })

  it('AC5 : rejette mode="invalid" avec 400 (validation Zod)', async () => {
    const req = { body: { mode: 'invalid' } } as Request
    const res = createMockRes()
    await handler!(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    })
  })

  it('AC5 : rejette body sans mode avec 400', async () => {
    const req = { body: {} } as Request
    const res = createMockRes()
    await handler!(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('AC5 : rejette mode numérique avec 400', async () => {
    const req = { body: { mode: 1 } } as Request
    const res = createMockRes()
    await handler!(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})
