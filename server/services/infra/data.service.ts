import { pool } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import { measureDb } from '../../utils/db-telemetry.js'
import { microContextDbSchema } from '../../../shared/schemas/article-micro-context.schema.js'
import type {
  Article,
  ArticleType,
  ArticleStatus,
  ArticlePhase,
  ArticleKeywords,
  CaptainValidationEntry,
  RichCaptain,
  RichLieutenant,
  Cocoon,
  CocoonStats,
  CountByType,
  CountByStatus,
  Keyword,
  KeywordStatus,
  Theme,
  Silo,
  SiloStats,
  ArticleMicroContext,
  ArticleProgress,
  DbOp,
} from '../../../shared/types/index.js'
import type { PaaQuestionValidate } from '../../../shared/types/keyword-validate.types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractSlug(rawSlug: string): string {
  try {
    const url = new URL(rawSlug)
    return url.pathname.split('/').filter(Boolean).pop() ?? rawSlug
  } catch {
    return rawSlug
  }
}

function computeStats(articles: Article[]): CocoonStats {
  const byType: CountByType = { pilier: 0, intermediaire: 0, specialise: 0 }
  const byStatus: CountByStatus = { aRediger: 0, brouillon: 0, publie: 0 }

  for (const a of articles) {
    if (a.type === 'Pilier') byType.pilier++
    else if (a.type === 'Intermédiaire') byType.intermediaire++
    else byType.specialise++

    if (a.status === 'à rédiger') byStatus.aRediger++
    else if (a.status === 'brouillon') byStatus.brouillon++
    else byStatus.publie++
  }

  const completionPercent = articles.length > 0
    ? Math.round(((byStatus.brouillon + byStatus.publie) / articles.length) * 100)
    : 0

  return { totalArticles: articles.length, byType, byStatus, completionPercent }
}

function computeSiloStats(cocoons: Cocoon[]): SiloStats {
  const allArticles = cocoons.flatMap(c => c.articles)
  return computeStats(allArticles)
}

// Map a DB row to an Article
function rowToArticle(row: Record<string, unknown>): Article {
  return {
    id: row.id as number,
    title: row.titre as string,
    type: row.type as ArticleType,
    slug: extractSlug(row.slug as string),
    topic: (row.topic as string | null) ?? null,
    status: (row.status as ArticleStatus) ?? 'à rédiger',
    phase: (row.phase as ArticlePhase) ?? 'proposed',
    completedChecks: (row.completed_checks as string[]) ?? [],
    checkTimestamps: (row.check_timestamps as Record<string, string>) ?? {},
    suggestedKeyword: (row.suggested_keyword as string | null) ?? null,
    captainKeywordLocked: (row.captain_keyword_locked as string | null) ?? null,
    painPoint: (row.pain_point as string | null) ?? null,
    createdAt: row.created_at ? (row.created_at as Date).toISOString() : undefined,
    updatedAt: row.updated_at ? (row.updated_at as Date).toISOString() : undefined,
  }
}

// ---------------------------------------------------------------------------
// Articles DB (Silos → Cocoons → Articles)
// ---------------------------------------------------------------------------

export async function loadArticlesDb(): Promise<Cocoon[]> {
  const res = await pool.query(`
    SELECT
      s.id as silo_id, s.nom as silo_nom, s.description as silo_desc,
      c.id as cocoon_id, c.nom as cocoon_nom,
      a.id, a.titre, a.type, a.slug, a.topic, a.status, a.phase,
      a.completed_checks, a.check_timestamps,
      a.seo_score, a.geo_score, a.meta_title, a.meta_description,
      a.suggested_keyword, a.captain_keyword_locked, a.pain_point,
      a.created_at, a.updated_at
    FROM silos s
    JOIN cocoons c ON c.silo_id = s.id
    LEFT JOIN articles a ON a.cocoon_id = c.id
    ORDER BY s.id, c.id, a.id
  `)

  // Rebuild Cocoon[] via Map
  let globalCocoonIndex = 0
  const cocoonMap = new Map<number, Cocoon>()
  const siloNames = new Map<number, string>()

  for (const row of res.rows) {
    siloNames.set(row.silo_id, row.silo_nom)
    if (!cocoonMap.has(row.cocoon_id)) {
      cocoonMap.set(row.cocoon_id, {
        id: globalCocoonIndex++,
        name: row.cocoon_nom,
        siloName: row.silo_nom,
        articles: [],
        stats: computeStats([]),
      })
    }
    if (row.id !== null) {
      const cocoon = cocoonMap.get(row.cocoon_id)!
      cocoon.articles.push(rowToArticle(row))
    }
  }

  // Recompute stats
  const cocoons = Array.from(cocoonMap.values())
  for (const c of cocoons) {
    c.stats = computeStats(c.articles)
  }

  return cocoons
}

