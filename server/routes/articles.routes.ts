import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getArticleById, getArticleBySlug, updateArticleStatus, addArticlesToCocoon, removeArticleFromCocoon, updateArticleInCocoon, loadArticleMicroContext, saveArticleMicroContext, getArticleProgress, saveArticleProgress, addArticleCheck, removeArticleCheck, getArticleKeywords } from '../services/infra/data.service.js'
import { saveArticleContent, getArticleContent } from '../services/article/article-content.service.js'
import { updateArticleContentSchema, updateArticleStatusSchema, batchCreateArticlesSchema, patchArticleSchema } from '../../shared/schemas/article.schema.js'
import { updateMicroContextSchema } from '../../shared/schemas/article-micro-context.schema.js'
import { articleProgressSchema, addCheckSchema } from '../../shared/schemas/article-progress.schema.js'

const router = Router()

/** GET /api/articles/by-slug/:slug — Lookup article id from slug */
router.get('/articles/by-slug/:slug', async (req, res) => {
  try {
    const result = await getArticleBySlug(req.params.slug)
    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article "${req.params.slug}" not found` } })
      return
    }
    res.json({ data: { id: result.article.id, slug: result.article.slug, title: result.article.title } })
  } catch (err) {
    log.error(`GET /api/articles/by-slug/${req.params.slug} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load article' } })
  }
})

/** GET /api/articles/:id — Get article details by id */
router.get('/articles/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const result = await getArticleById(id)
    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article ${id} not found` } })
      return
    }
    res.json({ data: result })
  } catch (err) {
    log.error(`GET /api/articles/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load article' } })
  }
})

/** GET /api/articles/:id/content — Get saved article content */
router.get('/articles/:id/content', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const content = await getArticleContent(id)
    res.json({ data: content })
  } catch (err) {
    log.error(`GET /api/articles/${id}/content — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load article content' } })
  }
})

/** PUT /api/articles/:id — Save article content (outline, content, metadata) */
router.put('/articles/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  const parsed = updateArticleContentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  try {
    const saved = await saveArticleContent(id, parsed.data)
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/articles/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save article content' } })
  }
})

/** PUT /api/articles/:id/status — Update article status */
router.put('/articles/:id/status', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  const parsed = updateArticleStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  try {
    const result = await getArticleById(id)
    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article ${id} not found` } })
      return
    }

    await updateArticleStatus(id, parsed.data.status)
    res.json({ data: { id, status: parsed.data.status } })
  } catch (err) {
    log.error(`PUT /api/articles/${id}/status — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update article status' } })
  }
})

/** PATCH /api/articles/:id — Update article metadata (title, slug) */
router.patch('/articles/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  const parsed = patchArticleSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  try {
    const updated = await updateArticleInCocoon(id, parsed.data)
    if (!updated) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article ${id} not found` } })
      return
    }
    res.json({ data: { id, updated: true } })
  } catch (err) {
    log.error(`PATCH /api/articles/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update article' } })
  }
})

/** DELETE /api/articles/:id — Remove an article from its cocoon */
router.delete('/articles/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const removed = await removeArticleFromCocoon(id)
    if (!removed) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article ${id} not found` } })
      return
    }
    res.json({ data: { id, removed: true } })
  } catch (err) {
    log.error(`DELETE /api/articles/${id} — ${(err as Error).message}`)
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

/** GET /api/articles/:id/micro-context — Get micro-context for an article */
router.get('/articles/:id/micro-context', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const result = await loadArticleMicroContext(id)
    res.json({ data: result })
  } catch (err) {
    log.error(`GET /api/articles/${id}/micro-context — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load micro-context' } })
  }
})

/** PUT /api/articles/:id/micro-context — Save micro-context for an article */
router.put('/articles/:id/micro-context', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  const parsed = updateMicroContextSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  try {
    const result = await getArticleById(id)
    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article ${id} not found` } })
      return
    }
    const saved = await saveArticleMicroContext(id, {
      slug: result.article.slug,
      angle: parsed.data.angle,
      tone: parsed.data.tone,
      directives: parsed.data.directives,
      targetWordCount: parsed.data.targetWordCount,
      updatedAt: new Date().toISOString(),
    })
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/articles/${id}/micro-context — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save micro-context' } })
  }
})

// --- Recommend target word count (SERP avg + base type + HN → IA conseil) ---

router.post('/articles/:id/recommend-word-count', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const result = await getArticleById(id)
    if (!result) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article ${id} not found` } })
      return
    }
    const articleType = result.article.type as 'Pilier' | 'Intermédiaire' | 'Spécialisé'

    // 1. Récupère le sommaire HN persisté (depuis article_keywords.hn_structure)
    const { data: articleKeywords } = await getArticleKeywords(id)
    const hnRaw = articleKeywords?.hnStructure ?? []
    // Le sommaire est stocké en JSON libre — on essaie d'extraire { level, title }
    const hnStructure = Array.isArray(hnRaw)
      ? (hnRaw as unknown[])
          .filter((h): h is { level: string; title: string } =>
            typeof h === 'object' && h !== null && 'level' in h && 'title' in h
          )
          .filter(h => ['H1', 'H2', 'H3'].includes(h.level))
          .map(h => ({ level: h.level as 'H1' | 'H2' | 'H3', title: h.title }))
      : []

    // 2. Récupère la moyenne SERP des concurrents — depuis content_gap_analysis si dispo
    let competitorsAvgWordCount: number | null = null
    const capitaineKw = articleKeywords?.capitaine
    if (capitaineKw) {
      const { getKeywordMetrics } = await import('../services/keyword/keyword-metrics.service.js')
      const metrics = await getKeywordMetrics(capitaineKw)
      const cga = metrics?.contentGapAnalysis as { averageWordCount?: number } | null | undefined
      if (cga && typeof cga.averageWordCount === 'number' && cga.averageWordCount > 0) {
        competitorsAvgWordCount = cga.averageWordCount
      }
    }

    // 3. Calcul + IA
    const { recommendTargetWordCount } = await import('../services/article/target-word-count.service.js')
    const recommendation = await recommendTargetWordCount({
      articleType,
      competitorsAvgWordCount,
      hnStructure,
      articleTitle: result.article.title,
      capitaineKeyword: capitaineKw ?? undefined,
    })

    res.json({ data: recommendation })
  } catch (err) {
    log.error(`POST /api/articles/${id}/recommend-word-count — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to compute recommended word count' } })
  }
})

// --- Article Progress (migrated from article-progress.routes.ts) ---

router.get('/articles/:id/progress', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const progress = await getArticleProgress(id)
    res.json({ data: progress })
  } catch (err) {
    log.error(`GET /api/articles/${id}/progress — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get progress' } })
  }
})

router.put('/articles/:id/progress', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  const parsed = articleProgressSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    const progress = await saveArticleProgress(id, parsed.data)
    res.json({ data: progress })
  } catch (err) {
    log.error(`PUT /api/articles/${id}/progress — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save progress' } })
  }
})

router.post('/articles/:id/progress/check', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  const parsed = addCheckSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    const progress = await addArticleCheck(id, parsed.data.check)
    res.json({ data: progress })
  } catch (err) {
    log.error(`POST /api/articles/${id}/progress/check — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add check' } })
  }
})

router.post('/articles/:id/progress/uncheck', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  const parsed = addCheckSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    const progress = await removeArticleCheck(id, parsed.data.check)
    res.json({ data: progress })
  } catch (err) {
    log.error(`POST /api/articles/${id}/progress/uncheck — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove check' } })
  }
})

export default router
