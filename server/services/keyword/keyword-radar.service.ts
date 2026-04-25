import { classifyWithTool } from '../external/ai-provider.service.js'
import type { ApiUsage } from '../external/claude.service.js'
import { log } from '../../utils/logger.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { fetchKeywordOverviewBatch, fetchSearchIntentBatch } from '../external/dataforseo.service.js'
import {
  fetchSerpAdvanced,
  extractPaaFromSerp,
  extractTopicWords,
  matchResonance,
  matchResonanceDetailed,
  bestMatch,
  getHeatLevel,
  getVerdict,
  fetchAutocompleteMergedGrouped,
  normalize,
  computePaaWeightedScore,
} from '../intent/intent-scan.service.js'
import { readPaaCache, writePaaCache } from '../infra/paa-cache.service.js'
import { computeSemanticScores } from '../external/embedding.service.js'
import { computeCombinedScore } from '../../../shared/scoring.js'
import type {
  KeywordRadarGenerateResult,
  RadarKeyword,
  RadarCard,
  RadarPaaItem,
  RadarKeywordKpis,
  RadarIntentType,
  RadarMatchQuality,
  KeywordRadarScanResult,
  PaaCacheEntry,
  ResonanceMatch,
} from '../../../shared/types/intent.types.js'
import type { KeywordOverview } from '../../../shared/types/index.js'

// --- Phase 1: Generate keywords via Haiku ---

export async function generateRadarKeywords(
  title: string,
  keyword: string,
  painPoint: string,
  cocoonSlug?: string,
): Promise<KeywordRadarGenerateResult> {
  const prompt = await loadPrompt('intent-keywords', { title, keyword, painPoint }, cocoonSlug ? { cocoonSlug } : undefined)

  const model = process.env.HAIKU_MODEL || 'claude-haiku-4-5-20251001'
  log.info(`[Radar] Generating keywords for "${keyword}"`)

  interface RadarPayload { keywords: { keyword: string; reasoning: string }[] }

  let keywords: RadarKeyword[] = []
  let radarUsage: ApiUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    model,
    estimatedCost: 0,
  }

  try {
    const { result, usage } = await classifyWithTool<RadarPayload>(
      'Tu es un expert SEO. Réponds UNIQUEMENT en JSON valide, sans markdown ni commentaires.',
      prompt,
      {
        name: 'generate_radar_keywords',
        description: 'Génère une liste de mots-clés pertinents pour la résonance SERP.',
        input_schema: {
          type: 'object' as const,
          properties: {
            keywords: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  keyword: { type: 'string' },
                  reasoning: { type: 'string' },
                },
                required: ['keyword', 'reasoning'],
              },
            },
          },
          required: ['keywords'],
        },
      },
      { model, maxTokens: 1024 },
    )
    radarUsage = usage
    keywords = (result.keywords ?? [])
      .map(k => ({ keyword: (k.keyword ?? '').trim(), reasoning: (k.reasoning ?? '').trim() }))
      .filter(k => k.keyword.length > 0)
    log.info(`[Radar] AI call done`, { keyword, parsed: keywords.length, inputTokens: radarUsage.inputTokens, outputTokens: radarUsage.outputTokens, cost: `$${radarUsage.estimatedCost.toFixed(4)}` })
  } catch (err) {
    log.warn(`[Radar] AI call failed: ${(err as Error).message}`)
  }

  // Deduplicate by normalized keyword
  const seen = new Set<string>()
  const unique: RadarKeyword[] = []
  let dupeCount = 0
  for (const k of keywords) {
    const norm = normalize(k.keyword)
    if (!seen.has(norm)) {
      seen.add(norm)
      unique.push(k)
    } else {
      dupeCount++
    }
  }
  if (dupeCount > 0) log.debug(`[Radar] Removed ${dupeCount} duplicate keywords`)

  // Cap at 25
  const result: KeywordRadarGenerateResult & { _apiUsage?: ApiUsage } = {
    articleTitle: title,
    articleKeyword: keyword,
    painPoint,
    keywords: unique.slice(0, 25),
    generatedAt: new Date().toISOString(),
    _apiUsage: radarUsage,
  }

  log.info(`[Radar] Generated ${result.keywords.length} unique keywords`)
  return result
}

// --- Phase 2: Scan keywords in parallel ---

const PAA_CONCURRENCY = 3

