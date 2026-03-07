import { Router } from 'express'
import { getCocoons, getArticlesByCocoon } from '../services/data.service.js'

const router = Router()

/** GET /api/cocoons — List all cocoons with stats */
router.get('/cocoons', async (_req, res) => {
  try {
    const cocoons = await getCocoons()
    res.json({ data: cocoons })
  } catch (err) {
    console.error('[GET /api/cocoons]', err)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load cocoons' } })
  }
})

/** GET /api/cocoons/:id/articles — Articles for a specific cocoon */
router.get('/cocoons/:id/articles', async (req, res) => {
  try {
    const cocoonIndex = parseInt(req.params.id, 10)
    if (isNaN(cocoonIndex)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Cocoon ID must be a number' } })
      return
    }

    const articles = await getArticlesByCocoon(cocoonIndex)
    if (!articles) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Cocoon ${cocoonIndex} not found` } })
      return
    }

    res.json({ data: articles })
  } catch (err) {
    console.error('[GET /api/cocoons/:id/articles]', err)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load articles' } })
  }
})

export default router
