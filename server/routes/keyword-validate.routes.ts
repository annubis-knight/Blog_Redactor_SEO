import { Router } from 'express'
import { join } from 'path'
import { log } from '../utils/logger.js'
import { readCached, writeCached, slugify, isFresh } from '../utils/cache.js'
import { fetchKeywordOverview, fetchSearchIntentBatch } from '../services/dataforseo.service.js'
import { fetchAutocomplete } from '../services/autocomplete.service.js'
import { getThresholds, scoreKpi, computeVerdict, computeIntentScore } from '../services/keyword-validate.service.js'
import {
  fetchSerpAdvanced,
  extractPaaFromSerp,
  matchResonanceDetailed,
  extractTopicWords,
  bestMatch,
  computePaaWeightedScore,
} from '../services/intent-scan.service.js'
import type { ResonanceMatch, RadarMatchQuality } from '../../shared/types/intent.types.js'
import type { ArticleLevel, ValidateResponse } from '../../shared/types/keyword-validate.types.js'

const router = Router()

const CACHE_DIR = join(process.cwd(), 'data', 'cache', 'validate')
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const VALID_LEVELS: ArticleLevel[] = ['pilier', 'intermediaire', 'specifique']

/** POST /api/keywords/:keyword/validate — Contextual scoring + verdict */
router.post('/keywords/:keyword/validate', async (req, res) => {
  try {
    const keyword = decodeURIComponent(req.params.keyword)
    const { level, articleTitle } = req.body as { level?: string; articleTitle?: string }

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
    const titleSlug = articleTitle ? `-${slugify(articleTitle)}` : ''
    const cacheKey = `${slugify(keyword)}-${articleLevel}${titleSlug}`

    // Check cache — skip if cached result had zero signals (stale auto NO-GO)
    const cached = await readCached<ValidateResponse>(CACHE_DIR, cacheKey)
    if (cached && isFresh(cached.cachedAt, CACHE_TTL_MS) && !cached.data.verdict?.autoNoGo) {
      log.debug(`Validate cache hit for "${keyword}" (${articleLevel})`)
      res.json({ data: { ...cached.data, fromCache: true, cachedAt: cached.cachedAt } })
      return
    }
    if (cached?.data.verdict?.autoNoGo) {
      log.info(`Validate cache skipped for "${keyword}" — stale auto NO-GO, re-fetching`)
    }

    log.info(`Validating keyword "${keyword}" for level "${articleLevel}"`)

    // Parallel fetch: DataForSEO (volume, KD, CPC), Autocomplete, SERP (PAA), Intent
    const [overview, autocomplete, serpResult, intentMap] = await Promise.all([
      fetchKeywordOverview(keyword),
      fetchAutocomplete(keyword),
      fetchSerpAdvanced(keyword),
      fetchSearchIntentBatch([keyword]),
    ])
    const paa = extractPaaFromSerp(serpResult)

    // Match PAA items against topic words for weighted scoring
    const topicSource = articleTitle ? `${keyword} ${articleTitle}` : keyword
    const topicWords = extractTopicWords(topicSource)

    const matchedPaaItems = paa.map(p => {
      const qDetail = matchResonanceDetailed(p.question, topicWords)
      const aDetail = p.answer
        ? matchResonanceDetailed(p.answer, topicWords)
        : { match: 'none' as ResonanceMatch, quality: 'stem' as const }
      const match = bestMatch(qDetail.match, aDetail.match)
      // Aligned with radar: quality comes from the side providing the best match
      const quality: RadarMatchQuality =
        qDetail.match === aDetail.match
          ? (qDetail.quality === 'exact' || aDetail.quality === 'exact' ? 'exact' : 'stem')
          : (bestMatch(qDetail.match, aDetail.match) === qDetail.match ? qDetail.quality : aDetail.quality)
      return { match, matchQuality: match !== 'none' ? quality : undefined }
    })

    // Compute real intent score from DataForSEO
    const intentData = intentMap.get(keyword)
    const intentValue = intentData
      ? computeIntentScore(intentData.intent, intentData.intentProbability, articleLevel)
      : 0.5

    // Build 6 KPIs
    const config = getThresholds(articleLevel)
    const kpis = [
      scoreKpi('volume', overview.searchVolume, config),
      scoreKpi('kd', overview.difficulty, config),
      scoreKpi('cpc', overview.cpc, config),
      scoreKpi('paa', computePaaWeightedScore(matchedPaaItems), config),
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
      paaQuestions: paa.length > 0 ? paa.map((p, idx) => ({
        question: p.question,
        answer: p.answer ?? null,
        match: matchedPaaItems[idx].match,
        matchQuality: matchedPaaItems[idx].matchQuality,
      })) : undefined,
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
