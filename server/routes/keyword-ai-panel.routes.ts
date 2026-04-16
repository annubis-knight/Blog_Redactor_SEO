import { Router } from 'express'
import { log } from '../utils/logger.js'
import { streamChatCompletion, USAGE_SENTINEL } from '../services/external/claude.service.js'
import type { ApiUsage } from '../services/external/claude.service.js'
import { loadPrompt } from '../utils/prompt-loader.js'
import { getCocoonExistingLieutenants } from '../services/infra/data.service.js'
import type { ProposeLieutenantsResult, FilteredProposeLieutenantsResult, LexiqueAnalysisResult } from '../../shared/types/serp-analysis.types.js'
import type { ArticleLevel } from '../../shared/types/keyword-validate.types.js'

const router = Router()

/** Consume the async generator, separating content chunks from the usage sentinel */
async function consumeStream(
  gen: AsyncGenerator<string>,
  onChunk: (chunk: string) => void,
): Promise<{ fullContent: string; usage: ApiUsage | null; chunkCount: number }> {
  const chunks: string[] = []
  let usage: ApiUsage | null = null
  let chunkCount = 0
  for await (const chunk of gen) {
    if (chunk.startsWith(USAGE_SENTINEL)) {
      usage = JSON.parse(chunk.slice(USAGE_SENTINEL.length)) as ApiUsage
    } else {
      chunkCount++
      chunks.push(chunk)
      onChunk(chunk)
    }
  }
  return { fullContent: chunks.join(''), usage, chunkCount }
}

/**
 * POST /keywords/:keyword/ai-panel
 * SSE streaming expert SEO analysis panel.
 * Body: { level, kpis, verdict }
 */
