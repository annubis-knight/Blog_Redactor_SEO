import { Router } from 'express'
import { log } from '../utils/logger.js'
import { analyzeMaps } from '../services/strategy/local-seo.service.js'
import { scoreLocalAnchoring, getEntities } from '../services/infra/local-entities.service.js'

// Sprint 15.5 — /local/maps is now cross-article (DB-first on keyword_metrics.local_analysis).

const router = Router()

/** POST /api/local/maps — Analyze Google Maps SERP for a keyword */
router.post('/local/maps', async (req, res) => {
  const { keyword, locationCode } = req.body ?? {}
  if (!keyword || typeof keyword !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword is required' } })
    return
  }
  try {
    const result = await analyzeMaps(keyword, locationCode)
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/local/maps — ${(err as Error).message}`)
    const message = err instanceof Error ? err.message : 'Erreur analyse Maps'
    res.status(500).json({ error: { code: 'MAPS_ANALYSIS_ERROR', message } })
  }
})

/** POST /api/local/score — Calculate local anchoring score */
router.post('/local/score', async (req, res) => {
  const { content } = req.body ?? {}
  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'content is required' } })
    return
  }
  try {
    const result = await scoreLocalAnchoring(content)
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/local/score — ${(err as Error).message}`)
    const message = err instanceof Error ? err.message : 'Erreur scoring local'
    res.status(500).json({ error: { code: 'LOCAL_SCORE_ERROR', message } })
  }
})

/** GET /api/local/entities — Get the full local entities database */
router.get('/local/entities', async (_req, res) => {
  try {
    const entities = await getEntities()
    res.json({ data: entities })
  } catch (err) {
    log.error(`GET /api/local/entities — ${(err as Error).message}`)
    const message = err instanceof Error ? err.message : 'Erreur chargement entités'
    res.status(500).json({ error: { code: 'ENTITIES_ERROR', message } })
  }
})

export default router
