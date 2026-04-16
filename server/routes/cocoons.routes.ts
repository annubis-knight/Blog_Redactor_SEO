import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getCocoons, getArticlesByCocoon, getArticleKeywordsByCocoon } from '../services/data.service.js'
import { getCocoonStrategy } from '../services/cocoon-strategy.service.js'

const router = Router()

/** GET /api/cocoons — List all cocoons with stats */
router.get('/cocoons', async (_req, res) => {
  try {
    const cocoons = await getCocoons()
    res.json({ data: cocoons })
  } catch (err) {
    log.error(`GET /api/cocoons — ${(err as Error).message}`)
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
    log.error(`GET /api/cocoons/${req.params.id}/articles — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load articles' } })
  }
})

/** GET /api/cocoons/:id/strategy/context — Strategic context for Moteur */
router.get('/cocoons/:id/strategy/context', async (req, res) => {
  try {
    const cocoonId = Number(req.params.id)
    if (isNaN(cocoonId)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Cocoon ID must be a number' } })
      return
    }

    const cocoons = await getCocoons()
    const cocoon = cocoons.find(c => c.id === cocoonId)
    if (!cocoon) {
      res.json({ data: null })
      return
    }

    const slug = cocoon.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const strategy = await getCocoonStrategy(slug)
    if (!strategy) {
      res.json({ data: null })
      return
    }

    res.json({
      data: {
        cocoonName: cocoon.name,
        siloName: cocoon.siloName,
        cible: strategy.cible?.validated || null,
        douleur: strategy.douleur?.validated || null,
        angle: strategy.angle?.validated || null,
        promesse: strategy.promesse?.validated || null,
        cta: strategy.cta?.validated || null,
      },
    })
  } catch (err) {
    log.error(`GET /api/cocoons/${req.params.id}/strategy/context — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load strategy context' } })
  }
})

/** GET /api/cocoons/:cocoonName/capitaines — Capitaine keywords per article in a cocoon */
router.get('/cocoons/:cocoonName/capitaines', async (req, res) => {
  try {
    const cocoonName = decodeURIComponent(req.params.cocoonName)
    const articleKeywords = await getArticleKeywordsByCocoon(cocoonName)

    const capitainesMap: Record<number, string> = {}
    for (const ak of articleKeywords) {
      if (ak.capitaine) {
        capitainesMap[ak.articleId] = ak.capitaine
      }
    }

    res.json({ data: capitainesMap })
  } catch (err) {
    log.error(`GET /api/cocoons/:cocoonName/capitaines — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load capitaines' } })
  }
})

export default router
