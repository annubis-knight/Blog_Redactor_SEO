import { Router } from 'express'
import { log } from '../utils/logger.js'
import { fetchKeywordOverview, fetchSearchIntentBatch } from '../services/external/dataforseo.service.js'
import { respondWithError } from '../utils/api-error.js'
import { saveCaptainExploration } from '../services/infra/data.service.js'
import { getRadarExploration } from '../services/infra/radar-exploration.service.js'
import { getArticlePainIntent } from '../services/queries/article-pain-intent.service.js'
import { computeMarketScore } from '../../shared/scoring-kpi.js'
import { computeRelevanceScore } from '../../shared/scoring.js'
import { extractRoots } from '../../shared/utils/keyword-roots.js'
import type { RadarKeywordKpis, RadarCard } from '../../shared/types/intent.types.js'
import type { RelevanceScoreResult, PainIntentExpected } from '../../shared/types/scoring.types.js'
import { PAIN_INTENT_EXPECTED_VALUES } from '../../shared/types/scoring.types.js'

const VALID_INTENT_LABELS = new Set<string>(PAIN_INTENT_EXPECTED_VALUES)

/** Coerce un label DataForSEO arbitraire vers les 4 valeurs autorisées. */
function coerceIntentLabel(value: unknown): PainIntentExpected | null {
  if (typeof value !== 'string') return null
  return VALID_INTENT_LABELS.has(value) ? (value as PainIntentExpected) : null
}
import type { CaptainScanEntry } from '../../shared/types/keyword.types.js'
import { fetchAutocomplete } from '../services/external/autocomplete.service.js'
import {
  getKeywordMetrics,
  upsertKeywordKpis,
  upsertKeywordPaa,
  isKeywordMetricsFresh,
} from '../services/keyword/keyword-metrics.service.js'
import { getThresholds, scoreKpi, computeVerdict } from '../services/keyword/keyword-scan.service.js'
import { lexicalPainAlignment, avgLexicalPainAlignment } from '../services/keyword/lexical-pain-alignment.js'
import {
  fetchSerpAdvanced,
  extractPaaFromSerp,
  extractTopicWords,
} from '../services/intent/intent-scan.service.js'
import { scoreCaptainPaa, captainAutocompletePosition, captainIntentValue } from '../services/keyword/captain-kpis.js'
import type { ArticleLevel, ScanResponse } from '../../shared/types/keyword-validate.types.js'
import { parseContract, toKpiValue } from '../../shared/contracts/core.js'
import { captainScanContract } from '../../shared/contracts/captain-scan.contract.js'

const router = Router()

const FRESHNESS_DAYS = 7

const VALID_LEVELS: ArticleLevel[] = ['pilier', 'intermediaire', 'specifique']