export async function getTheme(): Promise<Theme> {
  const res = await pool.query(`SELECT nom, description FROM silos LIMIT 1`)
  // Theme is stored in theme_config table
  const tc = await pool.query(`SELECT data FROM theme_config WHERE id = 1`)
  if (tc.rows.length > 0 && tc.rows[0].data?.nom) {
    return { nom: tc.rows[0].data.nom, description: tc.rows[0].data.description ?? '' }
  }
  // Fallback: derive from first silo
  return { nom: res.rows[0]?.nom ?? '', description: res.rows[0]?.description ?? '' }
}

export async function getSilos(): Promise<Silo[]> {
  const cocoons = await loadArticlesDb()
  const silosRes = await pool.query(`SELECT id, nom, description FROM silos ORDER BY id`)
  const cocoonsRes = await pool.query(`SELECT id, silo_id, nom FROM cocoons ORDER BY id`)

  const siloIdMap = new Map<string, number>() // silo nom → silo db id
  for (const s of silosRes.rows) siloIdMap.set(s.nom, s.id)

  const cocoonSiloMap = new Map<number, number>() // cocoon db id → silo db id
  for (const c of cocoonsRes.rows) cocoonSiloMap.set(c.id, c.silo_id)

  // Group cocoons by silo
  let globalCocoonIndex = 0
  const siloCocoonsMap = new Map<number, Cocoon[]>()

  const fullCocoonsRes = await pool.query(`
    SELECT c.id as cocoon_id, c.silo_id, c.nom as cocoon_nom, s.nom as silo_nom
    FROM cocoons c JOIN silos s ON s.id = c.silo_id ORDER BY c.silo_id, c.id
  `)

  const allArticles = await loadArticlesDb()
  const articlesByCocoonName = new Map<string, Article[]>()
  for (const c of allArticles) {
    articlesByCocoonName.set(c.name, c.articles)
  }

  for (const row of fullCocoonsRes.rows) {
    const articles = articlesByCocoonName.get(row.cocoon_nom) ?? []
    const cocoon: Cocoon = {
      id: globalCocoonIndex++,
      name: row.cocoon_nom,
      siloName: row.silo_nom,
      articles,
      stats: computeStats(articles),
    }
    if (!siloCocoonsMap.has(row.silo_id)) siloCocoonsMap.set(row.silo_id, [])
    siloCocoonsMap.get(row.silo_id)!.push(cocoon)
  }

  return silosRes.rows.map((s, idx) => {
    const cocons = siloCocoonsMap.get(s.id) ?? []
    return {
      id: idx,
      nom: s.nom,
      description: s.description ?? '',
      cocons,
      stats: computeSiloStats(cocons),
    }
  })
}

export async function getSiloByName(name: string): Promise<Silo | null> {
  const silos = await getSilos()
  return silos.find(s => s.nom === name) ?? null
}

export async function getCocoonsBySilo(siloName: string): Promise<Cocoon[]> {
  const silo = await getSiloByName(siloName)
  return silo ? silo.cocons : []
}

export async function getCocoons(): Promise<Cocoon[]> {
  return loadArticlesDb()
}

export async function getArticlesByCocoon(cocoonIndex: number): Promise<Article[] | null> {
  const cocoons = await loadArticlesDb()
  const cocoon = cocoons[cocoonIndex]
  return cocoon ? cocoon.articles : null
}

export async function getArticleById(id: number): Promise<{ article: Article; cocoonName: string } | null> {
  const res = await pool.query(`
    SELECT a.*, c.nom as cocoon_nom
    FROM articles a
    LEFT JOIN cocoons c ON c.id = a.cocoon_id
    WHERE a.id = $1
  `, [id])
  if (res.rows.length === 0) return null
  return {
    article: rowToArticle(res.rows[0]),
    cocoonName: res.rows[0].cocoon_nom ?? '',
  }
}

