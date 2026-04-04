import { Router } from 'express'
import { log } from '../utils/logger.js'
import { checkRadarCache, loadRadarCache, saveRadarCache, clearRadarCache } from '../services/radar-cache.service.js'

const router = Router()

/** GET /api/radar-cache/check?seed=xxx */
router.get('/radar-cache/check', async (req, res) => {
  try {
    const seed = req.query.seed as string
    if (!seed?.trim()) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'seed query param is required' } })
      return
    }
    const status = await checkRadarCache(seed.trim())
    res.json({ data: status })
  } catch (err) {
    log.error(`GET /api/radar-cache/check — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to check radar cache' } })
  }
})

/** GET /api/radar-cache/load?seed=xxx */
router.get('/radar-cache/load', async (req, res) => {
  try {
    const seed = req.query.seed as string
    if (!seed?.trim()) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'seed query param is required' } })
      return
    }
    const entry = await loadRadarCache(seed.trim())
    res.json({ data: entry })
  } catch (err) {
    log.error(`GET /api/radar-cache/load — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load radar cache' } })
  }
})

/** POST /api/radar-cache/save */
router.post('/radar-cache/save', async (req, res) => {
  try {
    const { seed, context, generatedKeywords, scanResult } = req.body
    if (!seed || !context || !generatedKeywords || !scanResult) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields: seed, context, generatedKeywords, scanResult' } })
      return
    }
    const saved = await saveRadarCache({ seed, context, generatedKeywords, scanResult })
    res.json({ data: { cachedAt: saved.cachedAt, expiresAt: saved.expiresAt } })
  } catch (err) {
    log.error(`POST /api/radar-cache/save — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save radar cache' } })
  }
})

/** DELETE /api/radar-cache?seed=xxx */
router.delete('/radar-cache', async (req, res) => {
  try {
    const seed = req.query.seed as string
    if (!seed?.trim()) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'seed query param is required' } })
      return
    }
    await clearRadarCache(seed.trim())
    res.json({ data: { cleared: true } })
  } catch (err) {
    log.error(`DELETE /api/radar-cache — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to clear radar cache' } })
  }
})

export default router
