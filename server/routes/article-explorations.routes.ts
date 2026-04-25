import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getCached, slugify } from '../db/cache-helpers.js'
import { getArticleKeywords, getCaptainExplorations, getLieutenantExplorations } from '../services/infra/data.service.js'
import { getRadarExploration } from '../services/infra/radar-exploration.service.js'
import { getKeywordIntentAnalysis } from '../services/intent/keyword-intent-analysis.service.js'
import { getKeywordMetrics } from '../services/keyword/keyword-metrics.service.js'
import { listLexiqueExplorations } from '../services/keyword/lexique-exploration.service.js'

const router = Router()

function parseArticleId(raw: unknown): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * GET /articles/:id/explorations
 *
 * Aggregated view of all article-scoped explorations living in dedicated tables
 * (radar_explorations, captain_explorations, lieutenant_explorations,
 * paa_explorations, intent_explorations, local_explorations,
 * content_gap_explorations).
 *
 * The response shape is stable: missing rows become null / empty arrays.
 * This endpoint NEVER calls external APIs — read-only DB scan.
 */
router.get('/articles/:id/explorations', async (req, res) => {
  const articleId = parseArticleId(req.params.id)
  if (!articleId) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a positive integer' } })
    return
  }

  try {
    const { data: articleKeywords } = await getArticleKeywords(articleId)
    const capitaineKeyword = articleKeywords?.capitaine ?? null

    // Sprint 15.5 — intent/local/contentGap now cross-article on keyword_metrics
    // (capitaineKeyword) or keyword_intent_analyses (intent). Lists aggregate across
    // the article's capitaine + lieutenants.
    const [
      radar,
      captainExplorationsRes,
      lieutenantExplorationsRes,
      lexiqueList,
      intentCapitaine,
      metricsCapitaine,
    ] = await Promise.all([
      getRadarExploration(articleId),
      getCaptainExplorations(articleId).catch(() => ({ data: [], dbOps: [] })),
      getLieutenantExplorations(articleId).catch(() => ({ data: [], dbOps: [] })),
      listLexiqueExplorations(articleId),
      capitaineKeyword ? getKeywordIntentAnalysis(capitaineKeyword) : null,
      capitaineKeyword ? getKeywordMetrics(capitaineKeyword) : null,
    ])
    const captainExplorations = captainExplorationsRes.data
    const lieutenantExplorations = lieutenantExplorationsRes.data

    // Build "all" lists by fetching data for every keyword of the article.
    const intentAll: unknown[] = []
    const localAll: unknown[] = []
    const contentGapAll: unknown[] = []
    if (articleKeywords) {
      const allKeywords = [
        ...(articleKeywords.capitaine ? [articleKeywords.capitaine] : []),
        ...(articleKeywords.lieutenants ?? []),
      ]
      for (const kw of allKeywords) {
        const [intent, metrics] = await Promise.all([
          getKeywordIntentAnalysis(kw).catch(() => null),
          getKeywordMetrics(kw).catch(() => null),
        ])
        if (intent) intentAll.push(intent)
        if (metrics?.localAnalysis) localAll.push(metrics.localAnalysis)
        if (metrics?.contentGapAnalysis) contentGapAll.push(metrics.contentGapAnalysis)
      }
    }

    res.json({
      data: {
        capitaineKeyword,
        radar: radar ?? null,
        captain: captainExplorations ?? [],
        lieutenants: lieutenantExplorations ?? [],
        intent: { capitaine: intentCapitaine ?? null, all: intentAll },
        local: { capitaine: metricsCapitaine?.localAnalysis ?? null, all: localAll },
        contentGap: { capitaine: metricsCapitaine?.contentGapAnalysis ?? null, all: contentGapAll },
        lexique: lexiqueList,
      },
    })
  } catch (err) {
    log.error(`GET /articles/:id/explorations — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load explorations' } })
  }
})

/**
 * GET /articles/:id/explorations/counts
 *
 * Lightweight summary used by TabCachePanel to show real counts per exploration
 * type instead of binary "has data" flags.
 */
router.get('/articles/:id/explorations/counts', async (req, res) => {
  const articleId = parseArticleId(req.params.id)
  if (!articleId) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a positive integer' } })
    return
  }
  try {
    // Sprint 15.5 — intent/local/contentGap tables dropped. Counts are computed by
    // matching keywords attached to the article against the cross-article tables.
    const { query } = await import('../db/client.js')
    const rows = await query<{ source: string; count: string }>(
      `WITH article_kws AS (
         SELECT capitaine AS keyword FROM article_keywords WHERE article_id = $1 AND capitaine IS NOT NULL
         UNION
         SELECT unnest(lieutenants) FROM article_keywords WHERE article_id = $1
       )
       -- Radar: count the number of generated keywords inside the scan (not the number of scans).
       -- The table has PRIMARY KEY article_id so there's always 0 or 1 scan row;
       -- what the user cares about is how many keywords are stored in it.
       SELECT 'radar' AS source,
              COALESCE(SUM(jsonb_array_length(generated_keywords)), 0)::text AS count
         FROM radar_explorations WHERE article_id = $1
       UNION ALL SELECT 'captain', COUNT(*)::text FROM captain_explorations WHERE article_id = $1
       UNION ALL SELECT 'lieutenants', COUNT(*)::text FROM lieutenant_explorations WHERE article_id = $1
       UNION ALL SELECT 'paa', COUNT(*)::text FROM paa_explorations WHERE article_id = $1
       UNION ALL SELECT 'lexique', COUNT(*)::text FROM lexique_explorations WHERE article_id = $1
       UNION ALL SELECT 'intent', COUNT(*)::text FROM keyword_intent_analyses kia
         WHERE kia.keyword IN (SELECT keyword FROM article_kws)
       UNION ALL SELECT 'local', COUNT(*)::text FROM keyword_metrics km
         WHERE km.local_analysis IS NOT NULL AND km.keyword IN (SELECT keyword FROM article_kws)
       UNION ALL SELECT 'contentGap', COUNT(*)::text FROM keyword_metrics km
         WHERE km.content_gap_analysis IS NOT NULL AND km.keyword IN (SELECT keyword FROM article_kws)`,
      [articleId],
    )
    const counts: Record<string, number> = {}
    for (const row of rows.rows) counts[row.source] = Number(row.count)
    res.json({ data: counts })
  } catch (err) {
    log.error(`GET /articles/:id/explorations/counts — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to count explorations' } })
  }
})

