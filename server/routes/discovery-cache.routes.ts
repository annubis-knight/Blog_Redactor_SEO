import { Router } from 'express'
import { log } from '../utils/logger.js'
import { checkCache, loadCache, saveCache, clearCache } from '../services/discovery-cache.service.js'
import { saveDiscoveryCacheSchema } from '../../shared/schemas/discovery-cache.schema.js'

const router = Router()

/** GET /api/discovery-cache/check?seed=xxx */
router.get('/discovery-cache/check', async (req, res) => {
  try {
    const seed = req.query.seed as string
    if (!seed?.trim()) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'seed query param is required' } })
      return
    }
    const status = await checkCache(seed.trim())
    res.json({ data: status })
  } catch (err) {
    log.error(`GET /api/discovery-cache/check — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to check discovery cache' } })
  }
})

/** GET /api/discovery-cache/load?seed=xxx */
router.get('/discovery-cache/load', async (req, res) => {
  try {
    const seed = req.query.seed as string
    if (!seed?.trim()) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'seed query param is required' } })
      return
    }
    const entry = await loadCache(seed.trim())
    res.json({ data: entry })
  } catch (err) {
    log.error(`GET /api/discovery-cache/load — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load discovery cache' } })
  }
})

/** POST /api/discovery-cache/save */
router.post('/discovery-cache/save', async (req, res) => {
  const parsed = saveDiscoveryCacheSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    const saved = await saveCache(parsed.data)
    res.json({ data: { cachedAt: saved.cachedAt, expiresAt: saved.expiresAt } })
  } catch (err) {
    log.error(`POST /api/discovery-cache/save — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save discovery cache' } })
  }
})

/** DELETE /api/discovery-cache?seed=xxx */
router.delete('/discovery-cache', async (req, res) => {
  try {
    const seed = req.query.seed as string
    if (!seed?.trim()) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'seed query param is required' } })
      return
    }
    await clearCache(seed.trim())
    res.json({ data: { cleared: true } })
  } catch (err) {
    log.error(`DELETE /api/discovery-cache — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to clear discovery cache' } })
  }
})

export default router
