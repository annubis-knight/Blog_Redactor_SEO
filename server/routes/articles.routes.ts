import { Router } from 'express'
import { getArticleBySlug } from '../services/data.service.js'
import { saveArticleContent, getArticleContent } from '../services/article-content.service.js'
import { updateArticleContentSchema } from '../../shared/schemas/article.schema.js'

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
    console.error('[GET /api/articles/:slug]', err)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load article' } })
  }
})

/** GET /api/articles/:slug/content — Get saved article content */
router.get('/articles/:slug/content', async (req, res) => {
  try {
    const content = await getArticleContent(req.params.slug)
    res.json({ data: content })
  } catch (err) {
    console.error('[GET /api/articles/:slug/content]', err)
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
    console.error('[PUT /api/articles/:slug]', err)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save article content' } })
  }
})

export default router
