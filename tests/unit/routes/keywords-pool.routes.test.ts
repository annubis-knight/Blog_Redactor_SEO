// @vitest-environment node
/**
 * FR-INFRA-KEYWORDS-SEO — ajouter un mot-clé au pool d'un cocon.
 *
 * Épopée qualité SEO, checklist K1 et K2 :
 *   - le type écrit doit être un `KeywordType` (`'Pilier'`…), pas le niveau
 *     d'article en minuscules que le Cerveau envoyait ;
 *   - un doublon est refusé (un mot-clé visé par deux cocons fait concurrence
 *     à lui-même), mais le refus doit dire QUEL cocon l'utilise déjà : c'est
 *     ce message que l'écran affiche.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockAddKeyword } = vi.hoisted(() => ({ mockAddKeyword: vi.fn() }))

vi.mock('../../../server/services/infra/data.service', () => ({
  getKeywordsByCocoon: vi.fn(),
  addKeyword: mockAddKeyword,
  replaceKeyword: vi.fn(),
  deleteKeyword: vi.fn(),
  loadKeywordsDb: vi.fn(),
  getArticleKeywords: vi.fn(),
  saveArticleKeywords: vi.fn(),
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

const { default: router } = await import('../../../server/routes/keywords.routes')

function createMockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

function findHandler(method: string, path: string) {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods[method],
  )
  return layer?.route?.stack[0]?.handle
}

const handler = findHandler('post', '/keywords')

async function post(body: Record<string, unknown>) {
  const res = createMockRes()
  await handler({ body } as unknown as Request, res)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /keywords — le pool du cocon', () => {
  it('écrit le type attendu par les lecteurs quand le Cerveau envoie un niveau en minuscules', async () => {
    mockAddKeyword.mockResolvedValue({ success: true })
    await post({ keyword: 'stratégie digitale pme', cocoonName: 'Cocon A', type: 'pilier' })
    expect(mockAddKeyword).toHaveBeenCalledWith(expect.objectContaining({ type: 'Pilier' }))
  })

  it('refuse un type inconnu au lieu de l’écrire tel quel', async () => {
    const res = await post({ keyword: 'x', cocoonName: 'Cocon A', type: 'chapitre' })
    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockAddKeyword).not.toHaveBeenCalled()
  })

  it('nomme le cocon qui utilise déjà le mot-clé', async () => {
    mockAddKeyword.mockResolvedValue({ success: false, duplicate: true, existingCocoon: 'Croissance digitale Toulouse' })
    const res = await post({ keyword: 'stratégie digitale pme', cocoonName: 'Cocon A', type: 'Pilier' })
    expect(res.status).toHaveBeenCalledWith(409)
    const message = String(res.json.mock.calls[0][0].error.message)
    expect(message).toContain('stratégie digitale pme')
    expect(message).toContain('Croissance digitale Toulouse')
  })
})
