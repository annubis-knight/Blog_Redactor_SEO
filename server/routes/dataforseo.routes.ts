import { Router } from 'express'
import { briefRequestSchema } from '../../shared/schemas/dataforseo.schema.js'
import { getBrief } from '../services/dataforseo.service.js'

const router = Router()

/** POST /api/dataforseo/brief — Get SEO brief data for a keyword */
router.post('/brief', async (req, res) => {
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
    console.error('[POST /api/dataforseo/brief]', err)
    res.status(502).json({
      error: {
        code: 'DATAFORSEO_ERROR',
        message: err instanceof Error ? err.message : 'Erreur DataForSEO',
      },
    })
  }
})

export default router
