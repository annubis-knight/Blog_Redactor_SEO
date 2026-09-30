// @vitest-environment node
/**
 * FR-INFRA-COST-LOG-STORE — chaque écriture en base faite pour répondre à une
 * action ajoute sa ligne à la pile d'activité ; une lecture n'en ajoute pas.
 *
 * Recette 2026-09-30 : seules les routes des mots-clés d'article et des
 * explorations Capitaine / Lieutenants rapportaient leurs opérations (valider
 * une structure n'ajoutait aucune ligne). Le middleware existait mais n'était
 * pas monté. Monté, il ne doit ni noyer la pile sous les lectures, ni compter
 * deux fois une écriture qu'une route rapporte déjà elle-même.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock pool BEFORE importing the middleware so patchPoolForTelemetry monkey-patches our mock.
const mockQuery = vi.fn()
const mockClientQuery = vi.fn()
const mockRelease = vi.fn()
const fakeClient = {
  query: (...args: unknown[]) => mockClientQuery(...args),
  release: () => mockRelease(),
}
vi.mock('../../../server/db/client.js', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
    connect: async (...args: unknown[]) => {
      const cb = args[0]
      if (typeof cb === 'function') { cb(null, fakeClient, () => {}); return undefined }
      return fakeClient
    },
  },
}))

import {
  dbTelemetryMiddleware,
  patchPoolForTelemetry,
  requestDbOps,
} from '../../../server/middleware/db-telemetry.middleware'
import { pool } from '../../../server/db/client.js'

interface FakeRes {
  body: unknown
  json: (b: unknown) => FakeRes
}

type Ops = Array<{ operation: string; table: string; rowCount: number; ms: number }>

function makeRes(): FakeRes {
  const res: FakeRes = {
    body: undefined,
    json(b: unknown) {
      this.body = b
      return this
    },
  }
  return res
}

/** Joue `handler` comme une route montée derrière le middleware. */
async function runRoute(handler: (res: FakeRes) => Promise<void> | void): Promise<FakeRes> {
  const res = makeRes()
  await new Promise<void>((resolve, reject) => {
    dbTelemetryMiddleware({} as never, res as never, async () => {
      try {
        await handler(res)
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  })
  return res
}

describe('FR-INFRA-COST-LOG-STORE — le middleware rapporte les écritures en base', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockClientQuery.mockReset()
    mockRelease.mockReset()
    patchPoolForTelemetry()
  })

  it('attaches dbOps to res.json when SQL runs inside the request scope', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const res = await runRoute(async (r) => {
      await pool.query('UPDATE articles SET captain_keyword_locked = $1 WHERE id = $2', ['kw', 1])
      r.json({ data: { ok: true } })
    })
    const body = res.body as { data: unknown; dbOps?: Ops }
    expect(body.dbOps).toHaveLength(1)
    expect(body.dbOps![0].operation).toBe('update')
    expect(body.dbOps![0].table).toBe('articles')
    expect(body.dbOps![0].rowCount).toBe(1)
  })

  it('infers `upsert` from INSERT ... ON CONFLICT', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const res = await runRoute(async (r) => {
      await pool.query('INSERT INTO captain_explorations (article_id, keyword) VALUES ($1, $2) ON CONFLICT DO UPDATE SET ...', [1, 'kw'])
      r.json({ data: 'x' })
    })
    const body = res.body as { dbOps: Ops }
    expect(body.dbOps[0].operation).toBe('upsert')
    expect(body.dbOps[0].table).toBe('captain_explorations')
  })

  it('une ligne par table écrite, dans l’ordre des écritures', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 4 })
    const res = await runRoute(async (r) => {
      await pool.query('UPDATE articles SET x=1')
      await pool.query('INSERT INTO paa_explorations (...) VALUES (...) ON CONFLICT DO NOTHING', [])
      r.json({ data: {} })
    })
    const body = res.body as { dbOps: Ops }
    expect(body.dbOps.map(op => op.table)).toEqual(['articles', 'paa_explorations'])
  })

  it('les écritures répétées sur une table font une seule ligne : lignes et durée additionnées', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 3 })
      .mockResolvedValueOnce({ rowCount: 2 })
    const res = await runRoute(async (r) => {
      for (let i = 0; i < 3; i++) {
        await pool.query('INSERT INTO keyword_metrics (keyword) VALUES ($1) ON CONFLICT (keyword) DO UPDATE SET volume = 1', [`k${i}`])
      }
      r.json({ data: {} })
    })
    const body = res.body as { dbOps: Ops }
    expect(body.dbOps).toHaveLength(1)
    expect(body.dbOps[0]).toMatchObject({ operation: 'upsert', table: 'keyword_metrics', rowCount: 6 })
    expect(typeof body.dbOps[0].ms).toBe('number')
  })

  it('une lecture n’ajoute pas de ligne', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    const res = await runRoute(async (r) => {
      await pool.query('SELECT * FROM keyword_metrics WHERE keyword = $1', ['x'])
      r.json({ data: [] })
    })
    expect((res.body as { dbOps?: unknown }).dbOps).toBeUndefined()
  })

  it('does not attach dbOps if no SQL ran', async () => {
    const res = await runRoute((r) => {
      r.json({ data: 'no-db' })
    })
    expect((res.body as { dbOps?: unknown }).dbOps).toBeUndefined()
  })

  it('une écriture que la route rapporte déjà elle-même n’est pas comptée deux fois', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
    const declared = [
      { operation: 'upsert' as const, table: 'captain_explorations', rowCount: 1, ms: 3 },
      { operation: 'select' as const, table: 'article_keywords', rowCount: 5, ms: 2 },
    ]
    const res = await runRoute(async (r) => {
      await pool.query('INSERT INTO captain_explorations (article_id) VALUES (1) ON CONFLICT (article_id) DO UPDATE SET x = 1')
      await pool.query('UPDATE articles SET x=1')
      r.json({ data: 'mixed', dbOps: declared })
    })
    const body = res.body as { dbOps: Ops }
    expect(body.dbOps.map(op => `${op.operation} ${op.table}`)).toEqual([
      'upsert captain_explorations',
      'select article_keywords',
      'update articles',
    ])
  })

  it('ne modifie pas l’objet passé par la route (un objet en mémoire peut resservir)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const shared = { data: { cached: true } }
    const res = await runRoute(async (r) => {
      await pool.query('DELETE FROM api_cache WHERE expires_at < NOW()')
      r.json(shared)
    })
    expect((res.body as { dbOps: Ops }).dbOps[0]).toMatchObject({ operation: 'delete', table: 'api_cache' })
    expect(shared).toEqual({ data: { cached: true } })
  })

  it('les écritures d’une transaction (client du pool) sont rapportées, pas BEGIN / COMMIT', async () => {
    mockClientQuery
      .mockResolvedValueOnce({ rowCount: null }) // BEGIN
      .mockResolvedValueOnce({ rowCount: 7 }) // DELETE
      .mockResolvedValueOnce({ rowCount: 1 }) // INSERT
      .mockResolvedValueOnce({ rowCount: 1 }) // INSERT
      .mockResolvedValueOnce({ rowCount: null }) // COMMIT
    const res = await runRoute(async (r) => {
      const client = await pool.connect()
      await client.query('BEGIN')
      await client.query('DELETE FROM internal_links')
      await client.query('INSERT INTO internal_links (source_id) VALUES ($1)', [1])
      await client.query('INSERT INTO internal_links (source_id) VALUES ($1)', [2])
      await client.query('COMMIT')
      client.release()
      r.json({ data: {} })
    })
    const body = res.body as { dbOps: Ops }
    expect(body.dbOps.map(op => `${op.operation} ${op.table} ${op.rowCount}`)).toEqual([
      'delete internal_links 7',
      'insert internal_links 2',
    ])
  })

  it('un appel du client au format « rappel » (celui de pool.query) n’est pas compté une seconde fois', async () => {
    const client = await pool.connect()
    const res = await runRoute((r) => {
      client.query('UPDATE articles SET x=1', [], () => {})
      r.json({ data: {} })
    })
    expect((res.body as { dbOps?: unknown }).dbOps).toBeUndefined()
    expect(mockClientQuery).toHaveBeenCalledTimes(1)
  })

  it('requestDbOps rend les écritures de la requête en cours (événement « done » d’un flux)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 })
    let seen: Ops = []
    await runRoute(async (r) => {
      await pool.query('INSERT INTO lieutenant_explorations (keyword) VALUES ($1) ON CONFLICT (keyword) DO UPDATE SET x = 1', ['a'])
      seen = requestDbOps()
      r.json({ data: {} })
    })
    expect(seen).toEqual([expect.objectContaining({ operation: 'upsert', table: 'lieutenant_explorations', rowCount: 3 })])
    expect(requestDbOps()).toEqual([])
  })

  it('does NOT attach dbOps when res.json receives a non-object body', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const res = await runRoute(async (r) => {
      await pool.query('UPDATE articles SET x=1')
      r.json('plain string') // edge — middleware must not crash or stamp anything
    })
    expect(res.body).toBe('plain string')
  })
})
