import Anthropic from '@anthropic-ai/sdk'
import { log } from '../utils/logger.js'
import { loadPrompt } from '../utils/prompt-loader.js'
import { fetchKeywordOverviewBatch, fetchSearchIntentBatch } from './dataforseo.service.js'
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
} from './intent-scan.service.js'
import { readPaaCache, writePaaCache } from './paa-cache.service.js'
import { computeSemanticScores } from './embedding.service.js'
import { computeCombinedScore } from '../../shared/scoring.js'
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
} from '../../shared/types/intent.types.js'
import type { KeywordOverview } from '../../shared/types/index.js'

// --- Phase 1: Generate keywords via Haiku ---

export async function generateRadarKeywords(
  title: string,
  keyword: string,
  painPoint: string,
  cocoonSlug?: string,
): Promise<KeywordRadarGenerateResult> {
  const prompt = await loadPrompt('intent-keywords', { title, keyword, painPoint }, cocoonSlug ? { cocoonSlug } : undefined)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const model = process.env.HAIKU_MODEL || 'claude-haiku-4-5-20251001'

  log.info(`[Radar] Generating keywords via ${model} for "${keyword}"`)

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: 'Tu es un expert SEO. Réponds UNIQUEMENT en JSON valide, sans markdown ni commentaires.',
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  log.debug(`[Radar] Haiku raw response length: ${text.length} chars`)

  let keywords: RadarKeyword[] = []
  try {
    const parsed = JSON.parse(cleaned)
    keywords = (parsed.keywords ?? []).map((k: { keyword?: string; reasoning?: string }) => ({
      keyword: (k.keyword ?? '').trim(),
      reasoning: (k.reasoning ?? '').trim(),
    })).filter((k: RadarKeyword) => k.keyword.length > 0)
    log.debug(`[Radar] Parsed ${keywords.length} keywords from Haiku response`)
  } catch (err) {
    log.warn(`[Radar] Failed to parse Haiku response: ${(err as Error).message}`)
    log.debug(`[Radar] Raw cleaned text: ${cleaned.slice(0, 200)}...`)
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
  const result: KeywordRadarGenerateResult = {
    articleTitle: title,
    articleKeyword: keyword,
    painPoint,
    keywords: unique.slice(0, 25),
    generatedAt: new Date().toISOString(),
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
): Promise<KeywordRadarScanResult> {
  const effectiveDepth = Math.min(Math.max(depth, 1), 2)
  const keywordStrings = keywords.map(k => k.keyword)
  const topicWords = extractTopicWords(specificTopic)

  log.info(`[Radar] Scanning ${keywords.length} keywords, depth=${effectiveDepth}`)

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

  // Phase 2: Match resonance for autocomplete items
  const autoSuggestions = autocompleteResult.suggestions.map(s => ({
    text: s.text,
    query: s.query,
    position: s.position,
  }))
  log.debug(`[Radar] Autocomplete: ${autoSuggestions.length} suggestions for "${specificTopic}"`)

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
    }

    const scoreBreakdown = computeCombinedScore(kpis)
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
