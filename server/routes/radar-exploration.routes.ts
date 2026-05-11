import { Router } from 'express'
import { log } from '../utils/logger.js'
import {
  getRadarExploration,
  getRadarExplorationStatus,
  saveRadarExploration,
  deleteRadarExploration,
  addKeywordToRadarExploration,
  removeKeywordFromRadarExploration,
  addKeywordsBatchToRadarExploration,
} from '../services/infra/radar-exploration.service.js'

const router = Router()

function parseArticleId(raw: unknown): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** GET /api/articles/:id/radar-exploration — full payload */
router.get('/articles/:id/radar-exploration', async (req, res) => {
  try {
    const articleId = parseArticleId(req.params.id)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'article id must be a positive integer' } })
      return
    }
    const entry = await getRadarExploration(articleId)
    res.json({ data: entry })
  } catch (err) {
    log.error(`GET /articles/:id/radar-exploration — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load radar exploration' } })
  }
})

/** GET /api/articles/:id/radar-exploration/status — lightweight header */
router.get('/articles/:id/radar-exploration/status', async (req, res) => {
  try {
    const articleId = parseArticleId(req.params.id)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'article id must be a positive integer' } })
      return
    }
    const status = await getRadarExplorationStatus(articleId)
    res.json({ data: status })
  } catch (err) {
    log.error(`GET /articles/:id/radar-exploration/status — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to check radar exploration' } })
  }
})

/** POST /api/articles/:id/radar-exploration — upsert */
router.post('/articles/:id/radar-exploration', async (req, res) => {
  try {
    const articleId = parseArticleId(req.params.id)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'article id must be a positive integer' } })
      return
    }
    const { seed, context, generatedKeywords, scanResult } = req.body ?? {}
    if (!seed || !context || !Array.isArray(generatedKeywords) || !scanResult) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: seed, context, generatedKeywords, scanResult',
        },
      })
      return
    }
    const saved = await saveRadarExploration(articleId, { seed, context, generatedKeywords, scanResult })
    res.json({ data: saved })
  } catch (err) {
    log.error(`POST /articles/:id/radar-exploration — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save radar exploration' } })
  }
})

/** DELETE /api/articles/:id/radar-exploration */
router.delete('/articles/:id/radar-exploration', async (req, res) => {
  try {
    const articleId = parseArticleId(req.params.id)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'article id must be a positive integer' } })
      return
    }
    await deleteRadarExploration(articleId)
    res.json({ data: { cleared: true } })
  } catch (err) {
    log.error(`DELETE /articles/:id/radar-exploration — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to clear radar exploration' } })
  }
})

/** POST /api/articles/:id/radar-exploration/keyword — add a single keyword (idempotent) */
router.post('/articles/:id/radar-exploration/keyword', async (req, res) => {
  try {
    const articleId = parseArticleId(req.params.id)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'article id must be a positive integer' } })
      return
    }
    const { keyword, reasoning } = req.body ?? {}
    if (typeof keyword !== 'string' || !keyword.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword (non-empty string) is required' } })
      return
    }
    const result = await addKeywordToRadarExploration(articleId, keyword, typeof reasoning === 'string' ? reasoning : undefined)
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /articles/:id/radar-exploration/keyword — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add keyword' } })
  }
})

/** DELETE /api/articles/:id/radar-exploration/keyword?keyword=… — remove a single keyword */
router.delete('/articles/:id/radar-exploration/keyword', async (req, res) => {
  try {
    const articleId = parseArticleId(req.params.id)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'article id must be a positive integer' } })
      return
    }
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : ''
    if (!keyword.trim()) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword query param is required' } })
      return
    }
    const entry = await removeKeywordFromRadarExploration(articleId, keyword)
    res.json({ data: { entry } })
  } catch (err) {
    log.error(`DELETE /articles/:id/radar-exploration/keyword — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove keyword' } })
  }
})

/** POST /api/articles/:id/radar-exploration/keywords — batch add (idempotent) */
router.post('/articles/:id/radar-exploration/keywords', async (req, res) => {
  try {
    const articleId = parseArticleId(req.params.id)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'article id must be a positive integer' } })
      return
    }
    const { keywords } = req.body ?? {}
    if (!Array.isArray(keywords)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keywords (array) is required' } })
      return
    }
    const normalized: Array<{ keyword: string; reasoning?: string }> = []
    for (const item of keywords) {
      if (item && typeof item.keyword === 'string' && item.keyword.trim()) {
        normalized.push({
          keyword: item.keyword,
          reasoning: typeof item.reasoning === 'string' ? item.reasoning : undefined,
        })
      }
    }
    const result = await addKeywordsBatchToRadarExploration(articleId, normalized)
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /articles/:id/radar-exploration/keywords — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add keywords batch' } })
  }
})

export default router
