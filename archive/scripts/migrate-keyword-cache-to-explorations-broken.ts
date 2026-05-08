/**
 * Sprint 10 — Migrate legacy api_cache entries (intent / local-seo / content-gap)
 * into their dedicated article-scoped tables (intent_explorations, local_explorations,
 * content_gap_explorations).
 *
 * Legacy cache_key was `{prefix}-{slug(keyword)}` (keyword-scoped). We resolve the
 * article by matching articles.keyword / articles.capitaine via article_keywords.
 *
 * Run with: npx tsx scripts/migrate-keyword-cache-to-explorations.ts
 */
import { query, pool } from '../server/db/client.js'
import { log } from '../server/utils/logger.js'
import { saveIntentExploration } from '../server/services/intent/intent-exploration.service.js'
import { saveLocalExplorationMaps, saveLocalExplorationComparison } from '../server/services/strategy/local-exploration.service.js'
import { saveContentGapExploration } from '../server/services/article/content-gap-exploration.service.js'

interface CacheRow { cache_key: string; data: any; cached_at: Date }

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function findArticlesForKeyword(keyword: string): Promise<number[]> {
  const slug = slugify(keyword)
  const slugSpaced = slug.replace(/-/g, ' ')
  const res = await query<{ id: number }>(
    `SELECT DISTINCT a.id
       FROM articles a
       LEFT JOIN article_keywords ak ON ak.article_id = a.id
      WHERE LOWER(ak.capitaine) = LOWER($1)
         OR LOWER(a.captain_keyword_locked) = LOWER($1)
         OR LOWER(a.suggested_keyword) = LOWER($1)
         OR LOWER(a.suggested_keyword) = LOWER($2)`,
    [keyword, slugSpaced],
  )
  return res.rows.map(r => r.id)
}

function extractKeywordFromKey(key: string, prefix: string): string | null {
  if (!key.startsWith(prefix)) return null
  return key.slice(prefix.length).replace(/-/g, ' ')
}

async function migrateIntent() {
  const res = await query<CacheRow>(
    `SELECT cache_key, data, cached_at FROM api_cache WHERE cache_type = 'intent'`,
  )
  log.info(`[intent] ${res.rows.length} entries to migrate`)
  let migrated = 0, orphans = 0
  for (const row of res.rows) {
    const kw = row.data?.keyword ?? extractKeywordFromKey(row.cache_key, 'intent-')
    if (!kw) { orphans++; continue }
    const articleIds = await findArticlesForKeyword(kw)
    if (articleIds.length === 0) { log.warn(`[intent] orphan keyword="${kw}"`); orphans++; continue }
    for (const articleId of articleIds) {
      await saveIntentExploration(articleId, row.data)
      migrated++
    }
  }
  log.info(`[intent] migrated=${migrated}, orphans=${orphans}`)
}

async function migrateLocal() {
  const res = await query<CacheRow>(
    `SELECT cache_key, data, cached_at FROM api_cache WHERE cache_type = 'local-seo'`,
  )
  log.info(`[local-seo] ${res.rows.length} entries to migrate`)
  let migrated = 0, orphans = 0
  for (const row of res.rows) {
    let kw: string | null
    let kind: 'maps' | 'comparison' | null
    if (row.cache_key.startsWith('maps-')) {
      kw = row.data?.keyword ?? extractKeywordFromKey(row.cache_key, 'maps-')
      kind = 'maps'
    } else if (row.cache_key.startsWith('local-national-')) {
      kw = row.data?.keyword ?? extractKeywordFromKey(row.cache_key, 'local-national-')
      kind = 'comparison'
    } else {
      kw = null; kind = null
    }
    if (!kw || !kind) { orphans++; continue }
    const articleIds = await findArticlesForKeyword(kw)
    if (articleIds.length === 0) { log.warn(`[local-seo] orphan key="${row.cache_key}"`); orphans++; continue }
    for (const articleId of articleIds) {
      if (kind === 'maps') await saveLocalExplorationMaps(articleId, kw, row.data)
      else await saveLocalExplorationComparison(articleId, kw, row.data)
      migrated++
    }
  }
  log.info(`[local-seo] migrated=${migrated}, orphans=${orphans}`)
}

async function migrateContentGap() {
  const res = await query<CacheRow>(
    `SELECT cache_key, data, cached_at FROM api_cache WHERE cache_type = 'content-gap'`,
  )
  log.info(`[content-gap] ${res.rows.length} entries to migrate`)
  let migrated = 0, orphans = 0
  for (const row of res.rows) {
    const kw = row.data?.keyword ?? extractKeywordFromKey(row.cache_key, 'content-gap-')
    if (!kw) { orphans++; continue }
    const articleIds = await findArticlesForKeyword(kw)
    if (articleIds.length === 0) { log.warn(`[content-gap] orphan keyword="${kw}"`); orphans++; continue }
    for (const articleId of articleIds) {
      await saveContentGapExploration(articleId, row.data)
      migrated++
    }
  }
  log.info(`[content-gap] migrated=${migrated}, orphans=${orphans}`)
}

async function main() {
  log.info('[sprint10] Starting keyword-cache migration')
  await migrateIntent()
  await migrateLocal()
  await migrateContentGap()
  log.info('[sprint10] Done. Legacy api_cache rows kept (will be cleaned in Sprint 14).')
  await pool.end()
}

main().catch((err) => {
  log.error('[sprint10] migration failed:', err)
  process.exit(1)
})
