/**
 * POST /api/generate/article-draft — le premier jet, en UN seul appel
 * (FR-RED-DRAFT-SINGLE-PASS, FR-RED-DRAFT-TO-SOURCE).
 *
 * Il remplace la rédaction section par section : 15 appels sans mémoire pour le
 * pilier 1013 (15 601 mots pour 2 500 visés, une conclusion par section). Ici,
 * tout le plan, les budgets par chapitre, la stratégie et les mots-clés partent
 * une seule fois, sans recherche web : un chiffre à sourcer est posé dans un
 * marqueur `<mark data-a-sourcer>`.
 *
 * Le flux garde les événements de l'ancienne route (`section-start`, `chunk`,
 * `section-done`, `done`, `error`) : le serveur repère les `<h2>` au fil du
 * texte, l'écran et la sauvegarde au fil ne changent pas. Une coupure au plafond
 * de jetons déclenche une continuation (2 au plus) à partir du chapitre coupé.
 */
import { Router, type Response } from 'express'
import { log } from '../../utils/logger.js'
import { generateArticleDraftRequestSchema } from '../../../shared/schemas/generate.schema.js'
import { streamChatCompletion } from '../../services/external/ai-provider.service.js'
import type { ApiUsage } from '../../services/external/claude.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { getStrategy } from '../../services/strategy/strategy.service.js'
import { getCocoonStrategy } from '../../services/strategy/cocoon-strategy.service.js'
import { getArticleKeywords, loadArticleMicroContext, retainTargetWordCount } from '../../services/infra/data.service.js'
import type { Outline } from '../../../shared/types/index.js'
import { mergeConsecutiveElements } from '../../../shared/html-utils.js'
import { stripAiPreamble } from '../../../shared/ai-text.js'
import { stripOrphanBlockText, trimTruncatedBlocks } from '../../../shared/content-repair.js'
import { targetWordsFor, describeTypeRules, ARTICLE_TYPE_RULES } from '../../../shared/constants/article-type-rules.js'
import { sectionBudgets } from '../../../shared/section-budget.js'
import { createH2Tracker, type ChapterEvent } from '../../../shared/html-stream.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'
import {
  aggregateUsage,
  buildKeywordContext,
  buildMicroContextBlock,
  consumeStream,
  describeModelsUsed,
  pickStrategyContext,
  repairHtmlTail,
  splitOutlineIntoGroups,
  stripCodeFences,
  type SectionGroup,
} from './_helpers.js'

const router = Router()

/** Continuations au plus après une coupure au plafond de jetons. */
export const MAX_DRAFT_CONTINUATIONS = 2

/** Plafond de jetons : ~2,2 jetons par mot (français + balises), borné. */
export function draftMaxTokens(targetWords: number): number {
  return Math.min(16000, Math.max(8000, Math.ceil(targetWords * 2.2)))
}

/** Plan envoyé au prompt : chaque H2 avec son budget, puis ses H3 (annotations comprises). */
export function formatDraftPlan(groups: SectionGroup[], targetWords: number): string {
  const budgets = sectionBudgets(groups.length, targetWords)
  const annotation = (a: string | null | undefined) => (a ? ` [annotation: ${a}]` : '')
  return groups.map((g, i) => {
    const h2 = g.sections.find(s => s.level === 2)
    const h3 = g.sections.filter(s => s.level === 3).map(s => `  - H3: ${s.title}${annotation(s.annotation)}`)
    return [`- H2: ${g.title}${annotation(h2?.annotation)} (≈ ${budgets[i]?.budget ?? 0} mots)`, ...h3].join('\n')
  }).join('\n')
}

/** Dernier filet structurel : aucun texte hors paragraphe, aucun bloc coupé en plein mot. */
function repairStructure(html: string): string {
  const repaired = trimTruncatedBlocks(stripOrphanBlockText(html).html)
  if (repaired.trimmed.length > 0) log.warn('[article-draft] blocs tronqués réparés', { count: repaired.trimmed.length })
  return repaired.html.replace(/<p>\s*<\/p>/g, '')
}

function writeEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function writeChapterEvents(res: Response, events: ChapterEvent[]): void {
  for (const e of events) {
    if (e.type === 'section-start') writeEvent(res, 'section-start', { index: e.index, total: e.total, title: e.title })
    else writeEvent(res, 'section-done', { index: e.index })
  }
}

/**
 * Coupe un texte interrompu au début de son dernier chapitre (incomplet) ;
 * la continuation le réécrit en entier. Sans H2, garde le texte réparé.
 */
function cutAtLastChapter(html: string): { kept: string; restartIndex: number } {
  const openings = [...html.matchAll(/<h2(?:\s[^>]*)?>/gi)]
  const last = openings.at(-1)
  if (!last || last.index === undefined) return { kept: html, restartIndex: 0 }
  return { kept: html.slice(0, last.index), restartIndex: openings.length - 1 }
}

