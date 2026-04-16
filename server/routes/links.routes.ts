import { Router } from 'express'
import { log } from '../utils/logger.js'
import {
  getMatrix,
  upsertLinks,
  suggestLinks,
  detectOrphans,
  checkAnchorDiversity,
  findCrossCocoonOpportunities,
} from '../services/linking.service.js'
import { suggestLinksRequestSchema, saveLinksRequestSchema } from '../../shared/schemas/linking.schema.js'

const router = Router()

/** GET /api/links/matrix — Full linking matrix with orphans and anchor alerts */
router.get('/links/matrix', async (_req, res) => {
  try {
    const matrix = await getMatrix()
    const orphans = await detectOrphans()
    const anchorAlerts = checkAnchorDiversity(matrix)
    const crossCocoonOpportunities = await findCrossCocoonOpportunities()

    res.json({
      data: {
        matrix,
        orphans,
        anchorAlerts,
        crossCocoonOpportunities,
      },
    })
  } catch (err) {
    log.error(`GET /api/links/matrix — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load linking matrix' } })
  }
})

/** POST /api/links/suggest — Suggest links for an article */
router.post('/links/suggest', async (req, res) => {
  const parsed = suggestLinksRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  try {
    const suggestions = await suggestLinks(parsed.data.articleId, parsed.data.content)
    res.json({ data: suggestions })
  } catch (err) {
    log.error(`POST /api/links/suggest — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate link suggestions' } })
  }
})

/** PUT /api/links — Save or update links */
router.put('/links', async (req, res) => {
  const parsed = saveLinksRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  try {
    const matrix = await upsertLinks(parsed.data.links)
    res.json({ data: matrix })
  } catch (err) {
    log.error(`PUT /api/links — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save links' } })
  }
})

export default router
