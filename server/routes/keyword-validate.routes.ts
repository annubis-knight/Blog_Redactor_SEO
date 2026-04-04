import { Router } from 'express'
import { join } from 'path'
import { log } from '../utils/logger.js'
import { readCached, writeCached, slugify, isFresh } from '../utils/cache.js'
import { fetchKeywordOverview, fetchPaa } from '../services/dataforseo.service.js'
import { fetchAutocomplete } from '../services/autocomplete.service.js'
import { getThresholds, scoreKpi, computeVerdict } from '../services/keyword-validate.service.js'
import type { ArticleLevel, ValidateResponse } from '../../shared/types/keyword-validate.types.js'

const router = Router()

const CACHE_DIR = join(process.cwd(), 'data', 'cache', 'validate')
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const VALID_LEVELS: ArticleLevel[] = ['pilier', 'intermediaire', 'specifique']

/** POST /api/keywords/:keyword/validate — Contextual scoring + verdict */
router.post('/keywords/:keyword/validate', async (req, res) => {
  try {
    const keyword = decodeURIComponent(req.params.keyword)
    const { level } = req.body as { level?: string }

    // Validate inputs
    if (!keyword) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'keyword is required' } })
      return
    }
    if (!level || !VALID_LEVELS.includes(level as ArticleLevel)) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'level is required and must be one of: pilier, intermediaire, specifique' } })
      return
    }

    const articleLevel = level as ArticleLevel
    const cacheKey = `${slugify(keyword)}-${articleLevel}`

    // Check cache
    const cached = await readCached<ValidateResponse>(CACHE_DIR, cacheKey)
    if (cached && isFresh(cached.cachedAt, CACHE_TTL_MS)) {
      log.debug(`Validate cache hit for "${keyword}" (${articleLevel})`)
      res.json({ data: { ...cached.data, fromCache: true, cachedAt: cached.cachedAt } })
      return
    }

    log.info(`Validating keyword "${keyword}" for level "${articleLevel}"`)

    // Parallel fetch: DataForSEO (volume, KD, CPC), Autocomplete, PAA
    const [overview, autocomplete, paa] = await Promise.all([
      fetchKeywordOverview(keyword),
      fetchAutocomplete(keyword),
      fetchPaa(keyword),
    ])

    // Encode intent: check if intent data available from overview
    // For now, use a simple heuristic based on keyword characteristics
    // Full intent scoring will use fetchSearchIntentBatch in future stories
    const intentValue = 0.5 // Default to mixed until full intent integration

    // Build 6 KPIs
    const config = getThresholds(articleLevel)
    const kpis = [
      scoreKpi('volume', overview.searchVolume, config),
      scoreKpi('kd', overview.difficulty, config),
      scoreKpi('cpc', overview.cpc, config),
      scoreKpi('paa', paa.length, config),
      scoreKpi('intent', intentValue, config),
      scoreKpi('autocomplete', autocomplete.position ?? 0, config),
    ]

    // Compute verdict
    const verdict = computeVerdict(kpis)

    const response: ValidateResponse = {
      keyword,
      articleLevel,
      kpis,
      verdict,
      fromCache: false,
      cachedAt: null,
      paaQuestions: paa.length > 0 ? paa.map(p => ({ question: p.question, answer: p.answer })) : undefined,
    }

    // Write cache
    await writeCached(CACHE_DIR, cacheKey, response)

    log.info(`Validate done for "${keyword}": ${verdict.level} (${verdict.greenCount}/${verdict.totalKpis} verts)`)

    res.json({ data: response })
  } catch (err) {
    log.error(`POST /api/keywords/:keyword/validate — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Keyword validation failed' } })
  }
})

export default router
