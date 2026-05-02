import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock pool BEFORE importing the middleware so patchPoolForTelemetry monkey-patches our mock.
const mockQuery = vi.fn()
vi.mock('../../../server/db/client.js', () => ({
  pool: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}))

import {
  dbTelemetryMiddleware,
  patchPoolForTelemetry,
} from '../../../server/middleware/db-telemetry.middleware'
import { pool } from '../../../server/db/client.js'

interface FakeRes {
  body: unknown
  json: (b: unknown) => FakeRes
}

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

describe('dbTelemetryMiddleware', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    patchPoolForTelemetry()
  })

  it('attaches dbOps to res.json when SQL runs inside the request scope', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const req = {} as never
    const res = makeRes()
    await new Promise<void>((resolve) => {
      dbTelemetryMiddleware(req, res as never, async () => {
        await pool.query('UPDATE articles SET captain_keyword_locked = $1 WHERE id = $2', ['kw', 1])
        res.json({ data: { ok: true } })
        resolve()
      })
    })
    const body = res.body as { data: unknown; dbOps?: Array<{ operation: string; table: string; rowCount: number }> }
    expect(body.dbOps).toBeDefined()
    expect(body.dbOps).toHaveLength(1)
    expect(body.dbOps![0].operation).toBe('update')
    expect(body.dbOps![0].table).toBe('articles')
    expect(body.dbOps![0].rowCount).toBe(1)
  })

  it('infers `upsert` from INSERT ... ON CONFLICT', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const req = {} as never
    const res = makeRes()
    await new Promise<void>((resolve) => {
      dbTelemetryMiddleware(req, res as never, async () => {
        await pool.query('INSERT INTO captain_explorations (article_id, keyword) VALUES ($1, $2) ON CONFLICT DO UPDATE SET ...', [1, 'kw'])
        res.json({ data: 'x' })
        resolve()
      })
    })
    const body = res.body as { dbOps: Array<{ operation: string; table: string }> }
    expect(body.dbOps[0].operation).toBe('upsert')
    expect(body.dbOps[0].table).toBe('captain_explorations')
  })

  it('aggregates multiple queries within the same request', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 4 })
    const req = {} as never
    const res = makeRes()
    await new Promise<void>((resolve) => {
      dbTelemetryMiddleware(req, res as never, async () => {
        await pool.query('UPDATE articles SET x=1')
        await pool.query('INSERT INTO paa_explorations (...) VALUES (...) ON CONFLICT DO NOTHING', [])
        res.json({ data: {} })
        resolve()
      })
    })
    const body = res.body as { dbOps: Array<{ table: string }> }
    expect(body.dbOps).toHaveLength(2)
    expect(body.dbOps[0].table).toBe('articles')
    expect(body.dbOps[1].table).toBe('paa_explorations')
  })

  it('does not attach dbOps if no SQL ran', async () => {
    const req = {} as never
    const res = makeRes()
    await new Promise<void>((resolve) => {
      dbTelemetryMiddleware(req, res as never, () => {
        res.json({ data: 'no-db' })
        resolve()
      })
    })
    const body = res.body as { data: string; dbOps?: unknown }
    expect(body.dbOps).toBeUndefined()
  })

  it('merges existing dbOps in the body with collected ones', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const req = {} as never
    const res = makeRes()
    const explicit = { operation: 'select' as const, table: 'cache', rowCount: 5, ms: 3 }
    await new Promise<void>((resolve) => {
      dbTelemetryMiddleware(req, res as never, async () => {
        await pool.query('UPDATE articles SET x=1')
        res.json({ data: 'mixed', dbOps: [explicit] })
        resolve()
      })
    })
    const body = res.body as { dbOps: Array<{ table: string }> }
    expect(body.dbOps).toHaveLength(2)
    expect(body.dbOps[0].table).toBe('cache')
    expect(body.dbOps[1].table).toBe('articles')
  })

  it('infers SELECT operations from FROM clauses', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    const req = {} as never
    const res = makeRes()
    await new Promise<void>((resolve) => {
      dbTelemetryMiddleware(req, res as never, async () => {
        await pool.query('SELECT * FROM keyword_metrics WHERE keyword = $1', ['x'])
        res.json({ data: [] })
        resolve()
      })
    })
    const body = res.body as { dbOps: Array<{ operation: string; table: string }> }
    expect(body.dbOps[0].operation).toBe('select')
    expect(body.dbOps[0].table).toBe('keyword_metrics')
  })

  it('infers DELETE operations and their tables', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 })
    const req = {} as never
    const res = makeRes()
    await new Promise<void>((resolve) => {
      dbTelemetryMiddleware(req, res as never, async () => {
        await pool.query('DELETE FROM api_cache WHERE expires_at < NOW()')
        res.json({ data: { deleted: 3 } })
        resolve()
      })
    })
    const body = res.body as { dbOps: Array<{ operation: string; table: string; rowCount: number }> }
    expect(body.dbOps[0].operation).toBe('delete')
    expect(body.dbOps[0].table).toBe('api_cache')
    expect(body.dbOps[0].rowCount).toBe(3)
  })

  it('does NOT attach dbOps when res.json receives a non-object body', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })
    const req = {} as never
    const res = makeRes()
    await new Promise<void>((resolve) => {
      dbTelemetryMiddleware(req, res as never, async () => {
        await pool.query('UPDATE articles SET x=1')
        res.json('plain string') // edge — middleware must not crash or stamp anything
        resolve()
      })
    })
    expect(res.body).toBe('plain string')
  })
})