async function fetchPaaWithCache(
  keyword: string,
  depth: number,
): Promise<{ paaItems: PaaCacheEntry['paaItems']; fromCache: boolean }> {
  // Check cache first (pass depth so shallow cache doesn't block deep requests)
  const cached = await readPaaCache(keyword, depth)
  if (cached) {
    log.debug(`[Radar] PAA cache hit for "${keyword}" → ${cached.paaItems.length} items`)
    return { paaItems: cached.paaItems, fromCache: true }
  }

  // Fetch from SERP
  log.debug(`[Radar] PAA cache miss for "${keyword}", fetching SERP...`)
  const serpResult = await fetchSerpAdvanced(keyword)
  const level1 = extractPaaFromSerp(serpResult)
  log.debug(`[Radar] PAA L1 for "${keyword}": ${level1.length} questions`)

  const allPaa: PaaCacheEntry['paaItems'] = level1.map(p => ({
    question: p.question,
    answer: p.answer,
    depth: 1,
  }))

  // Depth 2: crawl sub-PAA from each L1 question
  if (depth >= 2 && level1.length > 0) {
    const seen = new Set(allPaa.map(p => normalize(p.question)))

    const subResults = await Promise.allSettled(
      level1.map(async parent => {
        const subSerp = await fetchSerpAdvanced(parent.question)
        return { parentQ: parent.question, items: extractPaaFromSerp(subSerp) }
      }),
    )

    for (const r of subResults) {
      if (r.status === 'fulfilled') {
        for (const paa of r.value.items) {
          const key = normalize(paa.question)
          if (!seen.has(key)) {
            seen.add(key)
            allPaa.push({
              question: paa.question,
              answer: paa.answer,
              depth: 2,
              parentQuestion: r.value.parentQ,
            })
          }
        }
      }
    }
  }

  // Write to cache with depth info
  const entry: PaaCacheEntry = {
    keyword,
    paaItems: allPaa,
    cachedAt: new Date().toISOString(),
    isEmpty: allPaa.length === 0,
    maxDepth: depth,
  }
  await writePaaCache(entry)

  return { paaItems: allPaa, fromCache: false }
}

function mapIntentTypes(raw: string): RadarIntentType[] {
  const lower = raw.toLowerCase()
  const types: RadarIntentType[] = []
  if (lower.includes('informational')) types.push('informational')
  if (lower.includes('commercial')) types.push('commercial')
  if (lower.includes('transactional')) types.push('transactional')
  if (lower.includes('navigational')) types.push('navigational')
  return types
}

