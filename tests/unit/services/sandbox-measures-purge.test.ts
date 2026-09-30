// @vitest-environment node
/**
 * FR-EXT-DATAFORSEO-SANDBOX — les mesures de mots-clés obtenues en simulé ne
 * sont jamais servies en réel.
 *
 * Recette du 2026-09-30 : préparées en simulé (gratuit), les mesures gardées
 * par mot-clé (`keyword_metrics` et ses tables filles : KPI, questions PAA,
 * pages concurrentes du Lexique) étaient resservies en réel comme de vraies
 * mesures ; 158 mesures factices avaient dû être effacées à la main.
 *
 * Décision (Arnaud, lot 6) : toute écriture venue d'une source simulée marque
 * la ligne (`from_sandbox`) ; au passage en réel — bouton ou démarrage du
 * serveur en réel — les lignes marquées sont effacées (les tables filles
 * suivent par cascade). Le Capitaine affiche alors « non mesuré » jusqu'à une
 * vraie étude. En simulé, rien n'est effacé : les parcours simulés relisent la
 * base.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Request, Response } from 'express'

const m = vi.hoisted(() => ({
  queries: [] as Array<{ sql: string; params: unknown[] }>,
  failDelete: false,
  fetchSerp: vi.fn(),
  fetchPaa: vi.fn(),
  txQueries: [] as Array<{ sql: string; params: unknown[] }>,
}))

vi.mock('../../../server/db/client', () => {
  const query = async (sql: string, params: unknown[] = []) => {
    m.queries.push({ sql, params })
    if (/DELETE FROM keyword_metrics/i.test(sql)) {
      if (m.failDelete) throw new Error('connexion perdue')
      return { rows: [], rowCount: 3 }
    }
    return { rows: [], rowCount: 1 }
  }
  return { query, pool: { query } }
})
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('../../../server/services/external/dataforseo.service', () => ({
  fetchSerp: (...args: unknown[]) => m.fetchSerp(...args),
  fetchPaa: (...args: unknown[]) => m.fetchPaa(...args),
}))
vi.mock('../../../server/services/keyword/keyword-serp.service', () => ({
  getSerpResultsFresh: vi.fn(async () => null),
  reconstructSerpAnalysisResult: vi.fn(async () => null),
  upsertSerpResults: vi.fn(async () => undefined),
  upsertSerpScrapes: vi.fn(async () => undefined),
  upsertPaaQuestions: vi.fn(async () => undefined),
  getPaaQuestions: vi.fn(async () => []),
  withSerpTransaction: async (fn: (client: unknown) => Promise<unknown>) =>
    fn({
      query: async (sql: string, params: unknown[] = []) => {
        m.txQueries.push({ sql, params })
        return { rowCount: 1 }
      },
    }),
}))
vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '<main><h2>Titre</h2><p>Texte</p></main>' })))

import { setRuntimeMode, getRuntimeMode } from '../../../server/services/infra/runtime-mode.service'
import {
  upsertKeywordKpis,
  upsertKeywordPaa,
  upsertKeywordContentGap,
  upsertKeywordAutocomplete,
  purgeSandboxMeasures,
  purgeSandboxMeasuresIfReal,
} from '../../../server/services/keyword/keyword-metrics.service'
import { fetchAndPersist, __resetMemoryCacheForTests } from '../../../server/services/external/scrape-corpus.service'
import runtimeModeRouter from '../../../server/routes/runtime-mode.routes'

const ROOT = join(__dirname, '..', '..', '..')
const CHANGE_FILE = join(ROOT, 'server', 'db', 'changes', '2026-09-30-keyword-metrics-from-sandbox.sql')

function lastWrite(): { sql: string; params: unknown[] } {
  const write = [...m.queries].reverse().find(q => /INSERT INTO keyword_metrics/i.test(q.sql))
  expect(write, 'écriture dans keyword_metrics attendue').toBeDefined()
  return write!
}

function deletes(): number {
  return m.queries.filter(q => /DELETE FROM keyword_metrics/i.test(q.sql)).length
}

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: (req: Request, res: Response) => unknown }> }
}
function postHandler() {
  const stack = (runtimeModeRouter as unknown as { stack: RouteLayer[] }).stack
  return stack.find(l => l.route?.path === '/runtime-mode' && l.route?.methods.post)!.route!.stack[0]!.handle
}
function mockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response & {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  m.queries.length = 0
  m.txQueries.length = 0
  m.failDelete = false
  m.fetchSerp.mockClear()
  m.fetchPaa.mockClear()
  m.fetchSerp.mockResolvedValue([{ position: 1, title: 'Pizza London', url: 'https://example.com/1', description: '', domain: 'example.com' }])
  m.fetchPaa.mockResolvedValue([{ question: 'Où manger une pizza à Londres ?', answer: null }])
  __resetMemoryCacheForTests()
  setRuntimeMode(null)
  vi.unstubAllEnvs()
})

afterEach(() => {
  setRuntimeMode(null)
  vi.unstubAllEnvs()
})

describe('FR-EXT-DATAFORSEO-SANDBOX — une mesure obtenue en simulé est marquée', () => {
  it('les KPI mesurés en simulé marquent la ligne', async () => {
    setRuntimeMode('mock')
    await upsertKeywordKpis('plombier toulouse', { searchVolume: 673000, keywordDifficulty: 54, cpc: 4.63 })
    const { sql, params } = lastWrite()
    expect(sql).toMatch(/from_sandbox/)
    expect(params.at(-1)).toBe(true)
  })

  it('les KPI mesurés en réel ne marquent pas la ligne, et n\'effacent jamais une marque', async () => {
    setRuntimeMode('real')
    await upsertKeywordKpis('plombier toulouse', { searchVolume: 1900 })
    const { sql, params } = lastWrite()
    expect(params.at(-1)).toBe(false)
    expect(sql).toMatch(/from_sandbox\s*=\s*keyword_metrics\.from_sandbox\s+OR\s+EXCLUDED\.from_sandbox/i)
  })

  it('les questions PAA et l\'analyse d\'écart (IA simulée) obtenues en simulé marquent la ligne', async () => {
    setRuntimeMode('mock')
    await upsertKeywordPaa('plombier toulouse', [{ question: 'Où manger une pizza à Londres ?' }])
    expect(lastWrite().params.at(-1)).toBe(true)
    await upsertKeywordContentGap('plombier toulouse', { averageWordCount: 1200 })
    expect(lastWrite().params.at(-1)).toBe(true)
  })

  it('les suggestions Google, réelles dans les deux modes, ne marquent pas la ligne', async () => {
    setRuntimeMode('mock')
    await upsertKeywordAutocomplete('plombier toulouse', [{ text: 'plombier toulouse pas cher', position: 1 }], 'google')
    expect(lastWrite().sql).not.toMatch(/from_sandbox/)
  })

  it('le relevé SERP fait en simulé marque la ligne parente de ses pages et questions', async () => {
    setRuntimeMode('mock')
    await fetchAndPersist('plombier toulouse', 'pilier')
    const parent = m.txQueries.find(q => /INSERT INTO keyword_metrics/i.test(q.sql))
    expect(parent?.sql).toMatch(/from_sandbox\s*=\s*keyword_metrics\.from_sandbox\s+OR\s+EXCLUDED\.from_sandbox/i)
    expect(parent?.params).toContain(true)
  })

  it('le relevé SERP gardé en mémoire en simulé n\'est pas resservi en réel', async () => {
    setRuntimeMode('mock')
    await fetchAndPersist('plombier toulouse', 'pilier')
    setRuntimeMode('real')
    await fetchAndPersist('plombier toulouse', 'pilier')
    expect(m.fetchSerp).toHaveBeenCalledTimes(2)
    const realParent = m.txQueries.filter(q => /INSERT INTO keyword_metrics/i.test(q.sql)).at(-1)
    expect(realParent?.params).toContain(false)
  })
})

describe('FR-EXT-DATAFORSEO-SANDBOX — les mesures simulées sont effacées au passage en réel', () => {
  it('la purge efface les lignes marquées (les tables filles suivent par cascade)', async () => {
    expect(await purgeSandboxMeasures()).toBe(3)
    const del = m.queries.find(q => /DELETE FROM keyword_metrics/i.test(q.sql))
    expect(del?.sql).toMatch(/WHERE\s+from_sandbox/i)
  })

  it('au démarrage en simulé, rien n\'est effacé', async () => {
    vi.stubEnv('AI_PROVIDER', 'mock')
    expect(await purgeSandboxMeasuresIfReal()).toBe(0)
    expect(deletes()).toBe(0)
  })

  it('au démarrage en réel, les mesures simulées sont effacées ; une base muette ne fait pas tomber le serveur', async () => {
    vi.stubEnv('AI_PROVIDER', 'claude')
    vi.stubEnv('DATAFORSEO_SANDBOX', '')
    expect(await purgeSandboxMeasuresIfReal()).toBe(3)
    m.failDelete = true
    await expect(purgeSandboxMeasuresIfReal()).resolves.toBe(0)
  })

  it('le bouton « RÉEL » efface les mesures simulées', async () => {
    setRuntimeMode('mock')
    const res = mockRes()
    await postHandler()({ body: { mode: 'real' } } as Request, res)
    expect(deletes()).toBe(1)
    expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ override: 'real', effective: 'real' }) })
  })

  it('rendre la main à une configuration réelle efface aussi les mesures simulées', async () => {
    setRuntimeMode('mock')
    vi.stubEnv('AI_PROVIDER', 'claude')
    vi.stubEnv('DATAFORSEO_SANDBOX', '')
    await postHandler()({ body: { mode: null } } as Request, mockRes())
    expect(deletes()).toBe(1)
  })

  it('le bouton « MOCK » n\'efface rien', async () => {
    setRuntimeMode('real')
    await postHandler()({ body: { mode: 'mock' } } as Request, mockRes())
    expect(deletes()).toBe(0)
  })

  it('si l\'effacement échoue, la bascule est refusée et le mode reste simulé', async () => {
    setRuntimeMode('mock')
    m.failDelete = true
    const res = mockRes()
    await postHandler()({ body: { mode: 'real' } } as Request, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: expect.objectContaining({ code: 'SANDBOX_PURGE_FAILED' }) })
    expect(getRuntimeMode()).toBe('mock')
  })
})

describe('FR-EXT-DATAFORSEO-SANDBOX — schéma', () => {
  it('le changement daté ajoute la marque sans risque de le rejouer', () => {
    expect(existsSync(CHANGE_FILE), 'server/db/changes/2026-09-30-keyword-metrics-from-sandbox.sql').toBe(true)
    const sql = readFileSync(CHANGE_FILE, 'utf8')
    expect(sql).toMatch(/ALTER TABLE keyword_metrics\s+ADD COLUMN IF NOT EXISTS from_sandbox BOOLEAN NOT NULL DEFAULT false/i)
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS/i)
  })

  it('le schéma courant déclare keyword_metrics.from_sandbox (npm run db:snapshot après db:apply)', () => {
    const schema = readFileSync(join(ROOT, 'server', 'db', 'schema.sql'), 'utf8')
    const table = schema.match(/CREATE TABLE "keyword_metrics" \(([\s\S]*?)\n\);/)?.[1] ?? ''
    expect(table).toMatch(/"from_sandbox" BOOLEAN NOT NULL DEFAULT false/)
  })
})
