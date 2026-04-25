import { Router } from 'express'
import { briefRequestSchema } from '../../shared/schemas/dataforseo.schema.js'
import { getBrief, isSandbox } from '../services/external/dataforseo.service.js'
import { costGuard } from '../services/external/dataforseo-cost-guard.js'

const router = Router()

/** POST /api/dataforseo/brief — Get SEO brief data for a keyword */
router.post('/brief', async (req, res, next) => {
  try {
    const parsed = briefRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
      })
      return
    }

    const { keyword, forceRefresh } = parsed.data
    const result = await getBrief(keyword, forceRefresh)
    res.json({ data: result })
  } catch (err) {
    // Delegate to the global error handler so CostBudgetError / DataForSeoQuotaError
    // get their proper 429 instead of being masked as 502.
    next(err)
  }
})

/** GET /api/dataforseo/cost-status — current sliding-window spend */
router.get('/cost-status', (_req, res) => {
  res.json({ data: { ...costGuard.getStatus(), sandbox: isSandbox() } })
})

export default router