export async function getArticleBySlug(slug: string): Promise<{ article: Article; cocoonName: string } | null> {
  const normalizedSlug = extractSlug(slug)
  const res = await pool.query(`
    SELECT a.*, c.nom as cocoon_nom
    FROM articles a
    LEFT JOIN cocoons c ON c.id = a.cocoon_id
    WHERE a.slug = $1
  `, [normalizedSlug])
  if (res.rows.length === 0) return null
  return {
    article: rowToArticle(res.rows[0]),
    cocoonName: res.rows[0].cocoon_nom ?? '',
  }
}

export async function updateArticleStatus(id: number, status: ArticleStatus): Promise<void> {
  log.info('updateArticleStatus', { id, status })
  await pool.query(`UPDATE articles SET status = $1 WHERE id = $2`, [status, id])
}

export async function updateArticleSuggestedKeyword(id: number, suggestedKeyword: string | null): Promise<boolean> {
  log.info('updateArticleSuggestedKeyword', { id, suggestedKeyword })
  const res = await pool.query(
    `UPDATE articles SET suggested_keyword = $1 WHERE id = $2 RETURNING id`,
    [suggestedKeyword, id]
  )
  return (res.rowCount ?? 0) > 0
}

export async function updateArticleCaptainKeyword(id: number, captainKeyword: string | null): Promise<boolean> {
  log.info('updateArticleCaptainKeyword', { id, captainKeyword })
  const res = await pool.query(
    `UPDATE articles SET captain_keyword_locked = $1 WHERE id = $2 RETURNING id`,
    [captainKeyword, id]
  )
  return (res.rowCount ?? 0) > 0
}

export async function getArticleProgress(id: number): Promise<ArticleProgress | null> {
  const res = await pool.query(`
    SELECT phase, completed_checks, check_timestamps FROM articles WHERE id = $1
  `, [id])
  if (res.rows.length === 0) return null
  const row = res.rows[0]
  return {
    phase: row.phase ?? 'proposed',
    completedChecks: row.completed_checks ?? [],
    checkTimestamps: row.check_timestamps ?? {},
  }
}

export async function saveArticleProgress(id: number, progress: ArticleProgress): Promise<ArticleProgress> {
  log.debug(`saveArticleProgress: ${id} (phase=${progress.phase})`)
  await pool.query(`
    UPDATE articles
    SET phase = $1, completed_checks = $2, check_timestamps = $3
    WHERE id = $4
  `, [progress.phase, progress.completedChecks, JSON.stringify(progress.checkTimestamps ?? {}), id])
  return progress
}

export async function addArticleCheck(id: number, check: string): Promise<ArticleProgress> {
  const now = new Date().toISOString()
  await pool.query(`
    UPDATE articles
    SET
      completed_checks = CASE
        WHEN $1 = ANY(completed_checks) THEN completed_checks
        ELSE array_append(completed_checks, $1)
      END,
      check_timestamps = check_timestamps || jsonb_build_object($1, $2::text)
    WHERE id = $3
  `, [check, now, id])
  log.debug(`addArticleCheck: added "${check}" for ${id}`)
  return (await getArticleProgress(id)) ?? { phase: 'proposed', completedChecks: [], checkTimestamps: {} }
}

export async function removeArticleCheck(id: number, check: string): Promise<ArticleProgress> {
  await pool.query(`
    UPDATE articles
    SET
      completed_checks = array_remove(completed_checks, $1),
      check_timestamps = check_timestamps - $1
    WHERE id = $2
  `, [check, id])
  log.debug(`removeArticleCheck: removed "${check}" for ${id}`)
  return (await getArticleProgress(id)) ?? { phase: 'proposed', completedChecks: [], checkTimestamps: {} }
}

export async function updateArticleInCocoon(id: number, updates: { title?: string; slug?: string }): Promise<boolean> {
  const parts: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (updates.title !== undefined) { parts.push(`titre = $${idx++}`); values.push(updates.title) }
  if (updates.slug !== undefined) { parts.push(`slug = $${idx++}`); values.push(updates.slug) }
  if (parts.length === 0) return false

  values.push(id)
  const res = await pool.query(`UPDATE articles SET ${parts.join(', ')} WHERE id = $${idx}`, values)
  log.info('updateArticleInCocoon', { id, updates })
  return (res.rowCount ?? 0) > 0
}

export async function removeArticleFromCocoon(id: number): Promise<boolean> {
  // Set cocoon_id to NULL — article stays in DB
  const res = await pool.query(`UPDATE articles SET cocoon_id = NULL WHERE id = $1`, [id])
  log.info('removeArticleFromCocoon', { id })
  return (res.rowCount ?? 0) > 0
}