/** POST /api/keywords/:keyword/scan — Contextual scoring + verdict */
router.post('/keywords/:keyword/scan', async (req, res) => {
  try {
    const keyword = decodeURIComponent(req.params.keyword)
    // Bloc 5 — `painPoint` accepté optionnellement pour permettre le calcul
    // de `relevanceScore` à la volée même si le scan Radar n'a jamais eu
    // lieu pour cet article (cas le plus fréquent quand l'utilisateur
    // attaque directement par Capitaine).
    const { level, articleTitle, articleId, painPoint } = req.body as {
      level?: string
      articleTitle?: string
      articleId?: number
      painPoint?: string
    }

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


    // Raw metrics (volume, KD, CPC, autocomplete, PAA) are keyword-scoped.
    // Only the verdict (level-sensitive) and PAA scoring (article-title-sensitive)
    // are recomputed per article on every call.
    const cachedMetrics = await getKeywordMetrics(keyword)
    let rawVolume: number | null = cachedMetrics?.searchVolume ?? null
    let rawKd: number | null = cachedMetrics?.keywordDifficulty ?? null
    let rawCpc: number | null = cachedMetrics?.cpc ?? null
    let rawCompetition: number | null = cachedMetrics?.competition ?? null
    let rawIntentScore: number | null = cachedMetrics?.intentRaw ?? null
    // Intention de la SERP (M2) : elle entre dans le score marché et dans le 5e
    // signal de pertinence, comme au rechargement (captain-relevance.service).
    let serpIntentLabel: PainIntentExpected | null = coerceIntentLabel(cachedMetrics?.intentLabel)
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
    // SERP en panne pendant cet appel : les questions PAA sont inconnues, pas « zéro question ».
    let serpUnavailable = false

    if (!hitDb) {
      log.info(`Validating keyword "${keyword}" for level "${articleLevel}" — DB miss or stale, fetching external APIs`)

      const [overview, autocomplete, serpResult, intentMap] = await Promise.all([
        fetchKeywordOverview(keyword),
        fetchAutocomplete(keyword),
        fetchSerpAdvanced(keyword),
        fetchSearchIntentBatch([keyword]),
      ])
      const paa = extractPaaFromSerp(serpResult)
      serpUnavailable = serpResult === null

      // Frontière de la source : une valeur illisible (NaN, texte) devient absente.
      rawVolume = toKpiValue(overview.searchVolume, 'overview.searchVolume')
      rawKd = toKpiValue(overview.difficulty, 'overview.difficulty')
      rawCpc = toKpiValue(overview.cpc, 'overview.cpc')
      rawCompetition = toKpiValue(overview.competition, 'overview.competition')
      // DataForSEO range les intentions sous des clés en minuscules (épopée qualité SEO, M1).
      const intentData = intentMap.get(keyword.toLowerCase())
      // computeIntentScore applies level context, so keep it for verdict. For raw
      // storage we keep the DataForSEO intentProbability when available.
      rawIntentScore = intentData?.intentProbability ?? null
      // Label intent SERP — alimente le 5e signal Pertinence (FR-CAP-RELEVANCE-INTENT-SIGNAL).
      const rawIntentLabel = coerceIntentLabel(intentData?.intent)
      serpIntentLabel = rawIntentLabel
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
        intentLabel: rawIntentLabel,
      })
      if (paaQuestionsRaw.length > 0) {
        await upsertKeywordPaa(keyword, paaQuestionsRaw)
      }
    } else {
      log.info(`Validating keyword "${keyword}" for level "${articleLevel}" — DB hit (fresh <${FRESHNESS_DAYS}d)`)
    }

    // Always recompute contextualised fields: level-sensitive verdict + article-title-sensitive PAA scoring.
    // Même expression qu'au rechargement (captain-kpis.ts, CLAUDE.md §2.0).
    const { matched: matchedPaaItems, weightedScore: paaWeightedScore } =
      scoreCaptainPaa(keyword, articleTitle, paaQuestionsRaw)

    // Intention : probabilité DataForSEO bornée à 0-1 ; inconnue → absente (« — »),
    // comme au rechargement (captain-kpis.ts).
    const intentValue = captainIntentValue(rawIntentScore)

    // Ici les suggestions viennent d'être récupérées (ou relues fraîches) : mot absent → 0 « Non trouvé ».
    const autocompleteValue = captainAutocompletePosition(keyword, autocompleteSuggestions, true)

    const config = getThresholds(articleLevel)
    // Une donnée absente reste absente : `scoreKpi(null)` produit un KPI neutre
    // « — » que le verdict ignore (FR-INFRA-KPI-SCORING-NULLSAFE). L'ancien
    // `?? 0` affichait « KD 0 » en vert et pouvait inventer un NO-GO.
    const kpis = [
      scoreKpi('volume', rawVolume, config),
      scoreKpi('kd', rawKd, config),
      scoreKpi('cpc', rawCpc, config),
      scoreKpi('paa', serpUnavailable ? null : paaWeightedScore, config),
      scoreKpi('intent', intentValue, config),
      scoreKpi('autocomplete', autocompleteValue, config),
    ]

    const verdict = computeVerdict(kpis)

    const paaForResponse = paaQuestionsRaw.map((p, idx) => ({
      question: p.question,
      answer: p.answer ?? null,
      match: matchedPaaItems[idx].match,
      matchQuality: matchedPaaItems[idx].matchQuality,
    }))

    // ----- Score KPI / Marché — toujours calculé (séparation KPI vs Pertinence, V1) -----
    // On propage les `null` bruts : `RadarKeywordKpis` accepte `number | null`
    // pour searchVolume/difficulty/cpc/competition, le front affiche `—` quand
    // c'est `null`, et le tri pousse ces cards en bas (TD-DRIFT-019 2026-05-13).
    const kpisForMarket: RadarKeywordKpis = {
      searchVolume: rawVolume,
      difficulty: rawKd,
      cpc: rawCpc,
      competition: rawCompetition,
      intentTypes: serpIntentLabel ? [serpIntentLabel] : [],
      intentProbability: rawIntentScore,
      autocompleteMatchCount: autocompleteValue ?? 0,
      paaMatchCount: matchedPaaItems.filter(p => p.match !== 'none').length,
      paaWeightedScore,
      paaTotal: paaQuestionsRaw.length,
      avgSemanticScore: null,
    }
    const marketScore = computeMarketScore(kpisForMarket, articleLevel)

    // ----- Score de Pertinence (Bloc 5 — calcul à la volée) -----
    // Stratégie en 2 niveaux :
    //   1. Cache Radar : si une card existe déjà pour cet article + keyword,
    //      on récupère ses signaux (painAlignment, paaPainAvg, autoPainAvg)
    //      issus du dernier scan (embeddings sémantiques de qualité).
    //   2. Fallback lexical : si pas de cache OU painPoint fourni dans le
    //      body, on recalcule un score lexical (matchResonanceDetailed)
    //      contre le painPoint et les PAA/autocomplete déjà en DB.
    //      Déterministe, mock-friendly, < 1 ms.
    // Si aucun signal exploitable → relevanceScore = null (ScoreRing affichera
    // "—" + l'utilisateur saura que la donnée brute manque).
    let relevanceScore: RelevanceScoreResult | null = null
    let cachedKwPainAlignment: number | null = null
    let cachedPaaPainAvg: number | null = null
    let cachedAutoPainAvg: number | null = null
    let cachedIntentTypes: typeof kpisForMarket.intentTypes | undefined

    if (typeof articleId === 'number' && Number.isFinite(articleId)) {
      try {
        const radar = await getRadarExploration(articleId)
        const matchingCard = radar?.scanResult?.cards?.find((c: RadarCard) => c.keyword === keyword)
        if (matchingCard && matchingCard.kpis) {
          // Suggestions longue-traîne (source: 'longtail') ont kpis: null par
          // construction — on saute le cache de pertinence pour celles-là.
          const k = matchingCard.kpis
          cachedKwPainAlignment = k.painAlignmentScore ?? null
          cachedPaaPainAvg = matchingCard.scoreBreakdown?.paaMatchScore ?? null
          cachedAutoPainAvg = matchingCard.scoreBreakdown?.resonanceBonus ?? null
          cachedIntentTypes = k.intentTypes
        }
      } catch (lookupErr) {
        log.warn(`[validate] radar cache lookup failed: ${(lookupErr as Error).message}`)
      }
    }

    const painPointTrim = (painPoint ?? '').trim()
    const hasPainPoint = painPointTrim.length >= 10
    const painWords = hasPainPoint ? extractTopicWords(painPointTrim) : []

    let lexicalKwPainAlignment: number | null = null
    let lexicalPaaPainAvg: number | null = null
    let lexicalAutoPainAvg: number | null = null

    if (hasPainPoint && painWords.length > 0) {
      lexicalKwPainAlignment = lexicalPainAlignment(keyword, painWords)
      lexicalPaaPainAvg = avgLexicalPainAlignment(
        paaQuestionsRaw.map(p => (p.answer ? `${p.question} ${p.answer}` : p.question)),
        painWords,
      )
      lexicalAutoPainAvg = avgLexicalPainAlignment(
        autocompleteSuggestions.map(s => s.text),
        painWords,
      )
    }

    // Sources fusionnées : cache Radar prioritaire (qualité embeddings), fallback lexical sinon.
    const finalKwPainAlignment = cachedKwPainAlignment ?? lexicalKwPainAlignment
    const finalPaaPainAvg = cachedPaaPainAvg ?? lexicalPaaPainAvg
    const finalAutoPainAvg = cachedAutoPainAvg ?? lexicalAutoPainAvg
    const finalIntentTypes = cachedIntentTypes?.length ? cachedIntentTypes : kpisForMarket.intentTypes
    // L'intention éditoriale attendue de l'article : même source qu'au
    // rechargement, sinon le scan et le rechargement divergeaient (M2).
    const painIntentExpected = typeof articleId === 'number' && Number.isFinite(articleId)
      ? await getArticlePainIntent(articleId)
      : null

    const hasAnyPainSignal =
      finalKwPainAlignment != null || finalPaaPainAvg != null || finalAutoPainAvg != null

    if (hasAnyPainSignal) {
      relevanceScore = computeRelevanceScore({
        painAlignmentScore: finalKwPainAlignment,
        paaPainAlignmentAvg: finalPaaPainAvg,
        autocompletePainAlignmentAvg: finalAutoPainAvg,
        rootsAverageScore: null,
        intentTypes: finalIntentTypes,
        painIntentExpected: painIntentExpected ?? undefined,
      })
    }

    const response: ScanResponse = {
      keyword,
      articleLevel,
      kpis,
      verdict,
      fromCache: hitDb,
      cachedAt: hitDb ? (cachedMetrics?.fetchedAt ?? null) : null,
      paaQuestions: paaForResponse.length > 0 ? paaForResponse : undefined,
      marketScore,
      relevanceScore,
    }

    log.info(`Validate done for "${keyword}": ${verdict.level} (${verdict.greenCount}/${verdict.totalKpis} verts) [hitDb=${hitDb}]`)

    // Article-scoped persistence — track the decision "article X tested keyword Y at level Z"
    if (typeof articleId === 'number' && Number.isFinite(articleId)) {
      try {
        const captainEntry: CaptainScanEntry = {
          keyword,
          articleLevel,
          // kpis kept here only until -bis drops the column entirely.
          kpis: kpis.map(k => ({ name: k.name, rawValue: k.rawValue })),
          rootKeywords: extractRoots(keyword),
          paaQuestions: response.paaQuestions,
        }
        await saveCaptainExploration(articleId, captainEntry)
        log.debug(`Validate: captain exploration persisted`, { articleId, keyword })
      } catch (persistErr) {
        log.error(`Validate: captain exploration persist failed — ${(persistErr as Error).message}`, { articleId, keyword })
      }
    }

    // Frontière serveur : la réponse sort dans la forme promise aux écrans.
    res.json({ data: parseContract(captainScanContract, response, 'server') })
  } catch (err) {
    log.error(`POST /api/keywords/:keyword/scan — ${(err as Error).message}`)
    respondWithError(res, err, { message: 'Keyword validation failed' })
  }
})

export default router
