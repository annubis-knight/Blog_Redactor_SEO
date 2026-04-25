import { Router } from 'express'
import { log } from '../utils/logger.js'
import { analyzeContentGap } from '../services/article/content-gap.service.js'

// Sprint 15.5 — content-gap is now cross-article (DB-first on keyword_metrics.content_gap_analysis).
// articleId param dropped: two articles testing the same keyword share the analysis.

const router = Router()

/** POST /api/content-gap/analyze — Analyze competitor content and identify gaps */
router.post('/content-gap/analyze', async (req, res) => {
  const { keyword, currentContent } = req.body ?? {}
  if (!keyword || typeof keyword !== 'string') {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'keyword is required' },
    })
    return
  }

  log.info(`Content gap analysis for "${keyword}"`)
  try {
    const result = await analyzeContentGap(keyword, currentContent)
    log.info(`Content gap done for "${keyword}"`, { gaps: result.gaps?.length ?? 0 })
    // `_apiUsage` est posé par le service sur result pendant l'analyse IA.
    // On le remonte aussi sous `usage` pour alignement avec la convention unifiée
    // (api.service.ts::pushUsageIfPresent cherche `usage` sur data).
    const usage = (result as { _apiUsage?: unknown })._apiUsage
    res.json({ data: { ...result, usage } })
  } catch (err) {
    log.error(`POST /api/content-gap/analyze — ${(err as Error).message}`)
    const message =
      err instanceof Error ? err.message : 'Erreur analyse content gap'
    res.status(500).json({ error: { code: 'CONTENT_GAP_ERROR', message } })
  }
})

export default router
