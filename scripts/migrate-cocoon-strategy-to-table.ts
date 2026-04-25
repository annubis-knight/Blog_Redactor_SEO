/**
 * Sprint 15.7 — Migrate api_cache[cocoon-strategy] rows into the new
 * cocoon_strategies table (one row per cocoon_id). Resolves cache_key (slug)
 * to cocoon_id via the `cocoons` table. Orphaned slugs are logged.
 *
 * Run once with: npx tsx scripts/migrate-cocoon-strategy-to-table.ts
 */
import { query, pool } from '../server/db/client.js'
import { log } from '../server/utils/logger.js'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface Row { cache_key: string; data: unknown; cached_at: Date }

async function main() {
  const res = await query<Row>(
    `SELECT cache_key, data, cached_at FROM api_cache WHERE cache_type = 'cocoon-strategy'`,
  )
  log.info(`[migrate] ${res.rows.length} cocoon-strategy rows to migrate`)

  const cocoons = await query<{ id: number; nom: string }>(`SELECT id, nom FROM cocoons`)
  const slugToId = new Map<string, number>()
  for (const row of cocoons.rows) slugToId.set(slugify(row.nom), row.id)

  let migrated = 0, orphans = 0
  for (const row of res.rows) {
    const cocoonId = slugToId.get(row.cache_key)
    if (!cocoonId) {
      log.warn(`[migrate] orphan cocoon slug="${row.cache_key}"`)
      orphans++
      continue
    }
    await query(
      `INSERT INTO cocoon_strategies (cocoon_id, data, generated_at)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (cocoon_id) DO UPDATE
         SET data = EXCLUDED.data, generated_at = EXCLUDED.generated_at`,
      [cocoonId, JSON.stringify(row.data), row.cached_at],
    )
    migrated++
  }

  log.info(`[migrate] done: migrated=${migrated}, orphans=${orphans}`)
  if (migrated > 0 && orphans === 0) {
    await query(`DELETE FROM api_cache WHERE cache_type = 'cocoon-strategy'`)
    log.info('[migrate] purged legacy api_cache[cocoon-strategy] rows')
  }
  await pool.end()
}

main().catch((err) => {
  log.error('[migrate] failed:', err)
  process.exit(1)
})