router.post('/keywords/:keyword/ai-panel', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { level, kpis, verdict, cocoonSlug } = req.body

  if (!keyword || !level) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword and level are required' } })
    return
  }

  log.info(`AI panel request for "${keyword}" (${level})`)

  try {
    const startTotal = Date.now()
    // Build KPI summary for prompt context
    const kpisSummary = Array.isArray(kpis)
      ? kpis.map((k: { name: string; color: string; label: string }) => `${k.name}: ${k.label} (${k.color})`).join(', ')
      : 'KPIs non disponibles'

    const verdictSummary = verdict
      ? `${verdict.level} (${verdict.greenCount}/${verdict.totalKpis} verts)`
      : 'Verdict non disponible'

    const systemPrompt = await loadPrompt('capitaine-ai-panel', {
      keyword,
      level,
      verdict: verdictSummary,
      kpis_summary: kpisSummary,
    }, cocoonSlug ? { cocoonSlug } : undefined)
    log.debug('ai-panel prompt built', { keyword, promptChars: systemPrompt.length })

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const startAi = Date.now()
    const { fullContent, usage, chunkCount } = await consumeStream(
      streamChatCompletion(systemPrompt, `Analyse le mot-clé "${keyword}" pour un article de niveau ${level}.`),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    log.info(`AI panel done for "${keyword}"`, { length: fullContent.length, chunkCount, aiMs: Date.now() - startAi, totalMs: Date.now() - startTotal })
    res.write(`event: done\ndata: ${JSON.stringify({ metadata: { keyword, level }, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération du panel IA'
    log.error(`AI panel failed for "${keyword}" — ${message}`, { keyword, level, cocoonSlug })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
    }
  }
})

/**
 * POST /keywords/:keyword/ai-hn-structure
 * SSE streaming Hn structure recommendation using selected Lieutenants.
 * Body: { lieutenants: string[], level: string, hnStructure: { level: number, text: string, count: number }[] }
 */
router.post('/keywords/:keyword/ai-hn-structure', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { lieutenants, level, hnStructure, cocoonSlug } = req.body

  if (!keyword || !level || !Array.isArray(lieutenants) || lieutenants.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword, level, and non-empty lieutenants are required' } })
    return
  }

  log.info(`AI Hn structure request for "${keyword}" (${level}, ${lieutenants.length} lieutenants)`)

  try {
    const startTotal = Date.now()
    const hnSummary = Array.isArray(hnStructure)
      ? hnStructure.map((h: { level: number; text: string; count: number }) => `H${h.level}: ${h.text} (${h.count}x)`).join('\n')
      : 'Aucune donnee de structure concurrente'

    const systemPrompt = await loadPrompt('lieutenants-hn-structure', {
      keyword,
      level,
      lieutenants: lieutenants.join(', '),
      hn_structure: hnSummary,
    }, cocoonSlug ? { cocoonSlug } : undefined)
    log.debug('hn-structure prompt built', { keyword, promptChars: systemPrompt.length, hnEntries: Array.isArray(hnStructure) ? hnStructure.length : 0 })

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const userPrompt = `Recommande une structure Hn pour un article "${keyword}" de niveau ${level} utilisant ces Lieutenants: ${lieutenants.join(', ')}`

    const startAi = Date.now()
    const { fullContent, usage, chunkCount } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    log.info(`AI Hn structure done for "${keyword}"`, { length: fullContent.length, chunkCount, aiMs: Date.now() - startAi, totalMs: Date.now() - startTotal })
    res.write(`event: done\ndata: ${JSON.stringify({ metadata: { keyword, level }, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération de la structure Hn'
    log.error(`AI Hn structure failed for "${keyword}" — ${message}`, { keyword, level, lieutenantCount: lieutenants.length, cocoonSlug })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
    }
  }
})

/** Attempt to repair truncated JSON by closing open brackets/braces */
function repairTruncatedJson(json: string): string {
  let repaired = json.trim()
  // Remove trailing comma before we close
  repaired = repaired.replace(/,\s*$/, '')
  // Remove incomplete key-value pair at the end (e.g. `"key": "incomplete...`)
  repaired = repaired.replace(/,?\s*"[^"]*":\s*"[^"]*$/, '')
  // Remove trailing incomplete object using brace-depth awareness:
  // walk backwards to find the last point where all nested braces are balanced
  repaired = trimIncompleteTrailingObject(repaired)

  // Count open/close brackets and braces
  let openBraces = 0, openBrackets = 0
  let inString = false, escape = false
  for (const ch of repaired) {
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') openBraces++
    else if (ch === '}') openBraces--
    else if (ch === '[') openBrackets++
    else if (ch === ']') openBrackets--
  }

  // Close any unclosed string
  if (inString) repaired += '"'
  // Close remaining brackets/braces (clamp negatives to 0)
  openBrackets = Math.max(0, openBrackets)
  openBraces = Math.max(0, openBraces)
  while (openBrackets > 0) { repaired += ']'; openBrackets-- }
  while (openBraces > 0) { repaired += '}'; openBraces-- }

  return repaired
}

/** Trim an incomplete trailing object from JSON arrays by tracking brace depth */
function trimIncompleteTrailingObject(json: string): string {
  // Find last comma at depth 1 (array level) — everything after is potentially incomplete
  let depth = 0, inStr = false, esc = false, lastCommaAtDepth1 = -1
  for (let i = 0; i < json.length; i++) {
    const ch = json[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') depth--
    else if (ch === ',' && depth === 1) lastCommaAtDepth1 = i
  }
  // If depth ended > 1 and we have a comma at array-level, trim the incomplete trailing element
  if (depth > 1 && lastCommaAtDepth1 > 0) {
    return json.slice(0, lastCommaAtDepth1)
  }
  return json
}

/** Extract balanced JSON object from text — finds first '{' and its matching '}' */
function extractBalancedJson(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null // unbalanced
}

/** Parse JSON from AI output — try direct parse, regex fallback, then truncation repair */
function parseAiJson<T>(content: string): T {
  // 1. Direct parse
  try {
    const result = JSON.parse(content) as T
    log.debug('parseAiJson: direct parse succeeded', { contentChars: content.length })
    return result
  } catch (err) { /* continue */ }

  // 2. Extract JSON block using balanced brace matching (avoids greedy regex issues)
  const extracted = extractBalancedJson(content)
  if (extracted) {
    try {
      const result = JSON.parse(extracted) as T
      log.debug('parseAiJson: balanced extraction succeeded', { extractedChars: extracted.length, originalChars: content.length })
      return result
    } catch (err) { /* continue */ }
  }

  // 3. Repair truncated JSON (AI hit maxTokens)
  const jsonStart = content.indexOf('{')
  if (jsonStart >= 0) {
    const truncated = content.slice(jsonStart)
    const repaired = repairTruncatedJson(truncated)
    log.warn(`parseAiJson: repairing truncated JSON (${truncated.length} → ${repaired.length} chars)`)
    try {
      const result = JSON.parse(repaired) as T
      log.info('parseAiJson: repaired JSON parse succeeded', { repairedChars: repaired.length })
      return result
    } catch (err) {
      log.error('parseAiJson: repaired JSON parse failed', { error: (err as Error).message, repairedChars: repaired.length })
    }
  }

  log.error('parseAiJson: no valid JSON found', { contentChars: content.length, contentPreview: content.slice(0, 200) })
  throw new Error('No valid JSON found in AI response')
}

/** Max selected lieutenants per article level (post-AI filtering) */
const MAX_SELECTED: Record<ArticleLevel, number> = {
  pilier: 5,
  intermediaire: 5,
  specifique: 4,
}

/** Filter AI-generated lieutenants: sort by score desc, split into selected + eliminated */
function filterLieutenants(parsed: ProposeLieutenantsResult, level: ArticleLevel): FilteredProposeLieutenantsResult {
  const maxKeep = MAX_SELECTED[level] ?? 5
  const sorted = [...parsed.lieutenants].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return {
    selectedLieutenants: sorted.slice(0, maxKeep),
    eliminatedLieutenants: sorted.slice(maxKeep),
    hnStructure: parsed.hnStructure,
    contentGapInsights: parsed.contentGapInsights,
    totalGenerated: parsed.lieutenants.length,
  }
}

/**
 * POST /keywords/:keyword/propose-lieutenants
 * SSE streaming AI lieutenant proposal.
 * Body: { level, articleId, serpHeadings: { level, text, count }[], paaQuestions: { question, answer? }[], wordGroups?: string[], rootKeywords?: string[] }
 */
router.post('/keywords/:keyword/propose-lieutenants', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { level, articleId, serpHeadings, paaQuestions, wordGroups, rootKeywords, serpCompetitors, rootKeywordsSerpData, cocoonSlug } = req.body

  const VALID_LEVELS: ArticleLevel[] = ['pilier', 'intermediaire', 'specifique']
  if (!keyword || !level || !articleId) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword, level, and articleId are required' } })
    return
  }
  if (!VALID_LEVELS.includes(level as ArticleLevel)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `level must be one of: ${VALID_LEVELS.join(', ')}` } })
    return
  }

  log.info(`AI propose-lieutenants request for "${keyword}" (${level})`, {
    serpHeadings: Array.isArray(serpHeadings) ? serpHeadings.length : 0,
    paaQuestions: Array.isArray(paaQuestions) ? paaQuestions.length : 0,
    wordGroups: Array.isArray(wordGroups) ? wordGroups.length : 0,
    rootKeywords: Array.isArray(rootKeywords) ? rootKeywords.length : 0,
    serpCompetitors: Array.isArray(serpCompetitors) ? serpCompetitors.length : 0,
  })

  try {
    const startTotal = Date.now()
    // Anti-cannibalization: get lieutenants already assigned to sibling articles
    const existingLieutenants = await getCocoonExistingLieutenants(articleId)
    log.debug('existing lieutenants loaded', { articleId, count: existingLieutenants.length })

    const validPaa = Array.isArray(paaQuestions)
      ? paaQuestions.filter((q: { question: string }) => q.question?.trim())
      : []
    const paaFormatted = validPaa.length > 0
      ? validPaa.map((q: { question: string; answer?: string }) => `- ${q.question}${q.answer ? ` → ${q.answer}` : ''}`).join('\n')
      : 'Aucune PAA disponible pour cette requête.'

    const hnFormatted = Array.isArray(serpHeadings) && serpHeadings.length > 0
      ? serpHeadings.map((h: { level: number; text: string; count: number; percent?: number }) =>
          `H${h.level}: "${h.text}" (${h.count}x${h.percent ? `, ${h.percent}%` : ''})`
        ).join('\n')
      : 'Aucun heading avec récurrence significative parmi les concurrents (headings tous différents).'

    // Format competitor list for context (captain only)
    const competitorsFormatted = Array.isArray(serpCompetitors) && serpCompetitors.length > 0
      ? serpCompetitors.map((c: { domain: string; title: string; position: number }) =>
          `#${c.position} ${c.domain} — "${c.title}"`
        ).join('\n')
      : 'Aucune donnée concurrents disponible.'

    // Format root keywords SERP data (separate, lower weight)
    let rootSerpFormatted = 'Aucune donnée SERP de mots-clés racine disponible.'
    if (Array.isArray(rootKeywordsSerpData) && rootKeywordsSerpData.length > 0) {
      rootSerpFormatted = rootKeywordsSerpData.map((rk: {
        keyword: string
        competitors: { domain: string; title: string; position: number }[]
        hnRecurrence: { level: number; text: string; count: number; percent: number }[]
        paaQuestions: { question: string; answer?: string }[]
      }) => {
        const comps = rk.competitors.length > 0
          ? rk.competitors.map(c => `  #${c.position} ${c.domain} — "${c.title}"`).join('\n')
          : '  (aucun concurrent)'
        const hns = rk.hnRecurrence.length > 0
          ? rk.hnRecurrence.map(h => `  H${h.level}: "${h.text}" (${h.count}x, ${h.percent}%)`).join('\n')
          : '  (aucun heading récurrent)'
        const paas = rk.paaQuestions.length > 0
          ? rk.paaQuestions.map(q => `  - ${q.question}${q.answer ? ` → ${q.answer}` : ''}`).join('\n')
          : '  (aucune PAA)'
        return `#### "${rk.keyword}"\nConcurrents:\n${comps}\nHeadings récurrents:\n${hns}\nPAA:\n${paas}`
      }).join('\n\n')
    }

    const startPrompt = Date.now()
    const systemPrompt = await loadPrompt('propose-lieutenants', {
      keyword,
      level,
      paa_questions: paaFormatted,
      hn_recurrence: hnFormatted,
      serp_competitors: competitorsFormatted,
      root_keywords_serp_data: rootSerpFormatted,
      word_groups: Array.isArray(wordGroups) && wordGroups.length > 0 ? wordGroups.join(', ') : 'Aucun groupe disponible',
      root_keywords: Array.isArray(rootKeywords) && rootKeywords.length > 0 ? rootKeywords.join(', ') : 'Aucune racine disponible',
      existing_lieutenants: existingLieutenants.length > 0 ? existingLieutenants.join(', ') : 'Aucun (premier article du cocon)',
    }, cocoonSlug ? { cocoonSlug } : undefined)
    log.debug('propose-lieutenants prompt built', { keyword, promptChars: systemPrompt.length, ms: Date.now() - startPrompt })

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const userPrompt = `Propose les meilleurs lieutenants pour l'article "${keyword}" de niveau ${level}. Analyse toutes les données fournies et retourne le JSON structuré.`

    const startAi = Date.now()
    let chunkCount = 0
    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 8192),
      (chunk) => {
        chunkCount++
        res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk, chunkIndex: chunkCount })}\n\n`)
      },
    )
    log.debug('propose-lieutenants stream complete', { keyword, chunkCount, contentChars: fullContent.length, aiMs: Date.now() - startAi })

    const parsed = parseAiJson<ProposeLieutenantsResult>(fullContent)
    if (!Array.isArray(parsed.lieutenants)) {
      throw new Error('AI response missing lieutenants array')
    }
    const filtered = filterLieutenants(parsed, level as ArticleLevel)

    log.info(`AI propose-lieutenants done for "${keyword}"`, {
      totalGenerated: filtered.totalGenerated,
      selected: filtered.selectedLieutenants.length,
      eliminated: filtered.eliminatedLieutenants.length,
      totalMs: Date.now() - startTotal,
    })
    res.write(`event: done\ndata: ${JSON.stringify({ outline: filtered, metadata: { keyword, level }, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la proposition de lieutenants IA'
    log.error(`AI propose-lieutenants failed for "${keyword}" — ${message}`, { keyword, level, articleId, cocoonSlug })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
    }
  }
})

