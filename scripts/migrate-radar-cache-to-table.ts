/**
 * Sprint 9 — Migrate legacy api_cache[radar] entries into radar_explorations.
 *
 * Legacy cache keys were `slugify(seed)` (article-agnostic). We try to resolve
 * each entry to a single article via `articles.keyword_slug` or
 * `articles.pilier_keyword`. Orphan entries are logged and left in api_cache —
 * they will be purged by the TTL once expired.
 *
 * Run with: npx tsx scripts/migrate-radar-cache-to-table.ts
 */
import { query, pool } from '../server/db/client.js'
import { log } from '../server/utils/logger.js'

interface RadarCacheRow {
  cache_key: string
  data: {
    seed: string
    context: { broadKeyword: string; specificTopic: string; painPoint: string; depth: number }
    generatedKeywords: Array<{ keyword: string; reasoning?: string }>
    scanResult: unknown
    cachedAt: string
  }
  cached_at: Date
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function resolveArticleId(seed: string): Promise<number | null> {
  const slug = slugify(seed)
  const slugSpaced = slug.replace(/-/g, ' ')
  const res = await query<{ id: number }>(
    `SELECT DISTINCT a.id
       FROM articles a
       LEFT JOIN article_keywords ak ON ak.article_id = a.id
      WHERE LOWER(ak.capitaine) = LOWER($1)
         OR LOWER(a.captain_keyword_locked) = LOWER($1)
         OR LOWER(a.suggested_keyword) = LOWER($1)
         OR LOWER(a.suggested_keyword) = LOWER($2)
      ORDER BY a.id
      LIMIT 1`,
    [seed, slugSpaced],
  )
  return res.rows[0]?.id ?? null
}

async function main() {
  const res = await query<RadarCacheRow>(
    `SELECT cache_key, data, cached_at FROM api_cache WHERE cache_type = 'radar'`,
  )
  log.info(`Found ${res.rows.length} radar cache entries to evaluate`)

  let migrated = 0
  let orphans = 0
  for (const row of res.rows) {
    const seed = row.data?.seed ?? row.cache_key
    const articleId = await resolveArticleId(seed)
    if (!articleId) {
      log.warn(`[radar-migrate] Orphan seed="${seed}" — cannot resolve article, leaving in api_cache`)
      orphans++
      continue
    }
    await query(
      `INSERT INTO radar_explorations
         (article_id, seed, broad_keyword, specific_topic, pain_point, depth,
          generated_keywords, scan_result, scanned_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
       ON CONFLICT (article_id) DO UPDATE
         SET seed = EXCLUDED.seed,
             broad_keyword = EXCLUDED.broad_keyword,
             specific_topic = EXCLUDED.specific_topic,
             pain_point = EXCLUDED.pain_point,
             depth = EXCLUDED.depth,
             generated_keywords = EXCLUDED.generated_keywords,
             scan_result = EXCLUDED.scan_result,
             scanned_at = EXCLUDED.scanned_at`,
      [
        articleId,
        seed,
        row.data?.context?.broadKeyword ?? null,
        row.data?.context?.specificTopic ?? null,
        row.data?.context?.painPoint ?? null,
        row.data?.context?.depth ?? 1,
        JSON.stringify(row.data?.generatedKeywords ?? []),
        JSON.stringify(row.data?.scanResult ?? {}),
        row.cached_at,
      ],
    )
    migrated++
  }

  log.info(`[radar-migrate] Done — migrated=${migrated}, orphans=${orphans}`)
  if (migrated > 0) {
    // Keep legacy cache entries for examples only if there were 0 orphans —
    // otherwise leave the full table untouched (they will expire naturally).
    log.info(
      `[radar-migrate] Legacy api_cache[radar] rows are kept; remove manually if desired once confident.`,
    )
  }
  await pool.end()
}

main().catch((err) => {
  log.error('[radar-migrate] Failed:', err)
  process.exit(1)
})
