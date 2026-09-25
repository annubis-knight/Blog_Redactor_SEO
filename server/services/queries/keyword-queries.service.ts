/**
 * -bis — Helpers CRUD "lecture reconstruite"
 *
 * Après les Sprints 15.3 à 15.8, plusieurs tables article-scoped ont été
 * supprimées via migrations dédiées :
 *   - `local_explorations` et `content_gap_explorations` → migration 012
 *   - `serp_explorations` → migration 013
 *   - `intent_explorations` → migration 016 (jamais matérialisée en DB live,
 *     drop idempotent pour aligner le code avec la réalité)
 *
 * Leurs données vivent maintenant dans des tables cross-article
 * (keyword_metrics, keyword_discoveries).
 *
 * Ces helpers reconstruisent à la volée les informations que l'UI attend via
 * des JOIN SQL, sans introduire de nouvelles tables.
 *
 * AUTHORITY: PostgreSQL `keyword_metrics` (KPIs, local, content gap),
 *            `captain_explorations`, `lieutenant_explorations`,
 *            `article_keywords`, `articles`, `cocoons`, `cocoon_strategies`,
 *            et via les services lus `radar_explorations`, `lexique_explorations`,
 *            `keyword_serp_results` (lecture seule, aucune écriture).
 * READS FROM: keyword-metrics.service, data.service, radar-exploration.service,
 *             lexique-exploration.service, keyword-serp.service
 * WRITES TO: rien.
 * CONSUMERS: keyword-queries.routes.ts (GET /keywords/:keyword/usage|metrics,
 *            /keywords/:keyword/local-for-article|content-gap-for-article/:articleId,
 *            /cocoons/:id/keyword-metrics). `listArticleExplorations` : aucun
 *            appelant à ce jour (la route GET /articles/:id/explorations a le sien).
 *            `keyword_intent_analyses` n'est plus lue (M3, épopée qualité SEO) :
 *            la table n'a plus de producteur ; `getKeywordIntentForArticle`, sa
 *            route `intent-for-article` et les champs intent des agrégats sont supprimés.
 */
import { query } from '../../db/client.js'
import {
  getKeywordMetrics,
  type KeywordMetrics,
  isKeywordMetricsFresh,
} from '../keyword/keyword-metrics.service.js'
import { getRadarExploration } from '../infra/radar-exploration.service.js'
import {
  getArticleKeywords,
  getCaptainExplorations,
  getLieutenantExplorations,
} from '../infra/data.service.js'
import { listLexiqueExplorations } from '../keyword/lexique-exploration.service.js'
import { getSerpResults } from '../keyword/keyword-serp.service.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KeywordRole = 'capitaine' | 'lieutenant' | 'root'

export interface ArticleUsingKeyword {
  articleId: number
  articleTitle: string
  role: KeywordRole
  status: 'suggested' | 'locked' | 'archived' | 'eliminated' | null
  since: string | null
}

export interface KeywordMetricsWithFreshness {
  exists: boolean
  fetchedAt: string | null
  isFresh: boolean
  needsRefresh: boolean
  usedByArticles: number
  metrics: KeywordMetrics | null
}

export interface CocoonKeywordMetrics {
  cocoonName: string | null
  strategy: unknown | null
  keywords: Array<{
    keyword: string
    usedByArticleIds: number[]
    metrics: KeywordMetrics | null
  }>
  aggregates: {
    totalKeywords: number
    avgVolume: number
    avgKD: number
    totalArticles: number
  }
}

// ---------------------------------------------------------------------------
// 1. Articles using a given keyword
// ---------------------------------------------------------------------------

/**
 * Which articles have used this keyword? Scans capitaine, lieutenants[] and
 * root_keywords via captain_explorations.root_keywords.
 */