/**
 * POST /keywords/:keyword/ai-lexique
 * SSE streaming lexical analysis panel for TF-IDF results.
 * Body: { level, lexiqueTerms: { obligatoire?: string[], differenciateur?: string[], optionnel?: string[] }, cocoonSlug? }
 */
router.post('/keywords/:keyword/ai-lexique', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { level, lexiqueTerms, cocoonSlug } = req.body

  if (!keyword || !level) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword and level are required' } })
    return
  }

  const hasTerms = lexiqueTerms &&
    ((lexiqueTerms.obligatoire?.length ?? 0) + (lexiqueTerms.differenciateur?.length ?? 0) + (lexiqueTerms.optionnel?.length ?? 0)) > 0

  if (!hasTerms) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'lexiqueTerms must contain at least one term' } })
    return
  }

  const termCounts = {
    obligatoire: lexiqueTerms.obligatoire?.length ?? 0,
    differenciateur: lexiqueTerms.differenciateur?.length ?? 0,
    optionnel: lexiqueTerms.optionnel?.length ?? 0,
  }
  log.info(`AI lexique analysis request for "${keyword}" (${level})`, termCounts)

  try {
    const startTotal = Date.now()
    const systemPrompt = await loadPrompt('lexique-ai-panel', {
      keyword,
      level,
      obligatoire_terms: lexiqueTerms.obligatoire?.join(', ') || 'aucun',
      differenciateur_terms: lexiqueTerms.differenciateur?.join(', ') || 'aucun',
      optionnel_terms: lexiqueTerms.optionnel?.join(', ') || 'aucun',
    }, cocoonSlug ? { cocoonSlug } : undefined)
    log.debug('lexique prompt built', { keyword, promptChars: systemPrompt.length })

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const userPrompt = `Analyse le champ lexical extrait pour l'article "${keyword}" de niveau ${level}.`

    const startAi = Date.now()
    const { fullContent, usage, chunkCount } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    log.info(`AI lexique analysis done for "${keyword}"`, { length: fullContent.length, chunkCount, aiMs: Date.now() - startAi, totalMs: Date.now() - startTotal })
    res.write(`event: done\ndata: ${JSON.stringify({ metadata: { keyword, level }, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse lexicale IA'
    log.error(`AI lexique analysis failed for "${keyword}" — ${message}`, { keyword, level, cocoonSlug })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
    }
  }
})

/**
 * POST /keywords/:keyword/ai-lexique-upfront
 * SSE streaming upfront lexical analysis — IA recommends per-term before user selection.
 * Body: { level, allTerms: { obligatoire: string[], differenciateur: string[], optionnel: string[] }, cocoonSlug? }
 */
router.post('/keywords/:keyword/ai-lexique-upfront', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { level, allTerms, cocoonSlug } = req.body

  if (!keyword || !level) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword and level are required' } })
    return
  }

  const hasTerms = allTerms &&
    ((allTerms.obligatoire?.length ?? 0) + (allTerms.differenciateur?.length ?? 0) + (allTerms.optionnel?.length ?? 0)) > 0

  if (!hasTerms) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'allTerms must contain at least one term' } })
    return
  }

  const termCounts = {
    obligatoire: allTerms.obligatoire?.length ?? 0,
    differenciateur: allTerms.differenciateur?.length ?? 0,
    optionnel: allTerms.optionnel?.length ?? 0,
  }
  const totalTerms = termCounts.obligatoire + termCounts.differenciateur + termCounts.optionnel
  log.info(`AI lexique upfront request for "${keyword}" (${level})`, { ...termCounts, totalTerms })

  try {
    const startTotal = Date.now()
    const systemPrompt = await loadPrompt('lexique-analysis-upfront', {
      keyword,
      level,
      obligatoire_terms: allTerms.obligatoire?.join(', ') || 'aucun',
      differenciateur_terms: allTerms.differenciateur?.join(', ') || 'aucun',
      optionnel_terms: allTerms.optionnel?.join(', ') || 'aucun',
    }, cocoonSlug ? { cocoonSlug } : undefined)
    log.debug('lexique-upfront prompt built', { keyword, promptChars: systemPrompt.length })

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const userPrompt = `Analyse tous les termes TF-IDF pour l'article "${keyword}" de niveau ${level}. Recommande ou exclue chaque terme avec une raison. Retourne le JSON structuré.`

    // Scale maxTokens to term count: ~80 tokens/term for JSON object + structure overhead
    const maxTokens = Math.max(4096, Math.min(16384, totalTerms * 80 + 512))
    log.debug('lexique-upfront maxTokens', { totalTerms, maxTokens })

    const startAi = Date.now()
    const { fullContent, usage, chunkCount } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, maxTokens),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )
    log.debug('lexique-upfront stream complete', { keyword, chunkCount, contentChars: fullContent.length, aiMs: Date.now() - startAi })

    const parsed = parseAiJson<LexiqueAnalysisResult>(fullContent)

    const recommendedCount = parsed.recommendations.filter(r => r.aiRecommended).length
    log.info(`AI lexique upfront done for "${keyword}"`, {
      recommendations: parsed.recommendations.length,
      recommended: recommendedCount,
      excluded: parsed.recommendations.length - recommendedCount,
      expectedTerms: totalTerms,
      totalMs: Date.now() - startTotal,
    })
    res.write(`event: done\ndata: ${JSON.stringify({ outline: parsed, metadata: { keyword, level }, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse lexicale IA upfront'
    log.error(`AI lexique upfront failed for "${keyword}" — ${message}`, { keyword, level, totalTerms, cocoonSlug })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
    }
  }
})

export default router
