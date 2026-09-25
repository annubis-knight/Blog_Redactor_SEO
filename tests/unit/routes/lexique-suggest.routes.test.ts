// @vitest-environment node
/**
 * M15 / FR-LEX-METIER-ONLY — la suggestion de lexique de la Rédaction passe par
 * le même filtre que le Moteur. Elle remplaçait le lexique par la liste brute de
 * l'IA : « être » ou « vos » y entraient sans filtre ni porte, jusqu'à la
 * publication.
 */
import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'

vi.mock('../../../server/services/infra/data.service', () => ({}))
vi.mock('../../../server/services/external/dataforseo.service', () => ({}))
vi.mock('../../../server/services/keyword/keyword-discovery.service', () => ({}))
vi.mock('../../../server/utils/prompt-loader.js', () => ({
  loadPrompt: vi.fn(async () => 'prompt'),
}))
vi.mock('../../../server/utils/stream-usage.js', () => ({
  collectStreamWithUsage: vi.fn(async () => ({
    text: '["garantie décennale", "être", "vos", "isolation des combles", "cookies"]',
    usage: null,
  })),
}))
vi.mock('../../../server/services/queries/article-pain-point.service.js', () => ({
  getArticlePainPoint: vi.fn(async () => '(non defini)'),
}))

const { default: router } = await import('../../../server/routes/keywords.routes')

function findHandler(method: string, path: string) {
  const layer = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: (req: Request, res: Response) => Promise<void> }> } }> })
    .stack.find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer?.route) throw new Error(`route ${method} ${path} introuvable`)
  return layer.route.stack[0]!.handle
}

describe('POST /keywords/lexique-suggest', () => {
  it('ne renvoie que des termes du métier, et dit lesquels ont été écartés', async () => {
    const json = vi.fn()
    const res = { status: vi.fn().mockReturnThis(), json } as unknown as Response
    await findHandler('post', '/keywords/lexique-suggest')({ body: { capitaine: 'isolation combles', articleTitle: 'Guide', cocoonName: '' } } as Request, res)

    expect(json).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lexique: ['garantie décennale', 'isolation des combles'],
        rejected: ['être', 'vos', 'cookies'],
      }),
    })
  })
})
