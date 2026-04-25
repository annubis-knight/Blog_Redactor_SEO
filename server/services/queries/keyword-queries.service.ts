/**
 * Sprint 15.9-bis — Helpers CRUD "lecture reconstruite"
 *
 * Après les Sprints 15.3 à 15.8, plusieurs tables article-scoped ont été
 * supprimées (intent_explorations, local_explorations, content_gap_explorations,
 * serp_explorations). Leurs données vivent maintenant dans des tables
 * cross-article (keyword_metrics, keyword_intent_analyses, keyword_discoveries).
 *
 * Ces helpers reconstruisent à la volée les informations que l'UI attend via
 * des JOIN SQL, sans introduire de nouvelles tables.
 */
import { query } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import {
  getKeywordMetrics,
  type KeywordMetrics,
  isKeywordMetricsFresh,
} from '../keyword/keyword-metrics.service.js'
import {
  getKeywordIntentAnalysis,
  type KeywordIntentAnalysis,
} from '../intent/keyword-intent-analysis.service.js'
import {
  getKeywordDiscovery,
  type KeywordDiscovery,
} from '../keyword/keyword-discovery-db.service.js'
import { getRadarExploration } from '../infra/radar-exploration.service.js'
import {
  getArticleKeywords,
  getCaptainExplorations,
  getLieutenantExplorations,
} from '../infra/data.service.js'
import { listLexiqueExplorations } from '../keyword/lexique-exploration.service.js'

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

export interface KeywordIntentForArticle {
  analysis: KeywordIntentAnalysis | null
  articleContext: {
    role: KeywordRole | 'not-used'
    articleLevel: string | null
    articleTitle: string | null
  }
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
    intentAnalysis: KeywordIntentAnalysis | null
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
// 2. Keyword intent analysis for an article context
// ---------------------------------------------------------------------------

export async function getKeywordIntentForArticle(
  articleId: number,
  keyword: string,
): Promise<KeywordIntentForArticle> {
  const analysis = await getKeywordIntentAnalysis(keyword).catch(() => null)

  // Determine role of this keyword for this article
  const { data: articleKeywords } = await getArticleKeywords(articleId)
  let role: KeywordIntentForArticle['articleContext']['role'] = 'not-used'
  if (articleKeywords) {
    if (articleKeywords.capitaine?.toLowerCase() === keyword.toLowerCase()) role = 'capitaine'
    else if (articleKeywords.lieutenants?.some((l: string) => l.toLowerCase() === keyword.toLowerCase())) role = 'lieutenant'
  }

  const articleRow = await query<{ titre: string; type: string }>(
    `SELECT titre, type FROM articles WHERE id = $1`,
    [articleId],
  )
  const articleLevelMap: Record<string, string> = {
    'Pilier': 'pilier',
    'Intermédiaire': 'intermediaire',
    'Spécialisé': 'specifique',
  }

  return {
    analysis,
    articleContext: {
      role,
      articleLevel: articleRow.rows[0] ? (articleLevelMap[articleRow.rows[0].type] ?? null) : null,
      articleTitle: articleRow.rows[0]?.titre ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// 3. Local analysis for an article context (reads keyword_metrics.local_analysis)
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
// 4. Content gap for an article context (reads keyword_metrics.content_gap_analysis)
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
// 5. Full explorations aggregate for an article
// ---------------------------------------------------------------------------

export async function listArticleExplorations(articleId: number) {
  const { data: articleKeywords } = await getArticleKeywords(articleId)
  const capitaineKeyword = articleKeywords?.capitaine ?? null

  const [radar, captainRes, lieutenantsRes, lexique, intentCapitaine, metricsCapitaine] = await Promise.all([
    getRadarExploration(articleId).catch(() => null),
    getCaptainExplorations(articleId).catch(() => ({ data: [], dbOps: [] })),
    getLieutenantExplorations(articleId).catch(() => ({ data: [], dbOps: [] })),
    listLexiqueExplorations(articleId).catch(() => []),
    capitaineKeyword ? getKeywordIntentAnalysis(capitaineKeyword).catch(() => null) : null,
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
    intent: intentCapitaine,
    local: metricsCapitaine?.localAnalysis ?? null,
    contentGap: metricsCapitaine?.contentGapAnalysis ?? null,
    comparison: metricsCapitaine?.localComparison ?? null,
    serp: metricsCapitaine?.serpRawJson ?? null,
  }
}

// ---------------------------------------------------------------------------
// 6. Freshness introspection
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
// 7. Cocoon-level aggregate of keyword metrics
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

  // Strategy (Sprint 15.7 — cocoon_strategies table)
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

  // Fetch metrics + intent for each keyword
  const keywords: CocoonKeywordMetrics['keywords'] = []
  let totalVolume = 0
  let totalKD = 0
  let kpiCount = 0
  for (const [kw, articleSet] of keywordToArticles) {
    const [metrics, intent] = await Promise.all([
      getKeywordMetrics(kw).catch(() => null),
      getKeywordIntentAnalysis(kw).catch(() => null),
    ])
    keywords.push({
      keyword: kw,
      usedByArticleIds: Array.from(articleSet).sort((a, b) => a - b),
      metrics,
      intentAnalysis: intent,
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
