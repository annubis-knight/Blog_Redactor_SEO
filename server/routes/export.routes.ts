import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getArticleBySlug } from '../services/data.service.js'
import { getArticleContent } from '../services/article-content.service.js'
import { generateExportHtml, generateJsonLd } from '../services/export.service.js'

const router = Router()

/** POST /api/export/:slug — Generate Propulsite-compliant HTML export */
router.post('/export/:slug', async (req, res) => {
  try {
    const { slug } = req.params

    // Load article metadata
    const articleInfo = await getArticleBySlug(slug)
    if (!articleInfo) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article "${slug}" not found` } })
      return
    }

    // Load article content
    const content = await getArticleContent(slug)
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
      slug,
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

    res.json({ data: { html, slug } })
  } catch (err) {
    log.error(`POST /api/export/${req.params.slug} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate export' } })
  }
})

export default router
