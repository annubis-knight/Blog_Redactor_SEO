import { Router } from 'express'
import { log } from '../utils/logger.js'
import { runAiPanelStream } from '../services/external/ai-panel-runner.service.js'
import { parseAiJson } from '../utils/ai-json-parser.js'
import { loadPrompt } from '../utils/prompt-loader.js'
import { getCocoonExistingLieutenants, saveLieutenantExplorations } from '../services/infra/data.service.js'
import { getArticlePainPoint, PAIN_POINT_FALLBACK } from '../services/queries/article-pain-point.service.js'
import type { RichLieutenant } from '../../shared/types/keyword.types.js'
import type { ProposeLieutenantsResult, FilteredProposeLieutenantsResult, LexiqueAnalysisResult } from '../../shared/types/serp-analysis.types.js'
import type { ArticleLevel } from '../../shared/types/keyword-validate.types.js'
import { compareScores } from '../../shared/score/index.js'

/**
 * Sprint E (2026-05-02) — Routes Panels IA refactorisées via
 * `runAiPanelStream`. Chaque handler ne fait plus que :
 *   1. valider l'input (Zod-light)
 *   2. charger les variables (painPoint, contextes)
 *   3. composer le prompt via `loadPrompt`
 *   4. déléguer au runner (SSE + stream + done + error)
 *
 * Les contrats de réponse SSE sont préservés à l'identique (events `chunk`,
 * `done`, `error` avec mêmes payloads).
 */

/**
 * Formate un score (number ou objet `{ total, verdict }`) pour l'injection dans un prompt.
 * Tolérant : retourne `(non disponible)` si le score n'est pas exploitable.
 */
function formatScoreForPrompt(score: unknown): string {
  if (score == null) return '(non disponible)'
  if (typeof score === 'number') return `${Math.round(score)}/100`
  if (typeof score === 'object' && score !== null && 'total' in score) {
    const obj = score as { total?: number; verdict?: string }
    if (typeof obj.total === 'number') {
      return obj.verdict ? `${obj.total}/100 (${obj.verdict})` : `${obj.total}/100`
    }
  }
  return '(non disponible)'
}

const router = Router()

/**
 * POST /keywords/:keyword/ai-panel
 * SSE streaming expert SEO analysis panel.
 * Body: { level, articleId?, marketScore?, relevanceScore?, cocoonSlug? }
 */
router.post('/keywords/:keyword/ai-panel', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { level, articleId, marketScore, relevanceScore, cocoonSlug } = req.body

  if (!keyword || !level) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword and level are required' } })
    return
  }

  log.info(`AI panel request for "${keyword}" (${level})`)

  const painPoint = await getArticlePainPoint(articleId)
  const systemPrompt = await loadPrompt('capitaine-ai-panel', {
    keyword,
    level,
    painPoint,
    marketScore: formatScoreForPrompt(marketScore),
    relevanceScore: formatScoreForPrompt(relevanceScore),
  }, cocoonSlug ? { cocoonSlug } : undefined)
  log.debug('ai-panel prompt built', { keyword, promptChars: systemPrompt.length, hasPainPoint: painPoint !== PAIN_POINT_FALLBACK })

  await runAiPanelStream({
    req,
    res,
    keyword,
    level,
    systemPrompt,
    userPrompt: `Analyse le mot-clé "${keyword}" pour un article de niveau ${level}.`,
    logTag: 'ai-panel',
    buildDonePayload: (_parsed, usage) => ({ metadata: { keyword, level }, usage }),
  })
})

/**
 * POST /keywords/:keyword/ai-hn-structure
 * SSE streaming Hn structure recommendation using selected Lieutenants.
 * Body: { lieutenants: string[], level: string, hnStructure: { level: number, text: string, count: number }[] }
 */
