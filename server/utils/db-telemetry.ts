import { log } from './logger.js'
import type { DbOp } from '../../shared/types/index.js'

/**
 * Tiny helper to instrument a DB write and produce a `DbOp` record that routes
 * can attach to their JSON response. The front-end pile listens for `dbOps`
 * in API responses and surfaces each entry.
 *
 * Why: previously only external API calls (Claude, DataForSEO) were visible in
 * the activity pile. DB writes were invisible, which hid real bugs such as a
 * save silently failing.
 *
 * Usage:
 *   const dbOp = await measureDb('captain_explorations', 'insert', async () => {
 *     const res = await pool.query(sql, params)
 *     return res.rowCount ?? 0
 *   })
 *   res.json({ data: {...}, dbOps: [dbOp] })
 */
export async function measureDb(
  table: string,
  operation: DbOp['operation'],
  run: () => Promise<number>,
): Promise<DbOp> {
  const start = Date.now()
  const rowCount = await run()
  const ms = Date.now() - start
  const op: DbOp = { operation, table, rowCount, ms }
  log.debug(`db.${operation} ${table}`, { rowCount, ms })
  return op
}

/** Fire-and-forget variant that just logs — for service-level calls that don't
 *  need to return telemetry to the caller. */
export function logDbOp(op: DbOp): void {
  log.debug(`db.${op.operation} ${op.table}`, { rowCount: op.rowCount, ms: op.ms })
}