router.post('/generate/article-draft', async (req, res) => {
  const parsed = generateArticleDraftRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  const { outline: outlineRaw, keyword, keywords, articleType, articleTitle, cocoonName, articleId } = parsed.data
  log.info(`Premier jet pour « ${articleTitle} »`, { articleId, keyword, articleType })

  try {
    const startTotal = Date.now()
    const systemPrompt = await loadPrompt('system-propulsite')
    const [strategy, cocoonStrategy] = await Promise.all([
      getStrategy(articleId),
      getCocoonStrategy(cocoonName).catch((err: Error) => {
        log.warn('Stratégie du cocon illisible — premier jet sans elle', { cocoonName, error: err.message })
        return null
      }),
    ])
    const { data: articleKw } = await getArticleKeywords(articleId)
    const microCtx = await loadArticleMicroContext(articleId)
    // Longueur visée : choix de l'utilisateur (micro-contexte) > recommandation
    // envoyée par l'écran > règle du type (FR-INFRA-TYPE-RULES-SSOT). La cible
    // retenue est enregistrée : la porte du premier jet juge contre elle (R16).
    const targetWords = microCtx?.targetWordCount ?? parsed.data.targetWordCount ?? targetWordsFor(articleType)
    if (microCtx?.targetWordCount == null) await retainTargetWordCount(articleId, targetWords)

    const outline: Outline = typeof outlineRaw === 'string' ? JSON.parse(outlineRaw) : outlineRaw as unknown as Outline
    const groups = splitOutlineIntoGroups(outline)
    if (groups.length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Outline has no H2 sections' } })
      return
    }
    const titles = groups.map(g => g.title)

    const baseVars = {
      articleTitle,
      articleType: ARTICLE_TYPE_RULES[articleType as ArticleLevel]?.label ?? articleType,
      keyword,
      secondaryKeywords: keywords.filter(k => k !== keyword).join(', ') || 'Aucun',
      cocoonName,
      strategyContext: pickStrategyContext(strategy, cocoonStrategy),
      keywordContext: buildKeywordContext(articleKw),
      microContext: buildMicroContextBlock(microCtx),
      type_rules: articleType in ARTICLE_TYPE_RULES ? describeTypeRules(articleType as ArticleLevel) : '',
      wordCountBudget: String(targetWords),
      outlinePlan: formatDraftPlan(groups, targetWords),
    }
    const maxTokens = draftMaxTokens(targetWords)

    req.socket.setTimeout(0)
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' })

    const totalUsage: ApiUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, model: '', estimatedCost: 0 }
    const models: Array<string | undefined> = []
    let content = ''
    let tracker = createH2Tracker(titles)
    writeChapterEvents(res, tracker.start())
    let continuation = ''
    let stopReason: ApiUsage['stopReason']

    for (let attempt = 0; attempt <= MAX_DRAFT_CONTINUATIONS; attempt++) {
      const prompt = await loadPrompt('generate-article-draft', {
        ...baseVars,
        continuation,
        previousText: continuation ? content.slice(-1500).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '',
      })
      const result = await consumeStream(streamChatCompletion(systemPrompt, prompt, maxTokens), (chunk) => {
        writeEvent(res, 'chunk', { content: chunk })
        writeChapterEvents(res, tracker.push(chunk))
      })
      aggregateUsage(totalUsage, result.usage)
      models.push(result.usage?.model)
      stopReason = result.usage?.stopReason
      content += stripAiPreamble(stripCodeFences(result.fullContent))

      if (stopReason !== 'max_tokens' || attempt === MAX_DRAFT_CONTINUATIONS) break
      // Coupé au plafond : on repart du début du dernier chapitre, incomplet.
      const { kept, restartIndex } = cutAtLastChapter(content)
      const restartTitle = titles[restartIndex]
      if (!restartTitle) break
      log.warn('[article-draft] premier jet coupé au plafond de jetons — continuation', { articleId, restartIndex, attempt: attempt + 1 })
      content = kept
      continuation = restartTitle
      tracker = createH2Tracker(titles, restartIndex)
      tracker.start() // chapitre déjà ouvert à l'écran
      writeEvent(res, 'continuation', { fromIndex: restartIndex, attempt: attempt + 1 })
    }
    writeChapterEvents(res, tracker.finish())

    const finalContent = repairStructure(repairHtmlTail(mergeConsecutiveElements(content)))
    totalUsage.model = describeModelsUsed(models)
    totalUsage.stopReason = stopReason
    log.info(`Premier jet rédigé pour « ${articleTitle} »`, {
      articleId, chars: finalContent.length, targetWords, stopReason, totalMs: Date.now() - startTotal, cost: `$${totalUsage.estimatedCost.toFixed(4)}`,
    })
    // La longueur réellement visée : l'écran la garde, même si une autre fenêtre
    // en avait choisi une entre-temps (suite C5b).
    writeEvent(res, 'done', { content: finalContent, usage: totalUsage, targetWordCount: targetWords })
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération'
    log.error(`Premier jet en échec pour « ${articleTitle} » — ${message}`, { keyword, articleType, articleId })
    if (res.headersSent) {
      writeEvent(res, 'error', { code: 'CLAUDE_API_ERROR', message })
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

export default router