router.post('/keywords/:keyword/ai-hn-structure', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { lieutenants, level, hnStructure, articleId, cocoonSlug } = req.body

  if (!keyword || !level || !Array.isArray(lieutenants) || lieutenants.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword, level, and non-empty lieutenants are required' } })
    return
  }

  log.info(`AI Hn structure request for "${keyword}" (${level}, ${lieutenants.length} lieutenants)`)

  const hnSummary = Array.isArray(hnStructure)
    ? hnStructure.map((h: { level: number; text: string; count: number }) => `H${h.level}: ${h.text} (${h.count}x)`).join('\n')
    : 'Aucune donnee de structure concurrente'

  const painPoint = await getArticlePainPoint(articleId)
  const systemPrompt = await loadPrompt('lieutenants-hn-structure', {
    keyword,
    level,
    painPoint,
    lieutenants: lieutenants.join(', '),
    hn_structure: hnSummary,
  }, cocoonSlug ? { cocoonSlug } : undefined)
  log.debug('hn-structure prompt built', { keyword, promptChars: systemPrompt.length, hnEntries: Array.isArray(hnStructure) ? hnStructure.length : 0, hasPainPoint: painPoint !== PAIN_POINT_FALLBACK })

  const userPrompt = `Recommande une structure Hn pour un article "${keyword}" de niveau ${level} utilisant ces Lieutenants: ${lieutenants.join(', ')}`

  await runAiPanelStream({
    req,
    res,
    keyword,
    level,
    systemPrompt,
    userPrompt,
    logTag: 'ai-hn-structure',
    buildDonePayload: (_parsed, usage) => ({ metadata: { keyword, level }, usage }),
  })
})

/** Max selected lieutenants per article level (post-AI filtering) */
const MAX_SELECTED: Record<ArticleLevel, number> = {
  pilier: 5,
  intermediaire: 5,
  specifique: 4,
}

/** Filter AI-generated lieutenants: sort by score desc, split into selected + eliminated */
function filterLieutenants(parsed: ProposeLieutenantsResult, level: ArticleLevel): FilteredProposeLieutenantsResult {
  const maxKeep = MAX_SELECTED[level] ?? 5
  // null en bas — cohérent avec affichage (CLAUDE.md §2.0)
  const sorted = [...parsed.lieutenants].sort((a, b) => compareScores(a.score ?? null, b.score ?? null))

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

  const competitorsFormatted = Array.isArray(serpCompetitors) && serpCompetitors.length > 0
    ? serpCompetitors.map((c: { domain: string; title: string; position: number }) =>
        `#${c.position} ${c.domain} — "${c.title}"`
      ).join('\n')
    : 'Aucune donnée concurrents disponible.'

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

  const painPoint = await getArticlePainPoint(articleId)
  const systemPrompt = await loadPrompt('propose-lieutenants', {
    keyword,
    level,
    painPoint,
    paa_questions: paaFormatted,
    hn_recurrence: hnFormatted,
    serp_competitors: competitorsFormatted,
    root_keywords_serp_data: rootSerpFormatted,
    word_groups: Array.isArray(wordGroups) && wordGroups.length > 0 ? wordGroups.join(', ') : 'Aucun groupe disponible',
    root_keywords: Array.isArray(rootKeywords) && rootKeywords.length > 0 ? rootKeywords.join(', ') : 'Aucune racine disponible',
    existing_lieutenants: existingLieutenants.length > 0 ? existingLieutenants.join(', ') : 'Aucun (premier article du cocon)',
  }, cocoonSlug ? { cocoonSlug } : undefined)
  log.debug('propose-lieutenants prompt built', { keyword, promptChars: systemPrompt.length, hasPainPoint: painPoint !== PAIN_POINT_FALLBACK })

  const userPrompt = `Propose les meilleurs lieutenants pour l'article "${keyword}" de niveau ${level}. Analyse toutes les données fournies et retourne le JSON structuré.`

  await runAiPanelStream<FilteredProposeLieutenantsResult>({
    req,
    res,
    keyword,
    level,
    systemPrompt,
    userPrompt,
    maxTokens: 8192,
    logTag: 'propose-lieutenants',
    parser: (fullContent) => {
      const parsed = parseAiJson<ProposeLieutenantsResult>(fullContent)
      if (!Array.isArray(parsed.lieutenants)) {
        throw new Error('AI response missing lieutenants array')
      }
      return filterLieutenants(parsed, level as ArticleLevel)
    },
    onSuccess: async (filtered) => {
      if (!filtered) return
      // E2 — Persist server-side BEFORE notifying the client. Survit aux
      // déconnexions client après stream.
      const dbEntries: Pick<RichLieutenant, 'keyword' | 'status' | 'reasoning' | 'sources' | 'suggestedHnLevel' | 'score' | 'kpis' | 'lockedAt'>[] = [
        ...filtered.selectedLieutenants.map(lt => ({
          keyword: lt.keyword,
          status: 'suggested' as const,
          reasoning: lt.reasoning,
          sources: lt.sources,
          suggestedHnLevel: lt.suggestedHnLevel,
          score: lt.score,
          kpis: null,
          lockedAt: null,
        })),
        ...filtered.eliminatedLieutenants.map(lt => ({
          keyword: lt.keyword,
          status: 'eliminated' as const,
          reasoning: lt.reasoning,
          sources: lt.sources,
          suggestedHnLevel: lt.suggestedHnLevel,
          score: lt.score,
          kpis: null,
          lockedAt: null,
        })),
      ]
      await saveLieutenantExplorations(Number(articleId), dbEntries as RichLieutenant[], keyword)
      log.debug(`propose-lieutenants DB persist done`, { articleId, count: dbEntries.length })
    },
    buildDonePayload: (filtered, usage) => ({
      outline: filtered,
      metadata: { keyword, level },
      usage,
    }),
  })
})