export async function getArticlesUsingKeyword(
  keyword: string,
  roleFilter?: KeywordRole | 'any',
): Promise<ArticleUsingKeyword[]> {
  const results: ArticleUsingKeyword[] = []
  const norm = keyword.toLowerCase()

  // Capitaine matches (both article_keywords.capitaine and captain_explorations history)
  const capRes = await query<{
    article_id: number
    title: string
    status: string | null
    explored_at: Date | null
  }>(
    `SELECT ce.article_id, a.titre AS title, ce.status, ce.explored_at
       FROM captain_explorations ce
       JOIN articles a ON a.id = ce.article_id
      WHERE LOWER(ce.keyword) = $1`,
    [norm],
  )
  for (const r of capRes.rows) {
    results.push({
      articleId: r.article_id,
      articleTitle: r.title,
      role: 'capitaine',
      status: (r.status as ArticleUsingKeyword['status']) ?? null,
      since: r.explored_at?.toISOString() ?? null,
    })
  }

  // Lieutenant matches
  const ltRes = await query<{
    article_id: number
    title: string
    status: string | null
    explored_at: Date | null
  }>(
    `SELECT le.article_id, a.titre AS title, le.status, le.explored_at
       FROM lieutenant_explorations le
       JOIN articles a ON a.id = le.article_id
      WHERE LOWER(le.keyword) = $1`,
    [norm],
  )
  for (const r of ltRes.rows) {
    results.push({
      articleId: r.article_id,
      articleTitle: r.title,
      role: 'lieutenant',
      status: (r.status as ArticleUsingKeyword['status']) ?? null,
      since: r.explored_at?.toISOString() ?? null,
    })
  }

  // Root keyword matches (captain_explorations.root_keywords TEXT[])
  const rootRes = await query<{
    article_id: number
    title: string
  }>(
    `SELECT ce.article_id, a.titre AS title
       FROM captain_explorations ce
       JOIN articles a ON a.id = ce.article_id
      WHERE $1 = ANY(ce.root_keywords)
         OR LOWER($2::text) = ANY(SELECT LOWER(x) FROM unnest(ce.root_keywords) AS x)`,
    [keyword, keyword],
  )
  for (const r of rootRes.rows) {
    results.push({
      articleId: r.article_id,
      articleTitle: r.title,
      role: 'root',
      status: null,
      since: null,
    })
  }

  if (roleFilter && roleFilter !== 'any') {
    return results.filter(r => r.role === roleFilter)
  }
  return results
}

// ---------------------------------------------------------------------------
// 2. Local analysis for an article context (reads keyword_metrics.local_analysis)
// ---------------------------------------------------------------------------

export async function getKeywordLocalAnalysisForArticle(articleId: number, keyword: string) {
  const metrics = await getKeywordMetrics(keyword).catch(() => null)
  return {
    analysis: metrics?.localAnalysis ?? null,
    comparison: metrics?.localComparison ?? null,
    articleId,
    keyword,
    fetchedAt: metrics?.fetchedAt ?? null,
  }
}

// ---------------------------------------------------------------------------
// 3. Content gap for an article context (reads keyword_metrics.content_gap_analysis)
// ---------------------------------------------------------------------------

export async function getKeywordContentGapForArticle(articleId: number, keyword: string) {
  const metrics = await getKeywordMetrics(keyword).catch(() => null)
  return {
    analysis: metrics?.contentGapAnalysis ?? null,
    articleId,
    keyword,
    fetchedAt: metrics?.fetchedAt ?? null,
  }
}

// ---------------------------------------------------------------------------
// 4. Full explorations aggregate for an article
// ---------------------------------------------------------------------------

export async function listArticleExplorations(articleId: number) {
  const { data: articleKeywords } = await getArticleKeywords(articleId)
  const capitaineKeyword = articleKeywords?.capitaine ?? null

  const [radar, captainRes, lieutenantsRes, lexique, metricsCapitaine] = await Promise.all([
    getRadarExploration(articleId).catch(() => null),
    getCaptainExplorations(articleId).catch(() => ({ data: [], dbOps: [] })),
    getLieutenantExplorations(articleId).catch(() => ({ data: [], dbOps: [] })),
    listLexiqueExplorations(articleId).catch(() => []),
    capitaineKeyword ? getKeywordMetrics(capitaineKeyword).catch(() => null) : null,
  ])
  const captain = captainRes.data
  const lieutenants = lieutenantsRes.data

  return {
    capitaineKeyword,
    radar,
    captain,
    lieutenants,
    lexique,
    local: metricsCapitaine?.localAnalysis ?? null,
    contentGap: metricsCapitaine?.contentGapAnalysis ?? null,
    comparison: metricsCapitaine?.localComparison ?? null,

    // (~50-100 ko) ; il lit uniquement les URLs Top 10 depuis keyword_serp_results.
    serp: capitaineKeyword
      ? { competitors: await getSerpResults(capitaineKeyword).catch(() => []) }
      : null,
  }
}

