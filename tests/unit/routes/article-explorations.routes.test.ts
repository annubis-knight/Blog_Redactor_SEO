// @vitest-environment node
/**
 * Routes des explorations d'un article — M3 (épopée qualité SEO).
 *
 * `keyword_intent_analyses` n'a plus de producteur depuis la suppression de
 * `/api/intent/analyze` : ses lignes étaient figées et aucun écran ne les
 * lisait. Décision : supprimer le code qui la relisait, garder la table.
 * Ces tests verrouillent la décision : ni le groupe `intent` de
 * GET /articles/:id/explorations, ni le compteur `intent` de
 * GET /articles/:id/explorations/counts, ni aucune lecture de la table.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

const m = vi.hoisted(() => ({
  query: vi.fn(),
  getArticleKeywords: vi.fn(),
  getCaptainExplorations: vi.fn(),
  getLieutenantExplorations: vi.fn(),
  getRadarExploration: vi.fn(),
  getKeywordMetrics: vi.fn(),
  listLexiqueExplorations: vi.fn(),
}))

vi.mock('../../../server/db/client', () => ({ query: m.query, pool: { query: m.query } }))
vi.mock('../../../server/db/cache-helpers', () => ({ getCached: vi.fn(), slugify: (s: string) => s }))
vi.mock('../../../server/services/infra/data.service', () => ({
  getArticleKeywords: m.getArticleKeywords,
  getCaptainExplorations: m.getCaptainExplorations,
  getLieutenantExplorations: m.getLieutenantExplorations,
}))
vi.mock('../../../server/services/infra/radar-exploration.service', () => ({ getRadarExploration: m.getRadarExploration }))
vi.mock('../../../server/services/keyword/keyword-metrics.service', () => ({ getKeywordMetrics: m.getKeywordMetrics }))
vi.mock('../../../server/services/keyword/lexique-exploration.service', () => ({ listLexiqueExplorations: m.listLexiqueExplorations }))
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import router from '../../../server/routes/article-explorations.routes'

interface FakeRes { statusCode: number; json: Mock; status: Mock }
type Handler = (req: unknown, res: FakeRes) => Promise<void>
interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Handler }> }
}

function makeReq(id: string) {
  return { params: { id }, query: {}, body: {} }
}

function makeRes(): FakeRes {
  const res = { statusCode: 200 } as FakeRes
  res.json = vi.fn().mockReturnValue(res)
  res.status = vi.fn((code: number) => { res.statusCode = code; return res })
  return res
}

function getHandler(method: string, path: string): Handler {
  const layer = (router as unknown as { stack: RouteLayer[] }).stack.find(
    l => l.route?.path === path && l.route?.methods?.[method],
  )
  if (!layer?.route) throw new Error(`route ${method.toUpperCase()} ${path} introuvable`)
  return layer.route.stack[0]!.handle
}

/** Toutes les requêtes SQL émises pendant le test, en un bloc. */
function sqlSeen(): string {
  return m.query.mock.calls.map(c => String(c[0])).join('\n---\n')
}

/** `data` de la première réponse `res.json({ data })`. */
function jsonData(res: FakeRes): Record<string, unknown> {
  return (res.json.mock.calls[0]![0] as { data: Record<string, unknown> }).data
}

beforeEach(() => {
  vi.resetAllMocks()
  m.getArticleKeywords.mockResolvedValue({
    data: { capitaine: 'plombier toulouse', lieutenants: ['plombier urgence'] },
  })
  m.getCaptainExplorations.mockResolvedValue({ data: [], dbOps: [] })
  m.getLieutenantExplorations.mockResolvedValue({ data: [], dbOps: [] })
  m.getRadarExploration.mockResolvedValue(null)
  m.listLexiqueExplorations.mockResolvedValue([])
  m.getKeywordMetrics.mockResolvedValue({
    localAnalysis: { hasLocalPack: true, listings: [] },
    contentGapAnalysis: null,
  })
  m.query.mockResolvedValue({ rows: [], rowCount: 0 })
})

describe('GET /articles/:id/explorations — M3', () => {
  const handler = getHandler('get', '/articles/:id/explorations')

  it('ne sert plus de groupe `intent` ; les analyses locale et de contenu manquant restent', async () => {
    const res = makeRes()
    await handler(makeReq('12'), res)

    expect(res.status).not.toHaveBeenCalled()
    const data = jsonData(res)
    expect(data).not.toHaveProperty('intent')
    const local = data.local as { capitaine: unknown; all: unknown[] }
    expect(local.capitaine).toEqual({ hasLocalPack: true, listings: [] })
    expect(local.all).toHaveLength(2) // capitaine + 1 lieutenant
    expect(data.contentGap).toEqual({ capitaine: null, all: [] })
  })

  it('ne lit plus `keyword_intent_analyses`', async () => {
    await handler(makeReq('12'), makeRes())
    expect(sqlSeen()).not.toMatch(/keyword_intent_analyses/i)
  })
})

describe('GET /articles/:id/explorations/counts — M3', () => {
  const handler = getHandler('get', '/articles/:id/explorations/counts')

  it('compte 7 sources, sans `intent` ni lecture de `keyword_intent_analyses`', async () => {
    await handler(makeReq('12'), makeRes())

    const sql = sqlSeen()
    expect(sql).not.toMatch(/keyword_intent_analyses/i)
    const sources = [...sql.matchAll(/SELECT '(\w+)'/g)].map(x => x[1])
    expect(sources).toEqual(['radar', 'captain', 'lieutenants', 'paa', 'lexique', 'local', 'contentGap'])
  })

  it('la réponse n’a pas de clé `intent`', async () => {
    m.query.mockResolvedValue({
      rows: ['radar', 'captain', 'lieutenants', 'paa', 'lexique', 'local', 'contentGap']
        .map(source => ({ source, count: '0' })),
      rowCount: 7,
    })
    const res = makeRes()
    await handler(makeReq('12'), res)

    const data = jsonData(res)
    expect(Object.keys(data)).toHaveLength(7)
    expect(data).not.toHaveProperty('intent')
  })
})
