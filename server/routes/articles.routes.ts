import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getArticleById, getArticleBySlug, updateArticleStatus, addArticlesToCocoon, removeArticleFromCocoon, updateArticleInCocoon, loadArticleMicroContext, saveArticleMicroContext, getArticleProgress, saveArticleProgress, addArticleCheck, removeArticleCheck, getArticleKeywords } from '../services/infra/data.service.js'
import { saveArticleContent, getArticleContent } from '../services/article/article-content.service.js'
import { updateArticleContentSchema, updateArticleStatusSchema, batchCreateArticlesSchema, patchArticleSchema } from '../../shared/schemas/article.schema.js'
import { updateMicroContextSchema } from '../../shared/schemas/article-micro-context.schema.js'
import { articleProgressSchema, addCheckSchema } from '../../shared/schemas/article-progress.schema.js'
import { flattenHnStructure } from '../../shared/utils/hn-structure.js'
import { CHECK_GATES, evaluateArticleGate, type GateEvaluation } from '../services/gates/gate.service.js'

/**
 * Refus d'une porte de qualité (FR-INFRA-VERIFIER-SHARED) : 422 avec l'évaluation
 * complète, que l'écran affiche dans l'alarme graduée.
 */
function respondGateBlocked(res: import('express').Response, evaluation: GateEvaluation, message: string): void {
  res.status(422).json({ error: { code: 'GATE_BLOCKED', message, details: evaluation } })
}

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

    // FR-RED-PUBLISH-GATE — on ne publie pas un article qu'un expert refuserait.
    if (parsed.data.status === 'publié') {
      const evaluation = await evaluateArticleGate(id, 'publish')
      if (!evaluation.passed) {
        respondGateBlocked(res, evaluation, `Publication refusée : ${evaluation.blocking.length} point(s) à traiter avant de publier.`)
        return
      }
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
    const articleType = result.article.type

    // 1. Récupère le sommaire HN persisté (depuis article_keywords.hn_structure)
    const { data: articleKeywords } = await getArticleKeywords(id)
    // Stocké au format du Moteur { level: number, text, children } : l'ancien filtre
    // attendait { level: 'H2', title } et ne transmettait jamais rien (épopée qualité SEO, M9).
    const hnStructure = flattenHnStructure(articleKeywords?.hnStructure)
      .map(h => ({ level: `H${h.level}` as 'H1' | 'H2' | 'H3', title: h.text }))

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
    // Écrire la progression en bloc ne doit pas contourner les portes : une
    // étape gardée qui n'était pas encore accordée passe par sa porte.
    const current = await getArticleProgress(id)
    const added = parsed.data.completedChecks.filter(c => !(current?.completedChecks ?? []).includes(c))
    for (const check of added) {
      const gateId = CHECK_GATES[check]
      if (!gateId) continue
      const evaluation = await evaluateArticleGate(id, gateId)
      if (!evaluation.passed) {
        respondGateBlocked(res, evaluation, `Étape « ${check} » non validée : ${evaluation.blocking.length} point(s) à traiter.`)
        return
      }
    }
    const progress = await saveArticleProgress(id, parsed.data)
    res.json({ data: progress })
  } catch (err) {
    const message = (err as Error).message
    log.error(`PUT /api/articles/${id}/progress — ${message}`)
    if (message.includes('introuvable')) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message } })
      return
    }
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
    // Une étape du Moteur gardée par une porte n'est accordée que si la porte passe
    // (FR-CAP-LOCK-GATE, FR-LIE-LOCK-GATE) : l'écran reçoit alors l'alarme graduée.
    const gateId = CHECK_GATES[parsed.data.check]
    if (gateId) {
      const evaluation = await evaluateArticleGate(id, gateId)
      if (!evaluation.passed) {
        respondGateBlocked(res, evaluation, `Étape non validée : ${evaluation.blocking.length} point(s) à traiter.`)
        return
      }
    }
    const progress = await addArticleCheck(id, parsed.data.check)
    res.json({ data: progress })
  } catch (err) {
    const message = (err as Error).message
    log.error(`POST /api/articles/${id}/progress/check — ${message}`)
    if (message.includes('introuvable')) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message } })
      return
    }
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
