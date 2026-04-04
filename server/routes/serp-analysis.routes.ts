import { Router } from 'express'
import { log } from '../utils/logger.js'
import { analyzeSerpCompetitors, CACHE_DIR as SERP_CACHE_DIR } from '../services/serp-analysis.service.js'
import { extractTfidf } from '../services/tfidf.service.js'
import { readCached, slugify } from '../utils/cache.js'
import { serpAnalyzeBodySchema } from '../../shared/schemas/serp-analysis.schema.js'
import type { SerpAnalysisResult } from '../../shared/types/serp-analysis.types.js'
const router = Router()

/** POST /api/serp/analyze — SERP competitor analysis with smart cursor */
router.post('/serp/analyze', async (req, res) => {
  try {
    const parsed = serpAnalyzeBodySchema.safeParse(req.body)
    if (!parsed.success) {
      const message = parsed.error.issues.map(e => e.message).join(', ')
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } })
      return
    }

    const { keyword, articleLevel } = parsed.data

    log.info(`POST /api/serp/analyze — keyword="${keyword}" level="${articleLevel}"`)

    const result = await analyzeSerpCompetitors(keyword, articleLevel)

    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/serp/analyze — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'SERP analysis failed' } })
  }
})

/** POST /api/serp/tfidf — TF-IDF extraction from cached SERP data */
router.post('/serp/tfidf', async (req, res) => {
  try {
    const { keyword } = req.body

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword is required' } })
      return
    }

    const cached = await readCached<SerpAnalysisResult>(SERP_CACHE_DIR, slugify(keyword.trim()))
    if (!cached) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: "Lancez d'abord l'analyse SERP dans l'onglet Lieutenants" } })
      return
    }

    const result = extractTfidf(cached.data.competitors, keyword.trim())
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/serp/tfidf — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'TF-IDF extraction failed' } })
  }
})

export default router
