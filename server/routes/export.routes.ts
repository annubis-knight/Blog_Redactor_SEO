import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getArticleById } from '../services/infra/data.service.js'
import { getArticleContent } from '../services/article/article-content.service.js'
import { generateExportHtml, generateJsonLd } from '../services/article/export.service.js'

const router = Router()

/** POST /api/export/:id — Generate Propulsite-compliant HTML export */
router.post('/export/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    // Load article metadata
    const articleInfo = await getArticleById(id)
    if (!articleInfo) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article ${id} not found` } })
      return
    }

    // Load article content
    const content = await getArticleContent(id)
    if (!content.content) {
      res.status(400).json({ error: { code: 'NO_CONTENT', message: 'Article has no content to export' } })
      return
    }

    if (!content.metaTitle || !content.metaDescription) {
      res.status(400).json({ error: { code: 'MISSING_META', message: 'Article needs meta title and description before export' } })
      return
    }

    // Generate JSON-LD
    const jsonLd = generateJsonLd({
      title: articleInfo.article.title,
      metaDescription: content.metaDescription,
      cocoonName: articleInfo.cocoonName,
      slug: articleInfo.article.slug,
      content: content.content,
    })

    // Generate export HTML
    const html = await generateExportHtml({
      title: articleInfo.article.title,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      cocoonName: articleInfo.cocoonName,
      content: content.content,
      jsonLd,
    })

    res.json({ data: { html, id } })
  } catch (err) {
    log.error(`POST /api/export/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate export' } })
  }
})

/** GET /api/preview/:id — Generate preview HTML (no status change) */
router.get('/preview/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const articleInfo = await getArticleById(id)
    if (!articleInfo) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article ${id} not found` } })
      return
    }

    const content = await getArticleContent(id)
    if (!content.content) {
      res.status(400).json({ error: { code: 'NO_CONTENT', message: 'Article has no content to preview' } })
      return
    }

    if (!content.metaTitle || !content.metaDescription) {
      res.status(400).json({ error: { code: 'MISSING_META', message: 'Article needs meta title and description before preview' } })
      return
    }

    const jsonLd = generateJsonLd({
      title: articleInfo.article.title,
      metaDescription: content.metaDescription,
      cocoonName: articleInfo.cocoonName,
      slug: articleInfo.article.slug,
      content: content.content,
    })

    const html = await generateExportHtml({
      title: articleInfo.article.title,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      cocoonName: articleInfo.cocoonName,
      content: content.content,
      jsonLd,
      embedCss: true,
    })

    res.json({ data: { html, id, title: articleInfo.article.title } })
  } catch (err) {
    log.error(`GET /api/preview/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate preview' } })
  }
})

export default router
