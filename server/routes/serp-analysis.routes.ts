import { Router } from 'express'
import { log } from '../utils/logger.js'
import { analyzeSerpCompetitors } from '../services/external/serp-analysis.service.js'
import { extractTfidf } from '../services/keyword/tfidf.service.js'
import { serpAnalyzeBodySchema } from '../../shared/schemas/serp-analysis.schema.js'
import type { SerpAnalysisResult } from '../../shared/types/serp-analysis.types.js'
import { respondWithError } from '../utils/api-error.js'
import {
  getKeywordMetrics,
  upsertKeywordSerp,
  isKeywordMetricsFresh,
} from '../services/keyword/keyword-metrics.service.js'

// Sprint 15.5-bis — SERP scraping is cross-article (DB-first on
// keyword_metrics.serp_raw_json). articleId params dropped.

const router = Router()

/** POST /api/serp/analyze — SERP competitor analysis (cross-article DB-first) */
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

    const existing = await getKeywordMetrics(keyword)
    if (existing?.serpRawJson && isKeywordMetricsFresh(existing.fetchedAt)) {
      log.info(`SERP DB hit for keyword="${keyword}"`)
      res.json({ data: { ...(existing.serpRawJson as SerpAnalysisResult), fromCache: true } })
      return
    }

    const result = await analyzeSerpCompetitors(keyword, articleLevel)

    try { await upsertKeywordSerp(keyword, result) }
    catch (err) { log.warn(`serp: DB persist failed — ${(err as Error).message}`) }

    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/serp/analyze — ${(err as Error).message}`)
    respondWithError(res, err, { message: 'SERP analysis failed' })
  }
})

/** POST /api/serp/tfidf — TF-IDF extraction (uses keyword_metrics.serp_raw_json) */
router.post('/serp/tfidf', async (req, res) => {
  try {
    const { keyword, articleId } = req.body

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword is required' } })
      return
    }

    const trimmed = keyword.trim()
    const articleIdNum = Number(articleId)
    const hasArticleId = Number.isInteger(articleIdNum) && articleIdNum > 0

    const metrics = await getKeywordMetrics(trimmed)
    const serpData = metrics?.serpRawJson as SerpAnalysisResult | null
    if (!serpData?.competitors) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: "Lancez d'abord l'analyse SERP dans l'onglet Lieutenants" } })
      return
    }

    const result = extractTfidf(serpData.competitors, trimmed)

    if (hasArticleId) {
      try {
        const { saveLexiqueTfidf } = await import('../services/keyword/lexique-exploration.service.js')
        await saveLexiqueTfidf(articleIdNum, trimmed, result)
      } catch (err) {
        log.warn(`tfidf: DB persist failed — ${(err as Error).message}`)
      }
    }

    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/serp/tfidf — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'TF-IDF extraction failed' } })
  }
})

export default router
