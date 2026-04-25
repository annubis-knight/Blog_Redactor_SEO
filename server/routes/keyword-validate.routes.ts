import { Router } from 'express'
import { log } from '../utils/logger.js'
import { fetchKeywordOverview, fetchSearchIntentBatch } from '../services/external/dataforseo.service.js'
import { respondWithError } from '../utils/api-error.js'
import { saveCaptainExploration } from '../services/infra/data.service.js'
import type { CaptainValidationEntry } from '../../shared/types/keyword.types.js'
import { fetchAutocomplete } from '../services/keyword/autocomplete.service.js'
import {
  getKeywordMetrics,
  upsertKeywordKpis,
  upsertKeywordPaa,
  isKeywordMetricsFresh,
} from '../services/keyword/keyword-metrics.service.js'
import { getThresholds, scoreKpi, computeVerdict, computeIntentScore } from '../services/keyword/keyword-validate.service.js'
import {
  fetchSerpAdvanced,
  extractPaaFromSerp,
  matchResonanceDetailed,
  extractTopicWords,
  bestMatch,
  computePaaWeightedScore,
} from '../services/intent/intent-scan.service.js'
import type { ResonanceMatch, RadarMatchQuality } from '../../shared/types/intent.types.js'
import type { ArticleLevel, ValidateResponse } from '../../shared/types/keyword-validate.types.js'

const router = Router()

const FRESHNESS_DAYS = 7

const VALID_LEVELS: ArticleLevel[] = ['pilier', 'intermediaire', 'specifique']