export async function addCocoonToSilo(siloName: string, cocoonName: string): Promise<Cocoon> {
  const siloRes = await pool.query(`SELECT id FROM silos WHERE nom = $1`, [siloName])
  if (siloRes.rows.length === 0) throw new Error(`Silo "${siloName}" not found`)
  const siloId = siloRes.rows[0].id

  const exists = await pool.query(`SELECT id FROM cocoons WHERE silo_id = $1 AND nom = $2`, [siloId, cocoonName])
  if (exists.rows.length > 0) throw new Error(`Cocoon "${cocoonName}" already exists in silo "${siloName}"`)

  const res = await pool.query(
    `INSERT INTO cocoons (silo_id, nom) VALUES ($1, $2) RETURNING id`,
    [siloId, cocoonName]
  )
  const cocoonDbId = res.rows[0].id

  const allCocoons = await loadArticlesDb()
  const id = allCocoons.findIndex(c => c.name === cocoonName)

  const emptyStats: CocoonStats = {
    totalArticles: 0,
    byType: { pilier: 0, intermediaire: 0, specialise: 0 },
    byStatus: { aRediger: 0, brouillon: 0, publie: 0 },
    completionPercent: 0,
  }

  log.info('addCocoonToSilo', { cocoonName, siloName, id: cocoonDbId })
  return { id: id >= 0 ? id : cocoonDbId, name: cocoonName, siloName, articles: [], stats: emptyStats }
}

