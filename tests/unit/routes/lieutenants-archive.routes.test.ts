// @vitest-environment node
/**
 * FR-INFRA-LIEUTENANT-EXPLORATIONS — POST /api/articles/:id/lieutenants/archive
 * (recette du 2026-09-30, INFRA-18).
 *
 * « Tout réinitialiser » archive les lieutenants verrouillés : l'écran envoie
 * leurs mots-clés, et seuls ceux-là passent au statut « archivé ». Sans liste,
 * la route garde son contrat : tout ce qui n'est pas encore archivé l'est.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockArchive } = vi.hoisted(() => ({ mockArchive: vi.fn() }))

vi.mock('../../../server/services/infra/data.service', () => ({
  archiveLieutenantExplorations: mockArchive,
}))

vi.mock('../../../server/services/external/dataforseo.service', () => ({
  auditCocoonKeywords: vi.fn(),
  getAuditCacheStatus: vi.fn(),
  detectRedundancy: vi.fn(),
}))

vi.mock('../../../server/services/keyword/keyword-discovery.service', () => ({
  discoverKeywords: vi.fn(),
  discoverFromDomain: vi.fn(),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { default: router } = await import('../../../server/routes/keywords.routes')

function createMockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

function archiveHandler() {
  const layer = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: (req: Request, res: Response) => Promise<void> }> } }> }).stack
    .find(l => l.route?.path === '/articles/:id/lieutenants/archive' && l.route.methods.post)
  if (!layer?.route) throw new Error('route introuvable')
  return layer.route.stack[0]!.handle
}

async function post(id: string, body: unknown) {
  const res = createMockRes()
  await archiveHandler()({ params: { id }, body } as unknown as Request, res)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  mockArchive.mockResolvedValue(2)
})

describe('FR-INFRA-LIEUTENANT-EXPLORATIONS — POST /articles/:id/lieutenants/archive', () => {
  it('avec les mots-clés des lieutenants verrouillés : seuls ceux-là sont archivés', async () => {
    const res = await post('1342', { keywords: ['prix erreurs à éviter', 'erreurs à éviter avis'] })

    expect(mockArchive).toHaveBeenCalledWith(1342, ['prix erreurs à éviter', 'erreurs à éviter avis'])
    expect(res.json).toHaveBeenCalledWith({ data: { archived: 2 } })
  })

  it('sans corps : tout ce qui n’est pas archivé l’est (contrat inchangé)', async () => {
    await post('1342', {})

    expect(mockArchive).toHaveBeenCalledWith(1342, undefined)
  })

  it('une liste illisible est refusée (400), rien n’est archivé', async () => {
    const res = await post('1342', { keywords: 'prix erreurs à éviter' })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockArchive).not.toHaveBeenCalled()
  })
})
