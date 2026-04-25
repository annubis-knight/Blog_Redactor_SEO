import { Router } from 'express'
import { log } from '../utils/logger.js'
import {
  getRadarExploration,
  getRadarExplorationStatus,
  saveRadarExploration,
  deleteRadarExploration,
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

export default router
