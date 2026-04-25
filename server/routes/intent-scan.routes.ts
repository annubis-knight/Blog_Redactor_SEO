import { Router } from 'express'
import { log } from '../utils/logger.js'
import { scanIntent } from '../services/intent/intent-scan.service.js'
import { generateRadarKeywords, scanRadarKeywords } from '../services/keyword/keyword-radar.service.js'

const router = Router()

/** POST /api/keywords/intent-scan — 2-pass resonance scan (broad → specific) */
router.post('/keywords/intent-scan', async (req, res) => {
  const { broadKeyword, specificTopic } = req.body ?? {}
  if (!broadKeyword || typeof broadKeyword !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'broadKeyword is required' } })
    return
  }
  if (!specificTopic || typeof specificTopic !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'specificTopic is required' } })
    return
  }

  const depth = typeof req.body.depth === 'number' ? req.body.depth : 1

  log.info(`Intent scan: broad="${broadKeyword}" specific="${specificTopic}" depth=${depth}`)
  try {
    const result = await scanIntent(broadKeyword, specificTopic, depth)
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/keywords/intent-scan — ${(err as Error).message}`)
    const message = err instanceof Error ? err.message : 'Erreur intent scan'
    res.status(500).json({ error: { code: 'INTENT_SCAN_ERROR', message } })
  }
})

/** POST /api/keywords/radar/generate — AI generates ~20 short-tail keywords */
router.post('/keywords/radar/generate', async (req, res) => {
  const { title, keyword, painPoint, cocoonSlug } = req.body ?? {}
  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'title is required' } })
    return
  }
  if (!keyword || typeof keyword !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword is required' } })
    return
  }
  if (!painPoint || typeof painPoint !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'painPoint is required' } })
    return
  }

  log.info(`Radar generate: title="${title}" keyword="${keyword}"`)
  log.debug(`Radar generate params:`, { title, keyword, painPoint: painPoint.slice(0, 80) })
  const startGen = Date.now()
  try {
    const result = await generateRadarKeywords(title, keyword, painPoint, cocoonSlug)
    log.info(`Radar generate done: ${result.keywords.length} keywords in ${Date.now() - startGen}ms`)
    // Alias `usage` pour la pile d'activité (convention unifiée avec apiPost::pushUsageIfPresent)
    const usage = (result as { _apiUsage?: unknown })._apiUsage
    res.json({ data: { ...result, usage } })
  } catch (err) {
    log.error(`POST /api/keywords/radar/generate — ${(err as Error).message}`)
    const message = err instanceof Error ? err.message : 'Erreur génération radar'
    res.status(500).json({ error: { code: 'RADAR_GENERATE_ERROR', message } })
  }
})

/** POST /api/keywords/radar/scan — Scan keywords with PAA, overview, intent */
router.post('/keywords/radar/scan', async (req, res) => {
  const { broadKeyword, specificTopic, keywords, depth, painPoint } = req.body ?? {}
  if (!broadKeyword || typeof broadKeyword !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'broadKeyword is required' } })
    return
  }
  if (!specificTopic || typeof specificTopic !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'specificTopic is required' } })
    return
  }
  if (!Array.isArray(keywords) || keywords.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keywords array is required' } })
    return
  }

  const effectiveDepth = typeof depth === 'number' ? depth : 1
  const painPointClean = typeof painPoint === 'string' ? painPoint.trim() : ''

  log.info(`Radar scan: ${keywords.length} keywords, depth=${effectiveDepth}${painPointClean ? ` | pain="${painPointClean.slice(0, 60)}"` : ''}`)
  log.debug(`Radar scan params:`, { broadKeyword, specificTopic, keywordCount: keywords.length, depth: effectiveDepth })
  const startScan = Date.now()
  try {
    const result = await scanRadarKeywords(broadKeyword, specificTopic, keywords, effectiveDepth, painPointClean || undefined)
    log.info(`Radar scan done: ${result.cards.length} cards, score=${result.globalScore}, heat=${result.heatLevel} in ${Date.now() - startScan}ms`)
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/keywords/radar/scan — ${(err as Error).message}`)
    const message = err instanceof Error ? err.message : 'Erreur scan radar'
    res.status(500).json({ error: { code: 'RADAR_SCAN_ERROR', message } })
  }
})

export default router
