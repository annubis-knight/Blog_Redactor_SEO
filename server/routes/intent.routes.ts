import { Router } from 'express'
import { log } from '../utils/logger.js'
import { analyzeIntent, compareLocalNational, validateAutocomplete } from '../services/intent.service.js'

const router = Router()

/** POST /api/intent/analyze — Analyze SERP structure and classify intent */
router.post('/intent/analyze', async (req, res) => {
  const { keyword, locationCode } = req.body ?? {}
  if (!keyword || typeof keyword !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword is required' } })
    return
  }

  log.info(`Intent analysis for "${keyword}"`)
  try {
    const result = await analyzeIntent(keyword, locationCode)
    log.info(`Intent result for "${keyword}": ${result.dominantIntent}`, { modules: result.modules.filter(m => m.present).length, scores: result.scores.length })
    // Forward Claude usage for cost tracking (classification.usage set by classifyIntentWithClaude)
    const _apiUsage = (result.classification as any)?.usage ?? undefined
    res.json({ data: { ...result, _apiUsage } })
  } catch (err) {
    log.error(`POST /api/intent/analyze — ${(err as Error).message}`)
    const message = err instanceof Error ? err.message : 'Erreur analyse intention'
    res.status(500).json({ error: { code: 'INTENT_ANALYSIS_ERROR', message } })
  }
})

/** POST /api/keywords/compare-local — Compare local vs national metrics */
router.post('/keywords/compare-local', async (req, res) => {
  const { keyword } = req.body ?? {}
  if (!keyword || typeof keyword !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword is required' } })
    return
  }

  log.info(`Local vs national comparison for "${keyword}"`)
  try {
    const result = await compareLocalNational(keyword)
    log.info(`Comparison done for "${keyword}"`, { local: result.local.searchVolume, national: result.national.searchVolume, opportunityIndex: result.opportunityIndex })
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/keywords/compare-local — ${(err as Error).message}`)
    const message = err instanceof Error ? err.message : 'Erreur comparaison local/national'
    res.status(500).json({ error: { code: 'COMPARISON_ERROR', message } })
  }
})

/** POST /api/keywords/autocomplete — Validate keyword via Google Autocomplete */
router.post('/keywords/autocomplete', async (req, res) => {
  const { keyword, prefixes } = req.body ?? {}
  if (!keyword || typeof keyword !== 'string') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword is required' } })
    return
  }

  log.info(`Autocomplete validation for "${keyword}"`)
  try {
    const result = await validateAutocomplete(keyword, prefixes)
    log.info(`Autocomplete for "${keyword}": ${result.validated ? 'validated' : 'not found'}`, { suggestions: result.suggestions.length, certainty: result.certaintyIndex.total.toFixed(2) })
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/keywords/autocomplete — ${(err as Error).message}`)
    const message = err instanceof Error ? err.message : 'Erreur validation autocomplete'
    res.status(500).json({ error: { code: 'AUTOCOMPLETE_ERROR', message } })
  }
})

export default router
