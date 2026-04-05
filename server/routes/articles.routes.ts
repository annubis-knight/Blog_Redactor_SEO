import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getArticleBySlug, updateArticleStatus, addArticlesToCocoon, removeArticleFromCocoon, updateArticleInCocoon } from '../services/data.service.js'
import { saveArticleContent, getArticleContent } from '../services/article-content.service.js'
import { updateArticleContentSchema, updateArticleStatusSchema, batchCreateArticlesSchema, patchArticleSchema } from '../../shared/schemas/article.schema.js'

const router = Router()

/** GET /api/articles/:slug — Get article details by slug */
router.get('/articles/:slug', async (req, res) => {
  try {
    const result = await getArticleBySlug(req.params.slug)
    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article "${req.params.slug}" not found` } })
      return
    }
    res.json({ data: result })
  } catch (err) {
    log.error(`GET /api/articles/${req.params.slug} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load article' } })
  }
})

/** GET /api/articles/:slug/content — Get saved article content */
router.get('/articles/:slug/content', async (req, res) => {
  try {
    const content = await getArticleContent(req.params.slug)
    res.json({ data: content })
  } catch (err) {
    log.error(`GET /api/articles/${req.params.slug}/content — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load article content' } })
  }
})

/** PUT /api/articles/:slug — Save article content (outline, content, metadata) */
router.put('/articles/:slug', async (req, res) => {
  const parsed = updateArticleContentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  try {
    const saved = await saveArticleContent(req.params.slug, parsed.data)
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/articles/${req.params.slug} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save article content' } })
  }
})

/** PUT /api/articles/:slug/status — Update article status */
router.put('/articles/:slug/status', async (req, res) => {
  const parsed = updateArticleStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  try {
    const result = await getArticleBySlug(req.params.slug)
    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article "${req.params.slug}" not found` } })
      return
    }

    await updateArticleStatus(req.params.slug, parsed.data.status)
    res.json({ data: { slug: req.params.slug, status: parsed.data.status } })
  } catch (err) {
    log.error(`PUT /api/articles/${req.params.slug}/status — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update article status' } })
  }
})

/** PATCH /api/articles/:slug — Update article metadata (title) */
router.patch('/articles/:slug', async (req, res) => {
  const parsed = patchArticleSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  try {
    const updated = await updateArticleInCocoon(req.params.slug, parsed.data)
    if (!updated) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article "${req.params.slug}" not found` } })
      return
    }
    res.json({ data: { slug: req.params.slug, updated: true } })
  } catch (err) {
    log.error(`PATCH /api/articles/${req.params.slug} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update article' } })
  }
})

/** DELETE /api/articles/:slug — Remove an article from its cocoon */
router.delete('/articles/:slug', async (req, res) => {
  try {
    const removed = await removeArticleFromCocoon(req.params.slug)
    if (!removed) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article "${req.params.slug}" not found` } })
      return
    }
    res.json({ data: { slug: req.params.slug, removed: true } })
  } catch (err) {
    log.error(`DELETE /api/articles/${req.params.slug} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete article' } })
  }
})

/** POST /api/articles/batch-create — Create multiple articles in a cocoon */
router.post('/articles/batch-create', async (req, res) => {
  const parsed = batchCreateArticlesSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  try {
    const created = await addArticlesToCocoon(parsed.data.cocoonName, parsed.data.articles)
    res.json({ data: created })
  } catch (err) {
    log.error(`POST /api/articles/batch-create — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create articles' } })
  }
})

export default router