/**
 * POST /keywords/:keyword/ai-lexique
 * SSE streaming lexical analysis panel for TF-IDF results.
 */
router.post('/keywords/:keyword/ai-lexique', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { level, lexiqueTerms, articleId, cocoonSlug } = req.body

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

  const painPoint = await getArticlePainPoint(articleId)
  const systemPrompt = await loadPrompt('lexique-ai-panel', {
    keyword,
    level,
    painPoint,
    obligatoire_terms: lexiqueTerms.obligatoire?.join(', ') || 'aucun',
    differenciateur_terms: lexiqueTerms.differenciateur?.join(', ') || 'aucun',
    optionnel_terms: lexiqueTerms.optionnel?.join(', ') || 'aucun',
  }, cocoonSlug ? { cocoonSlug } : undefined)
  log.debug('lexique prompt built', { keyword, promptChars: systemPrompt.length, hasPainPoint: painPoint !== PAIN_POINT_FALLBACK })

  const userPrompt = `Analyse le champ lexical extrait pour l'article "${keyword}" de niveau ${level}.`

  await runAiPanelStream({
    req,
    res,
    keyword,
    level,
    systemPrompt,
    userPrompt,
    logTag: 'ai-lexique',
    buildDonePayload: (_parsed, usage) => ({ metadata: { keyword, level }, usage }),
  })
})

/**
 * POST /keywords/:keyword/ai-lexique-upfront
 * SSE streaming upfront lexical analysis — IA recommends per-term before user selection.
 */
router.post('/keywords/:keyword/ai-lexique-upfront', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { level, allTerms, cocoonSlug, articleId } = req.body

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

  const painPoint = await getArticlePainPoint(articleId)
  const systemPrompt = await loadPrompt('lexique-analysis-upfront', {
    keyword,
    level,
    painPoint,
    obligatoire_terms: allTerms.obligatoire?.join(', ') || 'aucun',
    differenciateur_terms: allTerms.differenciateur?.join(', ') || 'aucun',
    optionnel_terms: allTerms.optionnel?.join(', ') || 'aucun',
  }, cocoonSlug ? { cocoonSlug } : undefined)
  log.debug('lexique-upfront prompt built', { keyword, promptChars: systemPrompt.length, hasPainPoint: painPoint !== PAIN_POINT_FALLBACK })

  const userPrompt = `Analyse tous les termes TF-IDF pour l'article "${keyword}" de niveau ${level}. Recommande ou exclue chaque terme avec une raison. Retourne le JSON structuré.`

  // Scale maxTokens to term count: ~80 tokens/term for JSON object + structure overhead
  const maxTokens = Math.max(4096, Math.min(16384, totalTerms * 80 + 512))
  log.debug('lexique-upfront maxTokens', { totalTerms, maxTokens })

  await runAiPanelStream<LexiqueAnalysisResult>({
    req,
    res,
    keyword,
    level,
    systemPrompt,
    userPrompt,
    maxTokens,
    logTag: 'ai-lexique-upfront',
    parser: (fullContent) => parseAiJson<LexiqueAnalysisResult>(fullContent),
    onSuccess: async (parsed) => {
      if (!parsed) return
      const recommendedCount = parsed.recommendations.filter(r => r.aiRecommended).length
      log.info(`AI lexique upfront analysis`, {
        recommendations: parsed.recommendations.length,
        recommended: recommendedCount,
        excluded: parsed.recommendations.length - recommendedCount,
      })
      // Sprint 11 — persist IA recommendations in lexique_explorations BEFORE done.
      const articleIdNum = Number(articleId)
      if (Number.isInteger(articleIdNum) && articleIdNum > 0) {
        const { saveLexiqueAi } = await import('../services/keyword/lexique-exploration.service.js')
        await saveLexiqueAi(articleIdNum, keyword, parsed)
      }
    },
    buildDonePayload: (parsed, usage) => ({
      outline: parsed,
      metadata: { keyword, level },
      usage,
    }),
  })
})

export default router
