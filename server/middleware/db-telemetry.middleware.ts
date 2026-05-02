import { AsyncLocalStorage } from 'node:async_hooks'
import type { Request, Response, NextFunction } from 'express'
import type { DbOp } from '../../shared/types/index.js'
import { pool } from '../db/client.js'

interface DbTelemetryStore {
  ops: DbOp[]
}

const storage = new AsyncLocalStorage<DbTelemetryStore>()

/**
 * Infer the DB operation kind from a SQL string. Heuristic, no parser:
 * we look at the first non-whitespace SQL keyword. ON CONFLICT detected
 * after INSERT marks the op as `upsert`.
 */
function inferOp(sql: string): DbOp['operation'] {
  const trimmed = sql.replace(/\s+/g, ' ').trim().toUpperCase()
  if (trimmed.startsWith('INSERT')) {
    return trimmed.includes(' ON CONFLICT ') ? 'upsert' : 'insert'
  }
  if (trimmed.startsWith('UPDATE')) return 'update'
  if (trimmed.startsWith('DELETE')) return 'delete'
  if (trimmed.startsWith('WITH ') && trimmed.includes(' INSERT ')) return 'insert'
  return 'select'
}

/**
 * Heuristic table extraction — first table name after the leading verb.
 * INSERT / DELETE / UPDATE are tried in fixed order against the *first* matching
 * verb in the SQL so we don't grab the table from a trailing
 * `ON CONFLICT DO UPDATE` clause inside an INSERT.
 */
function inferTable(sql: string): string {
  const flat = sql.replace(/\s+/g, ' ').trim()
  // Anchored on the leading verb so DML clauses inside INSERT (e.g. DO UPDATE)
  // don't leak through.
  const leading = flat.match(/^\s*(INSERT|UPDATE|DELETE|SELECT|WITH)\b/i)
  if (leading) {
    const verb = leading[1].toUpperCase()
    if (verb === 'INSERT') {
      const m = flat.match(/\bINSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/i)
      if (m) return m[1]
    } else if (verb === 'UPDATE') {
      const m = flat.match(/^\s*UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i)
      if (m) return m[1]
    } else if (verb === 'DELETE') {
      const m = flat.match(/\bDELETE\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i)
      if (m) return m[1]
    } else if (verb === 'SELECT' || verb === 'WITH') {
      const m = flat.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i)
      if (m) return m[1]
    }
  }
  return '?'
}

/**
 * Patches pool.query so every SQL executed under `runWithTelemetry` is
 * recorded into the request-scoped DbOp buffer. Idempotent — call once at boot.
 */
let patched = false
export function patchPoolForTelemetry(): void {
  if (patched) return
  patched = true
  const original = pool.query.bind(pool) as (...args: unknown[]) => Promise<unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(pool as any).query = async function (...args: unknown[]): Promise<unknown> {
    const store = storage.getStore()
    if (!store) {
      return original(...args)
    }
    const start = Date.now()
    let sql = ''
    const first = args[0]
    if (typeof first === 'string') sql = first
    else if (first && typeof first === 'object' && 'text' in first) {
      sql = String((first as { text: unknown }).text ?? '')
    }
    const res = await original(...args)
    const ms = Date.now() - start
    const rowCount =
      res && typeof res === 'object' && 'rowCount' in res
        ? Number((res as { rowCount: unknown }).rowCount ?? 0)
        : 0
    store.ops.push({
      operation: inferOp(sql),
      table: inferTable(sql),
      rowCount,
      ms,
    })
    return res
  }
}

/**
 * Express middleware that wraps each HTTP request in an AsyncLocalStorage
 * context, then patches `res.json` to merge the collected DbOps into the
 * outgoing JSON envelope under the `dbOps` key.
 *
 * Convention: routes that already pass an explicit `dbOps` array win — we
 * merge their entries with the middleware-collected ones (deduplicated).
 */
export function dbTelemetryMiddleware(req: Request, res: Response, next: NextFunction): void {
  const store: DbTelemetryStore = { ops: [] }
  storage.run(store, () => {
    const originalJson = res.json.bind(res)
    res.json = function (body: unknown): Response {
      // Only meddle with object bodies (skip strings, null, arrays).
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const collected = store.ops
        if (collected.length > 0) {
          const existing = (body as { dbOps?: unknown }).dbOps
          if (Array.isArray(existing)) {
            ;(body as { dbOps: DbOp[] }).dbOps = [...(existing as DbOp[]), ...collected]
          } else {
            ;(body as { dbOps: DbOp[] }).dbOps = collected
          }
        }
      }
      return originalJson(body)
    }
    next()
  })
}

/** For tests / direct usage. */
export function _getCurrentTelemetryStore(): DbTelemetryStore | undefined {
  return storage.getStore()
}