export async function scanRadarKeywords(
  broadKeyword: string,
  specificTopic: string,
  keywords: RadarKeyword[],
  depth: number = 1,
  painPoint?: string,
): Promise<KeywordRadarScanResult> {
  const effectiveDepth = Math.min(Math.max(depth, 1), 2)
  const keywordStrings = keywords.map(k => k.keyword)
  const topicWords = extractTopicWords(specificTopic)
  const painPointTrim = painPoint?.trim() ?? ''
  const hasPain = painPointTrim.length >= 10

  log.info(`[Radar] Scanning ${keywords.length} keywords, depth=${effectiveDepth}${hasPain ? ' | pain-aware' : ''}`)

  // Phase 1: Parallel fetch — autocomplete, keyword overview, intent, PAA per keyword
  // Autocomplete uses specificTopic (article subject) instead of broadKeyword (silo name)
  const [autocompleteResult, overviewMap, intentMap] = await Promise.all([
    fetchAutocompleteMergedGrouped(specificTopic),
    fetchKeywordOverviewBatch(keywordStrings).catch((err: Error) => {
      log.warn(`[Radar] Keyword overview batch failed: ${err.message}`)
      return new Map<string, KeywordOverview>()
    }),
    fetchSearchIntentBatch(keywordStrings).catch((err: Error) => {
      log.warn(`[Radar] Search intent batch failed: ${err.message}`)
      return new Map<string, { intent: string; intentProbability: number }>()
    }),
  ])

  // Fetch PAA per keyword with concurrency limit
  const paaResults = new Map<string, { paaItems: PaaCacheEntry['paaItems']; fromCache: boolean }>()

  for (let i = 0; i < keywordStrings.length; i += PAA_CONCURRENCY) {
    const batch = keywordStrings.slice(i, i + PAA_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(kw => fetchPaaWithCache(kw, effectiveDepth)),
    )
    for (let j = 0; j < batch.length; j++) {
      const r = results[j]
      if (r.status === 'fulfilled') {
        paaResults.set(batch[j], r.value)
      } else {
        log.warn(`[Radar] PAA fetch failed for "${batch[j]}": ${(r.reason as Error).message}`)
        paaResults.set(batch[j], { paaItems: [], fromCache: false })
      }
    }
  }

  const cachedCount = Array.from(paaResults.values()).filter(r => r.fromCache).length
  log.info(`[Radar] PAA fetch done: ${paaResults.size} keywords (${cachedCount} cached, ${paaResults.size - cachedCount} fresh)`)

  // QW3 — Pain alignment: one batch of embeddings (painPoint vs keyword+reasoning)
  // Gracefully degrades if painPoint is absent/too short or if embedding fails.
  const painAlignmentMap = new Map<string, number>()
  if (hasPain) {
    const kwTexts = keywords.map(k =>
      k.reasoning?.trim() ? `${k.keyword} — ${k.reasoning}` : k.keyword,
    )
    try {
      const sims = await computeSemanticScores(painPointTrim, kwTexts)
      if (sims) {
        for (let i = 0; i < keywords.length; i++) {
          // sim is in [-1, 1] for normalized vectors but e5 stays mostly in [0, 1].
          // Clamp then map to 0-100.
          const s = Math.max(0, Math.min(1, sims[i]))
          painAlignmentMap.set(keywords[i].keyword, Math.round(s * 100))
        }
        log.info(`[Radar] Pain alignment computed for ${painAlignmentMap.size} keywords`)
      } else {
        log.warn(`[Radar] Pain alignment skipped: embeddings unavailable`)
      }
    } catch (err) {
      log.warn(`[Radar] Pain alignment failed: ${(err as Error).message}`)
    }
  }

  // Phase 2: Match resonance for autocomplete items
  const autoSuggestions = autocompleteResult.suggestions.map(s => ({
    text: s.text,
    query: s.query,
    position: s.position,
  }))
  log.debug(`[Radar] Autocomplete: ${autoSuggestions.length} suggestions for "${specificTopic}"`)

  // Étape 3B — moyenne embedding autocomplete × douleur (unique, partagée par toutes les cards)
  let autocompletePainAlignmentAvg: number | null = null
  if (hasPain && autoSuggestions.length > 0) {
    try {
      const texts = autoSuggestions.map(s => s.text)
      const sims = await computeSemanticScores(painPointTrim, texts)
      if (sims) {
        const avg = sims.reduce((a, b) => a + Math.max(0, Math.min(1, b)), 0) / sims.length
        autocompletePainAlignmentAvg = Math.round(avg * 100)
        log.info(`[Radar] Autocomplete pain alignment computed: avg=${autocompletePainAlignmentAvg}`)
      }
    } catch (err) {
      log.warn(`[Radar] Autocomplete pain alignment failed: ${(err as Error).message}`)
    }
  }

  // Étape 3A — stockage moyenne PAA × douleur par keyword (alimenté dans la boucle)
  const paaPainAlignmentByKw = new Map<string, number>()

  // Phase 3: Build cards
  const cards: RadarCard[] = []

  for (const kw of keywords) {
    const kwLower = kw.keyword.toLowerCase()
    const overview = overviewMap.get(kwLower)
    const intentData = intentMap.get(kwLower)
    const paaData = paaResults.get(kw.keyword) ?? { paaItems: [], fromCache: false }

    // Match PAA items against specificTopic with quality tracking
    const paaItems: RadarPaaItem[] = paaData.paaItems.map(p => {
      const qDetail = matchResonanceDetailed(p.question, topicWords)
      const aDetail = p.answer
        ? matchResonanceDetailed(p.answer, topicWords)
        : { match: 'none' as ResonanceMatch, quality: 'stem' as const }

      const match = bestMatch(qDetail.match, aDetail.match)
      // Use the quality of whichever side provided the best match
      const quality: RadarMatchQuality =
        qDetail.match === aDetail.match
          ? (qDetail.quality === 'exact' || aDetail.quality === 'exact' ? 'exact' : 'stem')
          : (bestMatch(qDetail.match, aDetail.match) === qDetail.match ? qDetail.quality : aDetail.quality)

      return {
        question: p.question,
        answer: p.answer,
        depth: p.depth,
        parentQuestion: p.parentQuestion,
        match,
        matchQuality: match !== 'none' ? quality : undefined,
      }
    })

    // Semantic scoring for PAA items
    if (paaItems.length > 0) {
      const paaTexts = paaItems.map(p =>
        p.answer ? `${p.question} ${p.answer}` : p.question,
      )
      const semanticScores = await computeSemanticScores(specificTopic, paaTexts)
      if (semanticScores) {
        for (let i = 0; i < paaItems.length; i++) {
          const score = Math.round(semanticScores[i] * 1000) / 1000
          paaItems[i].semanticScore = score
          // Upgrade match level based on semantic similarity (tagged as 'semantic' quality)
          if (paaItems[i].match === 'none' && score >= 0.5) {
            paaItems[i].match = 'partial'
            paaItems[i].matchQuality = 'semantic'
          } else if (paaItems[i].match === 'partial' && score >= 0.7) {
            paaItems[i].match = 'total'
            if (!paaItems[i].matchQuality || paaItems[i].matchQuality === 'semantic') {
              paaItems[i].matchQuality = 'semantic'
            }
          }
        }
      }

      // QW5 — PAA painAlignment (independant du match lexical)
      if (hasPain) {
        const painSims = await computeSemanticScores(painPointTrim, paaTexts)
        if (painSims) {
          for (let i = 0; i < paaItems.length; i++) {
            const s = painSims[i]
            if (s >= 0.6) paaItems[i].painAlignment = 'aligned'
            else if (s >= 0.35) paaItems[i].painAlignment = 'partial'
            else paaItems[i].painAlignment = 'off'
          }
          // Étape 3A : moyenne numérique pour alimenter computeCombinedScore
          const avg = painSims.reduce((a, b) => a + Math.max(0, Math.min(1, b)), 0) / painSims.length
          paaPainAlignmentByKw.set(kw.keyword, Math.round(avg * 100))
        }
      }
    }

    // Count autocomplete matches for this keyword's topic
    const autoMatchCount = autoSuggestions.filter(s =>
      matchResonance(s.text, extractTopicWords(kw.keyword)) !== 'none',
    ).length

    // Avg semantic score across PAA items that have it
    const semanticScores = paaItems.filter(p => p.semanticScore != null).map(p => p.semanticScore!)
    const avgSemanticScore = semanticScores.length > 0
      ? Math.round((semanticScores.reduce((a, b) => a + b, 0) / semanticScores.length) * 1000) / 1000
      : null

    const painAlignmentScore = painAlignmentMap.get(kw.keyword)

    const kpis: RadarKeywordKpis = {
      searchVolume: overview?.searchVolume ?? 0,
      difficulty: overview?.difficulty ?? 0,
      cpc: overview?.cpc ?? 0,
      competition: overview?.competition ?? 0,
      intentTypes: intentData ? mapIntentTypes(intentData.intent) : [],
      intentProbability: intentData?.intentProbability ?? null,
      autocompleteMatchCount: autoMatchCount,
      paaMatchCount: paaItems.filter(p => p.match !== 'none').length,
      paaWeightedScore: Math.round(computePaaWeightedScore(paaItems) * 100) / 100,
      paaTotal: paaItems.length,
      avgSemanticScore,
      painAlignmentScore,
    }

    // Étapes 3A/3B — enrichir avec les signaux "pertinence × douleur"
    const paaPainAvg = paaPainAlignmentByKw.get(kw.keyword)
    const scoreBreakdown = computeCombinedScore({
      ...kpis,
      paaPainAlignmentAvg: paaPainAvg,
      autocompletePainAlignmentAvg: autocompletePainAlignmentAvg ?? undefined,
    })
    log.debug(`[Radar] Card "${kw.keyword}": score=${scoreBreakdown.total}, PAA=${kpis.paaMatchCount}/${kpis.paaTotal}, vol=${kpis.searchVolume}, intent=${kpis.intentTypes.join(',') || 'unknown'}`)

    cards.push({
      keyword: kw.keyword,
      reasoning: kw.reasoning,
      kpis,
      paaItems,
      combinedScore: scoreBreakdown.total,
      scoreBreakdown,
      cachedPaa: paaData.fromCache,
    })
  }

  // Sort by combined score descending
  cards.sort((a, b) => b.combinedScore - a.combinedScore)

  // Global score = weighted average of top cards
  const globalScore = cards.length > 0
    ? Math.round(cards.reduce((sum, c) => sum + c.combinedScore, 0) / cards.length)
    : 0
  const heatLevel = getHeatLevel(globalScore)

  const result: KeywordRadarScanResult = {
    specificTopic,
    broadKeyword,
    autocomplete: {
      suggestions: autoSuggestions,
      totalCount: autocompleteResult.totalCount,
    },
    cards,
    globalScore,
    heatLevel,
    verdict: getVerdict(heatLevel),
    scannedAt: new Date().toISOString(),
  }

  log.info(`[Radar] Scan complete: ${cards.length} cards, global=${globalScore}, heat=${heatLevel}`)
  return result
}
