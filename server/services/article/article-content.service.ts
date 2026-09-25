import { pool } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import type { ArticleContent } from '../../../shared/types/index.js'
import { nextArticlePhase } from '../../../shared/utils/article-phase.js'
import { pruneStaleLinks } from './linking.service.js'

const DEFAULT_CONTENT: ArticleContent = {
  outline: null,
  content: null,
  metaTitle: null,
  metaDescription: null,
  seoScore: null,
  geoScore: null,
  updatedAt: null,
}

function normalizeOutline(outline: ArticleContent['outline']): ArticleContent['outline'] {
  if (typeof outline === 'string') {
    try { return JSON.parse(outline) } catch { return outline }
  }
  return outline
}

export async function getArticleContent(id: number): Promise<ArticleContent> {
  const res = await pool.query(
    `SELECT outline, content, updated_at FROM article_content WHERE article_id = $1`,
    [id]
  )
  if (res.rows.length === 0) {
    log.warn(`getArticleContent: ${id} not found, using defaults`)
    return { ...DEFAULT_CONTENT }
  }
  const row = res.rows[0]
  // Also fetch meta from articles table
  const artRes = await pool.query(
    `SELECT meta_title, meta_description, seo_score, geo_score FROM articles WHERE id = $1`,
    [id]
  )
  const art = artRes.rows[0]
  log.debug(`getArticleContent: loaded ${id}`)
  return {
    outline: normalizeOutline(row.outline),
    content: row.content ?? null,
    metaTitle: art?.meta_title ?? null,
    metaDescription: art?.meta_description ?? null,
    seoScore: art?.seo_score ?? null,
    geoScore: art?.geo_score ?? null,
    updatedAt: row.updated_at ? (row.updated_at as Date).toISOString() : null,
  }
}

export async function saveArticleContent(
  id: number,
  updates: Partial<ArticleContent>,
): Promise<ArticleContent> {
  // Normalize outline — always store as object
  if (updates.outline !== undefined) {
    updates.outline = normalizeOutline(updates.outline)
  }

  // Save outline + content in article_content table
  if (updates.outline !== undefined || updates.content !== undefined) {
    await pool.query(`
      INSERT INTO article_content (article_id, outline, content)
      VALUES ($1, $2, $3)
      ON CONFLICT (article_id) DO UPDATE
      SET
        outline = COALESCE(EXCLUDED.outline, article_content.outline),
        content = COALESCE(EXCLUDED.content, article_content.content)
    `, [id, updates.outline ? JSON.stringify(updates.outline) : null, updates.content ?? null])
  }

  // La matrice du maillage suit le texte : un lien retiré sort d'internal_links.
  if (updates.content !== undefined && updates.content !== null) {
    await pruneStaleLinks(id, updates.content)
  }

  // Du contenu enregistré fait entrer l'article en rédaction ; la phase ne
  // recule jamais (épopée qualité SEO, P2).
  if (updates.content && updates.content.trim()) {
    const current = await pool.query(`SELECT phase FROM articles WHERE id = $1`, [id])
    const phase = current.rows[0]?.phase as string | undefined
    const next = nextArticlePhase(phase, 'content-saved')
    if (next !== phase) await pool.query(`UPDATE articles SET phase = $1 WHERE id = $2`, [next, id])
  }

  // Save meta in articles table
  const artUpdates: string[] = []
  const artValues: unknown[] = []
  let idx = 1
  if (updates.metaTitle !== undefined) { artUpdates.push(`meta_title = $${idx++}`); artValues.push(updates.metaTitle) }
  if (updates.metaDescription !== undefined) { artUpdates.push(`meta_description = $${idx++}`); artValues.push(updates.metaDescription) }
  if (updates.seoScore !== undefined) { artUpdates.push(`seo_score = $${idx++}`); artValues.push(updates.seoScore) }
  if (updates.geoScore !== undefined) { artUpdates.push(`geo_score = $${idx++}`); artValues.push(updates.geoScore) }
  if (artUpdates.length > 0) {
    artValues.push(id)
    await pool.query(`UPDATE articles SET ${artUpdates.join(', ')} WHERE id = $${idx}`, artValues)
  }

  log.debug(`saveArticleContent: ${id} saved`, { fields: Object.keys(updates) })
  return getArticleContent(id)
}