/**
 * DELETE /articles/:id/external-cache
 *
 * Sprint 13 — wipe the cross-article api_cache rows whose slug matches the
 * article's capitaine keyword. Does NOT touch the article-scoped *_explorations
 * tables (those stay as the source of truth).
 */
router.delete('/articles/:id/external-cache', async (req, res) => {
  const articleId = parseArticleId(req.params.id)
  if (!articleId) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a positive integer' } })
    return
  }
  try {
    const { data: articleKeywords } = await getArticleKeywords(articleId)
    const keyword = articleKeywords?.capitaine
    if (!keyword) { res.json({ data: { cleared: 0 } }); return }
    const slug = slugify(keyword)
    const { query } = await import('../db/client.js')
    const deleteRes = await query(
      `DELETE FROM api_cache
        WHERE (cache_type IN ('autocomplete', 'autocomplete-intent', 'paa', 'serp')
                AND cache_key LIKE $1 || '%')
           OR (cache_type IN ('validate') AND cache_key LIKE $1 || '%')`,
      [slug],
    )
    log.info(`[external-cache] cleared ${deleteRes.rowCount ?? 0} rows for article=${articleId} (slug="${slug}")`)
    res.json({ data: { cleared: deleteRes.rowCount ?? 0 } })
  } catch (err) {
    log.error(`DELETE /articles/:id/external-cache — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to clear external cache' } })
  }
})

/**
 * GET /articles/:id/external-cache
 *
 * Reads ONLY cross-article data from api_cache (autocomplete, PAA, etc.) to
 * hydrate the UI without calling external APIs. Article-scoped data now lives
 * in the dedicated tables and is served by /articles/:id/explorations.
 */
router.get('/articles/:id/external-cache', async (req, res) => {
  const articleId = parseArticleId(req.params.id)
  if (!articleId) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a positive integer' } })
    return
  }

  try {
    const { data: articleKeywords } = await getArticleKeywords(articleId)
    const keyword = articleKeywords?.capitaine
    if (!keyword) {
      res.json({ data: { autocomplete: null } })
      return
    }
    const key = slugify(keyword)
    const [autocomplete] = await Promise.all([
      getCached('autocomplete', key),
    ])
    res.json({
      data: {
        autocomplete: autocomplete ?? null,
      },
    })
  } catch (err) {
    log.error(`GET /articles/:id/external-cache — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load external cache' } })
  }
})

export default router