// ---------------------------------------------------------------------------
// 5. Freshness introspection
// ---------------------------------------------------------------------------

export async function getKeywordMetricsWithFreshness(keyword: string): Promise<KeywordMetricsWithFreshness> {
  const metrics = await getKeywordMetrics(keyword).catch(() => null)
  const usage = await getArticlesUsingKeyword(keyword, 'any').catch(() => [])
  if (!metrics) {
    return {
      exists: false,
      fetchedAt: null,
      isFresh: false,
      needsRefresh: true,
      usedByArticles: usage.length,
      metrics: null,
    }
  }
  const fresh = isKeywordMetricsFresh(metrics.fetchedAt)
  return {
    exists: true,
    fetchedAt: metrics.fetchedAt,
    isFresh: fresh,
    needsRefresh: !fresh,
    usedByArticles: usage.length,
    metrics,
  }
}

// ---------------------------------------------------------------------------
// 6. Cocoon-level aggregate of keyword metrics
// ---------------------------------------------------------------------------

export async function getCocoonKeywordMetrics(cocoonId: number): Promise<CocoonKeywordMetrics> {
  const cocoonRes = await query<{ nom: string }>(`SELECT nom FROM cocoons WHERE id = $1`, [cocoonId])
  const cocoonName = cocoonRes.rows[0]?.nom ?? null

  // All articles in the cocoon
  const articlesRes = await query<{ id: number }>(
    `SELECT id FROM articles WHERE cocoon_id = $1`,
    [cocoonId],
  )
  const articleIds = articlesRes.rows.map(r => r.id)
  if (articleIds.length === 0) {
    return {
      cocoonName,
      strategy: null,
      keywords: [],
      aggregates: { totalKeywords: 0, avgVolume: 0, avgKD: 0, totalArticles: 0 },
    }
  }

  // Strategy ( — cocoon_strategies table)
  const stratRes = await query<{ data: unknown }>(
    `SELECT data FROM cocoon_strategies WHERE cocoon_id = $1`,
    [cocoonId],
  )
  const strategy = stratRes.rows[0]?.data ?? null

  // Collect all keywords used in any article of the cocoon (capitaine + lieutenants)
  const kwRes = await query<{ article_id: number; capitaine: string | null; lieutenants: string[] }>(
    `SELECT article_id, capitaine, lieutenants FROM article_keywords WHERE article_id = ANY($1::int[])`,
    [articleIds],
  )

  const keywordToArticles = new Map<string, Set<number>>()
  for (const row of kwRes.rows) {
    if (row.capitaine) {
      if (!keywordToArticles.has(row.capitaine)) keywordToArticles.set(row.capitaine, new Set())
      keywordToArticles.get(row.capitaine)!.add(row.article_id)
    }
    for (const lt of row.lieutenants ?? []) {
      if (!keywordToArticles.has(lt)) keywordToArticles.set(lt, new Set())
      keywordToArticles.get(lt)!.add(row.article_id)
    }
  }

  // Fetch metrics for each keyword
  const keywords: CocoonKeywordMetrics['keywords'] = []
  let totalVolume = 0
  let totalKD = 0
  let kpiCount = 0
  for (const [kw, articleSet] of keywordToArticles) {
    const metrics = await getKeywordMetrics(kw).catch(() => null)
    keywords.push({
      keyword: kw,
      usedByArticleIds: Array.from(articleSet).sort((a, b) => a - b),
      metrics,
    })
    if (metrics?.searchVolume !== null && metrics?.searchVolume !== undefined) {
      totalVolume += metrics.searchVolume
      kpiCount++
    }
    if (metrics?.keywordDifficulty !== null && metrics?.keywordDifficulty !== undefined) {
      totalKD += metrics.keywordDifficulty
    }
  }

  return {
    cocoonName,
    strategy,
    keywords,
    aggregates: {
      totalKeywords: keywordToArticles.size,
      avgVolume: kpiCount > 0 ? Math.round(totalVolume / kpiCount) : 0,
      avgKD: kpiCount > 0 ? Math.round(totalKD / kpiCount) : 0,
      totalArticles: articleIds.length,
    },
  }
}
