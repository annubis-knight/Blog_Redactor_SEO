/**
 * Sprint 15.9-bis — Endpoints CRUD de lecture reconstruite.
 */
import { Router } from 'express'
import { log } from '../utils/logger.js'
import {
  getArticlesUsingKeyword,
  getKeywordMetricsWithFreshness,
  getCocoonKeywordMetrics,
  getKeywordIntentForArticle,
  getKeywordLocalAnalysisForArticle,
  getKeywordContentGapForArticle,
} from '../services/queries/keyword-queries.service.js'

const router = Router()

function parseId(raw: unknown): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** GET /keywords/:keyword/usage — which articles have used this keyword? */
router.get('/keywords/:keyword/usage', async (req, res) => {
  try {
    const keyword = decodeURIComponent(req.params.keyword)
    const roleFilter = req.query.role as string | undefined
    const validRoles = ['capitaine', 'lieutenant', 'root', 'any']
    const role = validRoles.includes(roleFilter ?? 'any') ? (roleFilter as 'capitaine' | 'lieutenant' | 'root' | 'any') : 'any'
    const data = await getArticlesUsingKeyword(keyword, role)
    res.json({ data })
  } catch (err) {
    log.error(`GET /keywords/:keyword/usage — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch keyword usage' } })
  }
})

/** GET /keywords/:keyword/metrics — full keyword_metrics row with freshness info */
router.get('/keywords/:keyword/metrics', async (req, res) => {
  try {
    const keyword = decodeURIComponent(req.params.keyword)
    const data = await getKeywordMetricsWithFreshness(keyword)
    res.json({ data })
  } catch (err) {
    log.error(`GET /keywords/:keyword/metrics — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch keyword metrics' } })
  }
})

/** GET /keywords/:keyword/intent-for-article/:articleId — contextualised intent */
router.get('/keywords/:keyword/intent-for-article/:articleId', async (req, res) => {
  try {
    const articleId = parseId(req.params.articleId)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a positive integer' } })
      return
    }
    const keyword = decodeURIComponent(req.params.keyword)
    const data = await getKeywordIntentForArticle(articleId, keyword)
    res.json({ data })
  } catch (err) {
    log.error(`GET /keywords/:keyword/intent-for-article — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch keyword intent' } })
  }
})

/** GET /keywords/:keyword/local-for-article/:articleId */
router.get('/keywords/:keyword/local-for-article/:articleId', async (req, res) => {
  try {
    const articleId = parseId(req.params.articleId)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a positive integer' } })
      return
    }
    const keyword = decodeURIComponent(req.params.keyword)
    const data = await getKeywordLocalAnalysisForArticle(articleId, keyword)
    res.json({ data })
  } catch (err) {
    log.error(`GET /keywords/:keyword/local-for-article — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch keyword local analysis' } })
  }
})

/** GET /keywords/:keyword/content-gap-for-article/:articleId */
router.get('/keywords/:keyword/content-gap-for-article/:articleId', async (req, res) => {
  try {
    const articleId = parseId(req.params.articleId)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a positive integer' } })
      return
    }
    const keyword = decodeURIComponent(req.params.keyword)
    const data = await getKeywordContentGapForArticle(articleId, keyword)
    res.json({ data })
  } catch (err) {
    log.error(`GET /keywords/:keyword/content-gap-for-article — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch keyword content gap' } })
  }
})

/** GET /cocoons/:id/keyword-metrics — cocoon-level aggregation */
router.get('/cocoons/:id/keyword-metrics', async (req, res) => {
  try {
    const cocoonId = parseId(req.params.id)
    if (!cocoonId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Cocoon ID must be a positive integer' } })
      return
    }
    const data = await getCocoonKeywordMetrics(cocoonId)
    res.json({ data })
  } catch (err) {
    log.error(`GET /cocoons/:id/keyword-metrics — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch cocoon keyword metrics' } })
  }
})

export default router