export async function addArticlesToCocoon(
  cocoonName: string,
  articles: { title: string; type: ArticleType; slug?: string; suggestedKeyword?: string | null; painPoint?: string | null }[],
): Promise<Article[]> {
  const cocoonRes = await pool.query(`SELECT id FROM cocoons WHERE nom = $1`, [cocoonName])
  if (cocoonRes.rows.length === 0) throw new Error(`Cocoon "${cocoonName}" not found`)
  const cocoonId = cocoonRes.rows[0].id

  // Get next available ID
  const maxRes = await pool.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM articles`)
  let nextId = (maxRes.rows[0].max_id as number) + 1

  const created: Article[] = []
  const now = new Date().toISOString()

  for (const article of articles) {
    const slug = article.slug?.trim() || article.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    try {
      const res = await pool.query(`
        INSERT INTO articles (id, cocoon_id, titre, type, slug, topic, status, phase, completed_checks, check_timestamps, suggested_keyword, pain_point)
        VALUES ($1, $2, $3, $4, $5, NULL, 'à rédiger', 'proposed', '{}', '{}', $6, $7)
        ON CONFLICT (slug) DO NOTHING
        RETURNING *
      `, [nextId, cocoonId, article.title, article.type, slug, article.suggestedKeyword ?? null, article.painPoint ?? null])

      if (res.rows.length > 0) {
        created.push(rowToArticle(res.rows[0]))
        nextId++
      }
    } catch (err) {
      log.warn('addArticlesToCocoon — skip article', { slug, error: (err as Error).message })
    }
  }

  log.info('addArticlesToCocoon', { cocoonName, count: created.length })
  return created
}

export async function getKeywordsByCocoon(cocoonName: string): Promise<Keyword[] | null> {
  const res = await pool.query(
    `SELECT mot_clef, cocoon_name, type_mot_clef, statut FROM keywords_seo WHERE cocoon_name = $1`,
    [cocoonName]
  )
  if (res.rows.length === 0) return null
  return res.rows.map(r => ({
    keyword: r.mot_clef,
    cocoonName: r.cocoon_name,
    type: r.type_mot_clef,
    status: r.statut ?? 'suggested',
  }))
}

// ---------------------------------------------------------------------------
// Keywords DB
// ---------------------------------------------------------------------------

export async function loadKeywordsDb(): Promise<Keyword[]> {
  log.info('loadKeywordsDb() — fetching from PG')
  const res = await pool.query(`SELECT mot_clef, cocoon_name, type_mot_clef, statut FROM keywords_seo ORDER BY id`)
  return res.rows.map(r => ({
    keyword: r.mot_clef,
    cocoonName: r.cocoon_name,
    type: r.type_mot_clef,
    status: r.statut ?? 'suggested',
  }))
}

export async function addKeyword(keyword: Keyword): Promise<{ success: boolean; duplicate?: boolean }> {
  // Check duplicate
  const existing = await pool.query(
    `SELECT id FROM keywords_seo WHERE LOWER(mot_clef) = LOWER($1)`,
    [keyword.keyword]
  )
  if (existing.rows.length > 0) {
    log.warn('addKeyword — doublon détecté', { keyword: keyword.keyword })
    return { success: false, duplicate: true }
  }

  await pool.query(
    `INSERT INTO keywords_seo (cocoon_name, mot_clef, type_mot_clef, statut) VALUES ($1, $2, $3, $4)`,
    [keyword.cocoonName ?? null, keyword.keyword, keyword.type ?? null, keyword.status ?? 'suggested']
  )
  log.info('addKeyword — succès', { keyword: keyword.keyword, cocoon: keyword.cocoonName })
  return { success: true }
}

export async function replaceKeyword(oldKeyword: string, newKeyword: Keyword): Promise<boolean> {
  const res = await pool.query(
    `UPDATE keywords_seo SET mot_clef = $1, type_mot_clef = $2, cocoon_name = $3 WHERE mot_clef = $4`,
    [newKeyword.keyword, newKeyword.type ?? null, newKeyword.cocoonName ?? null, oldKeyword]
  )
  return (res.rowCount ?? 0) > 0
}

export async function updateKeywordStatus(keywordText: string, status: KeywordStatus): Promise<boolean> {
  const res = await pool.query(
    `UPDATE keywords_seo SET statut = $1 WHERE mot_clef = $2`,
    [status, keywordText]
  )
  return (res.rowCount ?? 0) > 0
}

export async function deleteKeyword(keywordText: string): Promise<boolean> {
  const res = await pool.query(`DELETE FROM keywords_seo WHERE mot_clef = $1`, [keywordText])
  return (res.rowCount ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Article Keywords — Decision layer (article_keywords table)
// ---------------------------------------------------------------------------

export async function getArticleKeywords(id: number): Promise<{ data: ArticleKeywords | null; dbOps: DbOp[] }> {
  const ops: DbOp[] = []
  const t1 = Date.now()
  const res = await pool.query(`SELECT * FROM article_keywords WHERE article_id = $1`, [id])
  ops.push({ operation: 'select', table: 'article_keywords', rowCount: res.rows.length, ms: Date.now() - t1 })
  if (res.rows.length === 0) return { data: null, dbOps: ops }
  const row = res.rows[0]

  // Hydrate from exploration tables
  const { data: validationHistory, dbOps: captainOps } = await getCaptainExplorations(id)
  ops.push(...captainOps)
  const { data: richLieutenants, dbOps: lieutOps } = await getLieutenantExplorations(id)
  ops.push(...lieutOps)

  // Build richCaptain from decision + exploration data.
  // NOTE: we also build it when validationHistory is non-empty even without a
  // locked captain — otherwise the carousel on the Captain tab can't rehydrate
  // past explorations after a refresh. (Bug fix Sprint 0.1.)
  const captainKeyword = row.capitaine ?? ''
  const hasExplorations = validationHistory.length > 0
  const captainTest = captainKeyword
    ? validationHistory.find(v => v.keyword === captainKeyword)
    : undefined
  const richCaptain: RichCaptain | undefined = (captainKeyword || hasExplorations) ? {
    keyword: captainKeyword,
    status: row.captain_locked_at ? 'locked' : 'suggested',
    validationHistory,
    aiPanelMarkdown: captainTest?.aiPanelMarkdown ?? null,
    lockedAt: row.captain_locked_at?.toISOString() ?? null,
  } : undefined

  return {
    data: {
      articleId: id,
      capitaine: captainKeyword,
      lieutenants: row.lieutenants ?? [],
      lexique: row.lexique ?? [],
      rootKeywords: row.root_keywords ?? [],
      hnStructure: row.hn_structure ?? [],
      richCaptain,
      richRootKeywords: validationHistory.flatMap(v =>
        (v.rootKeywords ?? []).map(rk => ({
          keyword: rk, parentKeyword: v.keyword,
          kpis: [], articleLevel: v.articleLevel, timestamp: '',
        }))
      ),
      richLieutenants: richLieutenants.length ? richLieutenants : undefined,
    },
    dbOps: ops,
  }
}

export async function saveArticleKeywords(id: number, data: Omit<ArticleKeywords, 'articleId'>): Promise<ArticleKeywords> {
  // Decision layer only → article_keywords
  await pool.query(`
    INSERT INTO article_keywords (article_id, capitaine, lieutenants, lexique, hn_structure, captain_locked_at, root_keywords)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (article_id) DO UPDATE
    SET capitaine = EXCLUDED.capitaine, lieutenants = EXCLUDED.lieutenants,
        lexique = EXCLUDED.lexique, hn_structure = EXCLUDED.hn_structure,
        captain_locked_at = EXCLUDED.captain_locked_at, root_keywords = EXCLUDED.root_keywords
  `, [
    id,
    data.capitaine ?? '',
    data.lieutenants ?? [],
    data.lexique ?? [],
    data.hnStructure ? JSON.stringify(data.hnStructure) : null,
    data.richCaptain?.lockedAt ?? null,
    data.rootKeywords ?? [],
  ])

  // Mirror captain lock state on articles table
  const mirrored = data.richCaptain?.status === 'locked'
    ? (data.richCaptain.keyword ?? null)
    : null
  await updateArticleCaptainKeyword(id, mirrored).catch(err => {
    log.warn('saveArticleKeywords — mirror captainKeyword failed', { id, error: (err as Error).message })
  })

  return { articleId: id, ...data }
}

// ---------------------------------------------------------------------------
// Captain Explorations (captain_explorations + paa_explorations tables)
// ---------------------------------------------------------------------------

export async function getCaptainExplorations(articleId: number): Promise<{ data: CaptainValidationEntry[]; dbOps: DbOp[] }> {
  const ops: DbOp[] = []
  // Sprint 15.3-bis — JOIN keyword_metrics to rebuild KPIs on the fly.
  // captain_explorations no longer stores `kpis` (migration 011).
  const t1 = Date.now()
  const res = await pool.query(
    `SELECT
       ce.article_id, ce.keyword, ce.article_level, ce.status,
       ce.root_keywords, ce.ai_panel_markdown, ce.explored_at, ce.locked_at,
       km.search_volume, km.keyword_difficulty, km.cpc, km.competition,
       km.intent_raw, km.autocomplete_suggestions, km.fetched_at AS metrics_fetched_at
       FROM captain_explorations ce
       LEFT JOIN keyword_metrics km
         ON km.keyword = ce.keyword AND km.lang = 'fr' AND km.country = 'fr'
      WHERE ce.article_id = $1
      ORDER BY ce.explored_at`,
    [articleId],
  )
  ops.push({ operation: 'select', table: 'captain_explorations+keyword_metrics', rowCount: res.rows.length, ms: Date.now() - t1 })
  // Hydrate PAA questions from dedicated table
  const t2 = Date.now()
  const paaRes = await pool.query(
    `SELECT * FROM paa_explorations WHERE article_id = $1 ORDER BY explored_at`, [articleId]
  )
  ops.push({ operation: 'select', table: 'paa_explorations', rowCount: paaRes.rows.length, ms: Date.now() - t2 })
  const paaByKeyword = new Map<string, PaaQuestionValidate[]>()
  for (const p of paaRes.rows) {
    const list = paaByKeyword.get(p.keyword) ?? []
    list.push({
      question: p.question,
      answer: p.answer ?? null,
      match: (p.is_match ? (p.match_quality === 'exact' ? 'total' : 'partial') : 'none') as 'none' | 'partial' | 'total',
      matchQuality: (p.match_quality ?? undefined) as 'exact' | 'stem' | undefined,
    })
    paaByKeyword.set(p.keyword, list)
  }

  const data = res.rows.map(t => {
    // Rebuild KPIs from keyword_metrics columns. If the row exists in DB we expose
    // non-null values, otherwise an empty array (the UI will show "missing metrics").
    const kpis: Array<{ name: string; rawValue: number }> = []
    if (t.metrics_fetched_at) {
      kpis.push({ name: 'volume', rawValue: Number(t.search_volume ?? 0) })
      kpis.push({ name: 'kd', rawValue: Number(t.keyword_difficulty ?? 0) })
      kpis.push({ name: 'cpc', rawValue: Number(t.cpc ?? 0) })
      kpis.push({ name: 'intent', rawValue: Number(t.intent_raw ?? 0.5) })
      const suggestions = (t.autocomplete_suggestions ?? []) as Array<{ text: string; position: number }>
      const keywordLower = (t.keyword as string).toLowerCase()
      const autoPos = suggestions.find(s => s.text.toLowerCase() === keywordLower)?.position ?? 0
      kpis.push({ name: 'autocomplete', rawValue: autoPos })
      kpis.push({ name: 'paa', rawValue: 0 })
    }
    return {
      keyword: t.keyword,
      kpis,
      articleLevel: t.article_level,
      rootKeywords: t.root_keywords ?? [],
      paaQuestions: paaByKeyword.get(t.keyword) ?? [],
      aiPanelMarkdown: t.ai_panel_markdown ?? null,
      exploredAt: t.explored_at?.toISOString() ?? null,
    }
  })
  return { data, dbOps: ops }
}

export async function saveCaptainExploration(
  articleId: number,
  entry: CaptainValidationEntry & { status?: string }
): Promise<DbOp[]> {
  const ops: DbOp[] = []

  // Pattern measureDb : timing automatique + log debug + DbOp prêt à propager.
  // Évite la duplication `t1 = Date.now() ; pool.query() ; ops.push({ ms: Date.now() - t1 })`
  // qu'on retrouvait à 12+ endroits dans ce service.
  ops.push(await measureDb('captain_explorations', 'upsert', async () => {
    const res = await pool.query(`
      INSERT INTO captain_explorations (article_id, keyword, status, article_level, root_keywords, ai_panel_markdown, explored_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (article_id, keyword) DO UPDATE
      SET root_keywords = EXCLUDED.root_keywords,
          ai_panel_markdown = COALESCE(EXCLUDED.ai_panel_markdown, captain_explorations.ai_panel_markdown),
          status = EXCLUDED.status,
          explored_at = NOW()
    `, [
      articleId, entry.keyword, entry.status ?? 'suggested', entry.articleLevel,
      entry.rootKeywords ?? [], entry.aiPanelMarkdown ?? null,
    ])
    return res.rowCount ?? 0
  }))

  // UPSERT PAA questions into dedicated table
  if (entry.paaQuestions?.length) {
    ops.push(await measureDb('paa_explorations', 'upsert', async () => {
      let paaRows = 0
      for (const paa of entry.paaQuestions ?? []) {
        const paaRes = await pool.query(`
          INSERT INTO paa_explorations (article_id, keyword, question, answer, is_match, match_quality, explored_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (article_id, keyword, question) DO UPDATE
          SET answer = EXCLUDED.answer, is_match = EXCLUDED.is_match,
              match_quality = EXCLUDED.match_quality, explored_at = NOW()
        `, [
          articleId, entry.keyword, paa.question, paa.answer ?? null,
          paa.match !== 'none', paa.matchQuality ?? null,
        ])
        paaRows += paaRes.rowCount ?? 0
      }
      return paaRows
    }))
  }
  return ops
}

export async function updateCaptainExplorationAiPanel(
  articleId: number, keyword: string, markdown: string
): Promise<DbOp> {
  // Pattern measureDb : timing + log debug + DbOp prêt à propager.
  return measureDb('captain_explorations', 'update', async () => {
    const res = await pool.query(`
      UPDATE captain_explorations SET ai_panel_markdown = $1, explored_at = NOW()
      WHERE article_id = $2 AND keyword = $3
    `, [markdown, articleId, keyword])
    return res.rowCount ?? 0
  })
}

// ---------------------------------------------------------------------------
// Lieutenant Explorations (lieutenant_explorations table)
// ---------------------------------------------------------------------------

export async function getLieutenantExplorations(articleId: number): Promise<{ data: RichLieutenant[]; dbOps: DbOp[] }> {
  const t = Date.now()
  const res = await pool.query(
    `SELECT * FROM lieutenant_explorations WHERE article_id = $1 ORDER BY score DESC`, [articleId]
  )
  const dbOps: DbOp[] = [{ operation: 'select', table: 'lieutenant_explorations', rowCount: res.rows.length, ms: Date.now() - t }]
  const data = res.rows.map(lt => ({
    keyword: lt.keyword,
    status: lt.status,
    reasoning: lt.reasoning ?? '',
    sources: lt.sources ?? [],
    suggestedHnLevel: lt.suggested_hn_level ?? 2,
    score: lt.score ?? 0,
    kpis: lt.kpis ?? null,
    lockedAt: lt.locked_at?.toISOString() ?? null,
    exploredAt: lt.explored_at?.toISOString() ?? null,
  }))
  return { data, dbOps }
}

export async function saveLieutenantExplorations(
  articleId: number, entries: RichLieutenant[], captainKeyword: string
): Promise<DbOp> {
  const t = Date.now()
  let rowCount = 0
  for (const lt of entries) {
    const res = await pool.query(`
      INSERT INTO lieutenant_explorations (article_id, keyword, status, captain_keyword, reasoning, sources, suggested_hn_level, score, kpis, locked_at, explored_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (article_id, keyword) DO UPDATE
      SET status = CASE WHEN lieutenant_explorations.status IN ('locked','eliminated') AND EXCLUDED.status = 'suggested'
                       THEN lieutenant_explorations.status ELSE EXCLUDED.status END,
          captain_keyword = EXCLUDED.captain_keyword,
          reasoning = EXCLUDED.reasoning, sources = EXCLUDED.sources,
          suggested_hn_level = EXCLUDED.suggested_hn_level,
          score = EXCLUDED.score, kpis = EXCLUDED.kpis,
          locked_at = CASE WHEN lieutenant_explorations.status IN ('locked','eliminated') AND EXCLUDED.status = 'suggested'
                           THEN lieutenant_explorations.locked_at ELSE EXCLUDED.locked_at END,
          explored_at = NOW()
    `, [
      articleId, lt.keyword, lt.status, captainKeyword,
      lt.reasoning, lt.sources, lt.suggestedHnLevel,
      lt.score, lt.kpis ? JSON.stringify(lt.kpis) : null, lt.lockedAt ?? null,
    ])
    rowCount += res.rowCount ?? 0
  }
  return { operation: 'upsert', table: 'lieutenant_explorations', rowCount, ms: Date.now() - t }
}

/**
 * Sprint 12 (D3) — Mark all non-archived lieutenant rows as archived so they
 * stop being displayed by default in the UI while staying in DB for audit.
 * Used when the user unlocks the Capitaine and chooses "Archiver".
 */
export async function archiveLieutenantExplorations(articleId: number): Promise<number> {
  const res = await pool.query(
    `UPDATE lieutenant_explorations
        SET status = 'archived'
      WHERE article_id = $1
        AND status <> 'archived'`,
    [articleId],
  )
  return res.rowCount ?? 0
}

export async function getArticleKeywordsByCocoon(cocoonName: string): Promise<ArticleKeywords[]> {
  const res = await pool.query(`
    SELECT ak.* FROM article_keywords ak
    JOIN articles a ON a.id = ak.article_id
    JOIN cocoons c ON c.id = a.cocoon_id
    WHERE c.nom = $1
  `, [cocoonName])

  return res.rows.map(row => ({
    articleId: row.article_id,
    capitaine: row.capitaine ?? '',
    lieutenants: row.lieutenants ?? [],
    lexique: row.lexique ?? [],
    hnStructure: row.hn_structure ?? [],
    rootKeywords: [],
  }))
}

export async function getCocoonExistingLieutenants(id: number): Promise<string[]> {
  const found = await getArticleById(id)
  if (!found) return []
  const siblingKeywords = await getArticleKeywordsByCocoon(found.cocoonName)
  return siblingKeywords
    .filter(ak => ak.articleId !== id)
    .flatMap(ak => ak.lieutenants ?? [])
}

// ---------------------------------------------------------------------------
// Micro-context
// ---------------------------------------------------------------------------

export async function loadArticleMicroContext(id: number): Promise<ArticleMicroContext | null> {
  const res = await pool.query(`
    SELECT amc.*, a.slug FROM article_micro_contexts amc
    JOIN articles a ON a.id = amc.article_id
    WHERE amc.article_id = $1
  `, [id])
  if (res.rows.length === 0) return null
  const row = res.rows[0]
  return {
    id,
    slug: row.slug ?? '',
    angle: row.angle ?? '',
    tone: row.tone ?? '',
    directives: row.directives ?? '',
    targetWordCount: row.target_word_count ?? undefined,
    updatedAt: row.updated_at ? (row.updated_at as Date).toISOString() : new Date().toISOString(),
  }
}

export async function saveArticleMicroContext(id: number, data: Omit<ArticleMicroContext, 'id'>): Promise<ArticleMicroContext> {
  await pool.query(`
    INSERT INTO article_micro_contexts (article_id, angle, tone, directives, target_word_count)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (article_id) DO UPDATE
    SET angle = EXCLUDED.angle, tone = EXCLUDED.tone, directives = EXCLUDED.directives,
        target_word_count = EXCLUDED.target_word_count
  `, [id, data.angle ?? '', data.tone ?? '', data.directives ?? '', data.targetWordCount ?? null])

  // Validate with schema (keep existing validation)
  microContextDbSchema.parse({ micro_contexts: [{ id, ...data }] })

  return { id, ...data }
}

/** Reset caches (no-op for PG — kept for compatibility) */
export function resetCache(): void {
  log.debug('resetCache() — no-op in PG mode')
}