/** POST /api/keywords/:keyword/validate — Contextual scoring + verdict */
router.post('/keywords/:keyword/validate', async (req, res) => {
  try {
    const keyword = decodeURIComponent(req.params.keyword)
    const { level, articleTitle, articleId } = req.body as { level?: string; articleTitle?: string; articleId?: number }

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

    // Sprint 15.3 — DB-first cross-article on keyword_metrics.
    // Raw metrics (volume, KD, CPC, autocomplete, PAA) are keyword-scoped.
    // Only the verdict (level-sensitive) and PAA scoring (article-title-sensitive)
    // are recomputed per article on every call.
    const cachedMetrics = await getKeywordMetrics(keyword)
    let rawVolume: number | null = cachedMetrics?.searchVolume ?? null
    let rawKd: number | null = cachedMetrics?.keywordDifficulty ?? null
    let rawCpc: number | null = cachedMetrics?.cpc ?? null
    let rawCompetition: number | null = cachedMetrics?.competition ?? null
    let rawIntentScore: number | null = cachedMetrics?.intentRaw ?? null
    let autocompleteSuggestions = cachedMetrics?.autocompleteSuggestions ?? []
    let paaQuestionsRaw = cachedMetrics?.paaQuestions ?? []

    const metricsFresh = isKeywordMetricsFresh(cachedMetrics?.fetchedAt, FRESHNESS_DAYS)
    const hasAllRawData =
      cachedMetrics !== null &&
      rawVolume !== null &&
      rawKd !== null &&
      rawCpc !== null &&
      autocompleteSuggestions.length >= 0 && // autocomplete peut être vide légitimement
      paaQuestionsRaw.length >= 0 // idem
    const hitDb = metricsFresh && hasAllRawData && (cachedMetrics?.autocompleteSource !== null)

    if (!hitDb) {
      log.info(`Validating keyword "${keyword}" for level "${articleLevel}" — DB miss or stale, fetching external APIs`)

      const [overview, autocomplete, serpResult, intentMap] = await Promise.all([
        fetchKeywordOverview(keyword),
        fetchAutocomplete(keyword),
        fetchSerpAdvanced(keyword),
        fetchSearchIntentBatch([keyword]),
      ])
      const paa = extractPaaFromSerp(serpResult)

      rawVolume = overview.searchVolume
      rawKd = overview.difficulty
      rawCpc = overview.cpc
      rawCompetition = overview.competition
      const intentData = intentMap.get(keyword)
      // computeIntentScore applies level context, so keep it for verdict. For raw
      // storage we keep the DataForSEO intentProbability when available.
      rawIntentScore = intentData?.intentProbability ?? null
      autocompleteSuggestions = autocomplete.suggestions.map((text, idx) => ({ text, position: idx + 1 }))
      paaQuestionsRaw = paa.map(p => ({ question: p.question, answer: p.answer ?? null }))

      // Persist cross-article metrics (fetchAutocomplete already upserts the
      // autocomplete column, but we also refresh the KPIs + PAA in one shot).
      await upsertKeywordKpis(keyword, {
        searchVolume: rawVolume,
        keywordDifficulty: rawKd,
        cpc: rawCpc,
        competition: rawCompetition,
        intentRaw: rawIntentScore,
      })
      if (paaQuestionsRaw.length > 0) {
        await upsertKeywordPaa(keyword, paaQuestionsRaw)
      }
    } else {
      log.info(`Validating keyword "${keyword}" for level "${articleLevel}" — DB hit (fresh <${FRESHNESS_DAYS}d)`)
    }

    // Always recompute contextualised fields: level-sensitive verdict + article-title-sensitive PAA scoring.
    const topicSource = articleTitle ? `${keyword} ${articleTitle}` : keyword
    const topicWords = extractTopicWords(topicSource)

    const matchedPaaItems = paaQuestionsRaw.map(p => {
      const qDetail = matchResonanceDetailed(p.question, topicWords)
      const aDetail = p.answer
        ? matchResonanceDetailed(p.answer, topicWords)
        : { match: 'none' as ResonanceMatch, quality: 'stem' as const }
      const match = bestMatch(qDetail.match, aDetail.match)
      const quality: RadarMatchQuality =
        qDetail.match === aDetail.match
          ? (qDetail.quality === 'exact' || aDetail.quality === 'exact' ? 'exact' : 'stem')
          : (bestMatch(qDetail.match, aDetail.match) === qDetail.match ? qDetail.quality : aDetail.quality)
      return { match, matchQuality: match !== 'none' ? quality : undefined }
    })

    // Rebuild intent score with level context
    let intentValue = 0.5
    if (rawIntentScore !== null) {
      // computeIntentScore needs the DataForSEO `intent` string too; fallback on mid-value if unavailable.
      // When reading from DB we don't have the intent type label (only the numeric probability).
      // Acceptable trade-off: the DataForSEO scoring in our system uses intentProbability directly anyway.
      intentValue = Math.max(0, Math.min(1, rawIntentScore))
    }

    const keywordLower = keyword.toLowerCase()
    const autocompletePosition = autocompleteSuggestions.findIndex(s => s.text.toLowerCase() === keywordLower)

    const config = getThresholds(articleLevel)
    const kpis = [
      scoreKpi('volume', rawVolume ?? 0, config),
      scoreKpi('kd', rawKd ?? 0, config),
      scoreKpi('cpc', rawCpc ?? 0, config),
      scoreKpi('paa', computePaaWeightedScore(matchedPaaItems), config),
      scoreKpi('intent', intentValue, config),
      scoreKpi('autocomplete', autocompletePosition >= 0 ? autocompletePosition + 1 : 0, config),
    ]

    const verdict = computeVerdict(kpis)

    const paaForResponse = paaQuestionsRaw.map((p, idx) => ({
      question: p.question,
      answer: p.answer ?? null,
      match: matchedPaaItems[idx].match,
      matchQuality: matchedPaaItems[idx].matchQuality,
    }))

    const response: ValidateResponse = {
      keyword,
      articleLevel,
      kpis,
      verdict,
      fromCache: hitDb,
      cachedAt: hitDb ? (cachedMetrics?.fetchedAt ?? null) : null,
      paaQuestions: paaForResponse.length > 0 ? paaForResponse : undefined,
    }

    log.info(`Validate done for "${keyword}": ${verdict.level} (${verdict.greenCount}/${verdict.totalKpis} verts) [hitDb=${hitDb}]`)

    // Article-scoped persistence — track the decision "article X tested keyword Y at level Z"
    if (typeof articleId === 'number' && Number.isFinite(articleId)) {
      try {
        const captainEntry: CaptainValidationEntry = {
          keyword,
          articleLevel,
          // kpis kept here only until Sprint 15.3-bis drops the column entirely.
          kpis: kpis.map(k => ({ name: k.name, rawValue: k.rawValue })),
          rootKeywords: [],
          paaQuestions: response.paaQuestions,
        }
        await saveCaptainExploration(articleId, captainEntry)
        log.debug(`Validate: captain exploration persisted`, { articleId, keyword })
      } catch (persistErr) {
        log.error(`Validate: captain exploration persist failed — ${(persistErr as Error).message}`, { articleId, keyword })
      }
    }

    res.json({ data: response })
  } catch (err) {
    log.error(`POST /api/keywords/:keyword/validate — ${(err as Error).message}`)
    respondWithError(res, err, { message: 'Keyword validation failed' })
  }
})

export default router
