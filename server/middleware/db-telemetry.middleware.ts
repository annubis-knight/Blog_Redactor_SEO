/**
 * Opérations en base d'une requête HTTP → champ `dbOps` de sa réponse, que la
 * pile d'activité de l'écran affiche (FR-INFRA-COST-LOG-STORE).
 *
 * Règle « écriture significative » : toute écriture (ajout, mise à jour,
 * ajout-ou-mise-à-jour, suppression) faite pour répondre à la requête, qu'elle
 * passe par `pool.query` ou par un client du pool (transaction). Les lectures
 * ne sont pas rapportées (elles noieraient la pile), ni les tâches de fond du
 * serveur (hors requête). Une ligne par table et par type d'écriture : les
 * lignes touchées et la durée sont additionnées. Un couple (type, table) que
 * la route rapporte déjà elle-même (`measureDb`) n'est pas compté deux fois.
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import type { Request, Response, NextFunction } from 'express'
import type { DbOp } from '../../shared/types/index.js'
import { pool } from '../db/client.js'

interface DbTelemetryStore {
  ops: DbOp[]
}

const storage = new AsyncLocalStorage<DbTelemetryStore>()

const WRITE_OPERATIONS: ReadonlySet<DbOp['operation']> = new Set(['insert', 'update', 'upsert', 'delete'])

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

function sqlOf(first: unknown): string {
  if (typeof first === 'string') return first
  if (first && typeof first === 'object' && 'text' in first) {
    return String((first as { text: unknown }).text ?? '')
  }
  return ''
}

/** Joue la requête et note son écriture (une lecture, BEGIN ou COMMIT ne sont pas notés). */
async function timed(store: DbTelemetryStore, sql: string, run: () => unknown): Promise<unknown> {
  const start = Date.now()
  const res = await run()
  const operation = inferOp(sql)
  if (WRITE_OPERATIONS.has(operation)) {
    const rowCount =
      res && typeof res === 'object' && 'rowCount' in res
        ? Number((res as { rowCount: unknown }).rowCount ?? 0)
        : 0
    store.ops.push({ operation, table: inferTable(sql), rowCount, ms: Date.now() - start })
  }
  return res
}

/**
 * Contexte où noter cet appel, ou `null` : hors requête, forme « rappel »
 * (celle que `pool.query` emploie en interne, déjà notée par `pool.query`) ou
 * requête « soumise » (curseur).
 */
function trackingStore(args: unknown[]): DbTelemetryStore | null {
  const store = storage.getStore()
  const first = args[0]
  const submittable = !!first && typeof first === 'object' && typeof (first as { submit?: unknown }).submit === 'function'
  if (!store || typeof args[args.length - 1] === 'function' || submittable) return null
  return store
}

type QueryFn = (...args: unknown[]) => unknown
const INSTRUMENTED = Symbol('db-telemetry')
type PoolClientLike = { query: QueryFn; [INSTRUMENTED]?: true }

/** Instrumente une fois un client du pool (transactions : `pool.connect()` puis `client.query`). */
function instrumentClient(client: PoolClientLike): void {
  if (client[INSTRUMENTED]) return
  client[INSTRUMENTED] = true
  const original = client.query.bind(client)
  client.query = function (...args: unknown[]): unknown {
    const store = trackingStore(args)
    if (!store) return original(...args)
    return timed(store, sqlOf(args[0]), () => original(...args))
  }
}

/**
 * Patches pool.query and the clients handed out by pool.connect() so every
 * write executed under a request scope is recorded into its DbOp buffer.
 * Idempotent — call once at boot.
 */
let patched = false
export function patchPoolForTelemetry(): void {
  if (patched) return
  patched = true
  const target = pool as unknown as { query: QueryFn; connect: QueryFn }
  const originalQuery = target.query.bind(pool)
  target.query = function (...args: unknown[]): unknown {
    const store = trackingStore(args)
    if (!store) return originalQuery(...args)
    return timed(store, sqlOf(args[0]), () => originalQuery(...args))
  }
  const originalConnect = target.connect.bind(pool)
  target.connect = function (...args: unknown[]): unknown {
    // Forme « rappel » : c'est `pool.query` lui-même qui emprunte un client.
    if (args.length > 0) return originalConnect(...args)
    return (originalConnect() as Promise<PoolClientLike>).then((client) => {
      instrumentClient(client)
      return client
    })
  }
}

const keyOf = (op: DbOp) => `${op.operation} ${op.table}`

/**
 * Une ligne par (type, table), dans l'ordre de la première écriture, lignes et
 * durée additionnées. Les couples que la route déclare elle-même sont écartés.
 */
function summarize(ops: DbOp[], declared: DbOp[] = []): DbOp[] {
  const skip = new Set(declared.map(keyOf))
  const byKey = new Map<string, DbOp>()
  for (const op of ops) {
    const key = keyOf(op)
    if (skip.has(key)) continue
    const seen = byKey.get(key)
    if (seen) {
      seen.rowCount += op.rowCount
      seen.ms += op.ms
    } else {
      byKey.set(key, { ...op })
    }
  }
  return [...byKey.values()]
}

/**
 * Écritures de la requête en cours, résumées — pour l'événement `done` d'un
 * flux SSE, qui ne passe pas par `res.json`. Hors requête : aucune.
 */
export function requestDbOps(): DbOp[] {
  const store = storage.getStore()
  return store ? summarize(store.ops) : []
}

/**
 * Express middleware that wraps each HTTP request in an AsyncLocalStorage
 * context, then patches `res.json` to add the request's writes to the outgoing
 * JSON envelope under the `dbOps` key (after the ones the route declares).
 */
export function dbTelemetryMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const store: DbTelemetryStore = { ops: [] }
  storage.run(store, () => {
    const originalJson = res.json.bind(res)
    res.json = function (body: unknown): Response {
      // Only meddle with object bodies (skip strings, null, arrays).
      if (!body || typeof body !== 'object' || Array.isArray(body)) return originalJson(body)
      const existing = (body as { dbOps?: unknown }).dbOps
      const declared = Array.isArray(existing) ? (existing as DbOp[]) : []
      const writes = summarize(store.ops, declared)
      if (writes.length === 0) return originalJson(body)
      // Nouvel objet : celui de la route peut être gardé en mémoire et resservir.
      return originalJson({ ...body, dbOps: [...declared, ...writes] })
    }
    next()
  })
}

/** For tests / direct usage. */
export function _getCurrentTelemetryStore(): DbTelemetryStore | undefined {
  return storage.getStore()
}
