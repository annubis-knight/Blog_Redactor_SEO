import { Router } from 'express'
import { getKeywordsByCocoon } from '../services/data.service.js'

const router = Router()

/** GET /api/keywords/:cocoon — Keywords for a specific cocoon */
router.get('/keywords/:cocoon', async (req, res) => {
  try {
    const cocoonName = decodeURIComponent(req.params.cocoon)
    const keywords = await getKeywordsByCocoon(cocoonName)

    if (!keywords) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `No keywords found for cocoon "${cocoonName}"` } })
      return
    }

    res.json({ data: keywords })
  } catch (err) {
    console.error('[GET /api/keywords/:cocoon]', err)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load keywords' } })
  }
})

export default router
