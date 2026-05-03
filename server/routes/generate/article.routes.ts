import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { generateArticleRequestSchema } from '../../../shared/schemas/generate.schema.js'
import { streamChatCompletion, WEB_SEARCH_TOOL } from '../../services/external/ai-provider.service.js'
import type { ApiUsage } from '../../services/external/claude.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { getStrategy } from '../../services/strategy/strategy.service.js'
import { getArticleKeywords, loadArticleMicroContext } from '../../services/infra/data.service.js'
import type { Outline } from '../../../shared/types/index.js'
import { mergeConsecutiveElements } from '../../../shared/html-utils.js'
import {
  DEFAULT_TARGET_WORDS_BY_TYPE,
  DEFAULT_TARGET_WORDS_FALLBACK,
  INTER_SECTION_DELAY_MS,
  RATE_LIMIT_DEFAULT_WAIT,
  RATE_LIMIT_MAX_RETRIES,
  aggregateUsage,
  buildKeywordContext,
  buildMicroContextBlock,
  buildStrategyContext,
  computeSectionBudget,
  consumeStream,
  formatFullOutline,
  formatSectionOutline,
  getPositionDirectives,
  getRetryAfterSeconds,
  isRateLimitError,
  repairHtmlTail,
  sleep,
  splitOutlineIntoGroups,
  stripCodeFences,
} from './_helpers.js'

const router = Router()

/** POST /api/generate/article — Stream article generation section-by-section */
router.post('/generate/article', async (req, res) => {
  const parsed = generateArticleRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  const { outline: outlineRaw, keyword, keywords, articleType, articleTitle, cocoonName, topic: _topic } = parsed.data

  // Frontend toggle overrides env default; env WEB_SEARCH_ENABLED=false disables globally
  const envDefault = process.env.WEB_SEARCH_ENABLED !== 'false'
  const webSearchEnabled = parsed.data.webSearchEnabled ?? envDefault

  log.info(`Generate article for "${articleTitle}"`, { keyword, articleType, webSearchEnabled })

  try {
    const startTotal = Date.now()
    const systemPrompt = await loadPrompt('system-propulsite')

    const articleId = parsed.data.articleId
    const strategy = await getStrategy(articleId)
    const { data: articleKw } = await getArticleKeywords(articleId)
    const microCtx = await loadArticleMicroContext(articleId)
    const microContextBlock = buildMicroContextBlock(microCtx)

    // Resolve target word count (client > microCtx > type default > hard fallback).
    // Note: use `parsed.data.targetWordCount`, not `parsed.targetWordCount` (F7).
    const targetWordCount
      = parsed.data.targetWordCount
      ?? microCtx?.targetWordCount
      ?? DEFAULT_TARGET_WORDS_BY_TYPE[parsed.data.articleType]
      ?? DEFAULT_TARGET_WORDS_FALLBACK

    // Parse outline and split into section groups
    const outline: Outline = typeof outlineRaw === 'string' ? JSON.parse(outlineRaw) : outlineRaw as unknown as Outline
    const groups = splitOutlineIntoGroups(outline)

    if (groups.length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Outline has no H2 sections' } })
      return
    }

    log.info(`Article split into ${groups.length} sections`, { sections: groups.map(g => g.title), targetWordCount })

    // Common prompt variables shared across all section prompts
    const commonVars = {
      articleTitle,                                            // Titre de l'article (ex: "Création site web Toulouse")
      articleType,                                             // Type d'article (ex: "guide", "comparatif", "liste")
      keyword,                                                 // Mot-clé pilier / Capitaine
      secondaryKeywords: keywords.filter(k => k !== keyword).join(', ') || 'Aucun', // Lieutenants (mots-clés secondaires) séparés par virgule
      cocoonName,                                              // Nom du cocon sémantique auquel l'article appartient
      strategyContext: buildStrategyContext(strategy),          // Bloc markdown Brain-First : cible, douleur, angle, promesse, CTA
      keywordContext: buildKeywordContext(articleKw),           // Bloc markdown Capitaine/Lieutenants/Lexique avec zones de placement
      microContext: microContextBlock,                         // Bloc markdown micro-contexte : angle, ton, consignes spécifiques, word count
      fullOutline: formatFullOutline(outline),                 // Sommaire complet formaté (liste "- H1/H2/H3: titre")
    }

    // SSE headers
    req.socket.setTimeout(0)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    let fullContent = ''
    let totalChunks = 0
    const totalUsage: ApiUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, model: '', estimatedCost: 0 }

    for (const [index, group] of groups.entries()) {
      // Check if client disconnected
      if (req.socket.destroyed) {
        log.warn(`Client disconnected during article generation`, { section: index, title: group.title })
        return
      }

      // SSE: section-start
      res.write(`event: section-start\ndata: ${JSON.stringify({ index, total: groups.length, title: group.title })}\n\n`)

      const { role, budget, hint, maxTokens } = computeSectionBudget(group, index, groups.length, targetWordCount)
      log.info('[generate-article] section budget', {
        role,
        budget,
        maxTokens,
        groupIndex: index,
        totalGroups: groups.length,
        targetWordCount,
      })

      // Derniers ~500 caractères du contenu déjà généré (HTML strippé) pour assurer la continuité
      const previousContext = fullContent.length > 0
        ? `## Contexte précédent (derniers paragraphes déjà rédigés)\n\n${fullContent.slice(-500).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`
        : ''

      const sectionPrompt = await loadPrompt('generate-article-section', {
        ...commonVars,
        sectionOutline: formatSectionOutline(group),             // Section courante formatée (liste "- H2/H3: titre [annotation]")
        sectionPosition: group.position,                         // Position dans l'article : "intro" | "middle" | "conclusion"
        previousContext,                                         // Texte brut des ~500 derniers caractères déjà rédigés (ou vide si 1ère section)
        positionDirectives: getPositionDirectives(group.position, keyword, articleTitle), // Consignes spécifiques selon la position (intro: H1 + accroche, conclusion: CTA + récap)
        wordCountBudget: String(targetWordCount),                // Nombre de mots cible pour l'article complet
        sectionRole: role,                                       // Rôle de la section (ex: "introduction", "section principale 2/4", "conclusion")
        sectionBudgetHint: hint,                                 // Indication de budget mots pour cette section (ex: "~300 mots")
      })

      log.debug(`Section ${index + 1}/${groups.length} "${group.title}" prompt built`, { promptChars: sectionPrompt.length })

      // Generate with retry + exponential backoff on rate-limit (429)
      let sectionContent = ''
      let sectionUsage: ApiUsage | null = null
      let sectionChunks = 0
      const maxAttempts = RATE_LIMIT_MAX_RETRIES

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const result = await consumeStream(
            streamChatCompletion(systemPrompt, sectionPrompt, maxTokens, webSearchEnabled ? [WEB_SEARCH_TOOL] : undefined),
            (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
          )
          sectionContent = repairHtmlTail(mergeConsecutiveElements(stripCodeFences(result.fullContent)))
          sectionUsage = result.usage
          sectionChunks = result.chunkCount
          break // success
        } catch (sectionErr) {
          const isLastAttempt = attempt >= maxAttempts - 1

          if (isRateLimitError(sectionErr)) {
            const waitSeconds = getRetryAfterSeconds(sectionErr, RATE_LIMIT_DEFAULT_WAIT * (attempt + 1))
            log.warn(`Section "${group.title}" hit rate limit (429), waiting ${waitSeconds}s before retry ${attempt + 1}/${maxAttempts - 1}`, {
              error: (sectionErr as Error).message,
              waitSeconds,
            })

            if (isLastAttempt) throw sectionErr

            // Notify client that we're waiting for rate limit
            res.write(`event: rate-limit\ndata: ${JSON.stringify({
              index,
              attempt: attempt + 1,
              maxAttempts: maxAttempts - 1,
              waitSeconds,
              message: `Rate limit atteint — nouvelle tentative dans ${waitSeconds}s (${attempt + 1}/${maxAttempts - 1})`,
            })}\n\n`)

            await sleep(waitSeconds * 1000)
            continue
          }

          // Non-rate-limit error: single retry only
          if (attempt === 0) {
            log.warn(`Section "${group.title}" failed, retrying...`, { error: (sectionErr as Error).message })
            continue
          }
          throw sectionErr
        }
      }

      fullContent += sectionContent
      totalChunks += sectionChunks
      aggregateUsage(totalUsage, sectionUsage)
      if (sectionUsage?.model) totalUsage.model = sectionUsage.model

      log.info(`Section ${index + 1}/${groups.length} "${group.title}" done`, { chars: sectionContent.length, chunks: sectionChunks })

      // SSE: section-done
      res.write(`event: section-done\ndata: ${JSON.stringify({ index })}\n\n`)

      // Inter-section delay to avoid hitting rate limits on the next call
      if (index < groups.length - 1) {
        const delaySec = Math.round(INTER_SECTION_DELAY_MS / 1000)
        log.debug(`Inter-section delay: ${delaySec}s before section ${index + 2}/${groups.length}`)
        res.write(`event: section-delay\ndata: ${JSON.stringify({ nextIndex: index + 1, delaySeconds: delaySec })}\n\n`)
        await sleep(INTER_SECTION_DELAY_MS)
      }
    }

    log.info(`Article generated for "${articleTitle}"`, { contentLength: fullContent.length, totalChunks, sections: groups.length, totalMs: Date.now() - startTotal, cost: `$${totalUsage.estimatedCost.toFixed(4)}` })
    res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent, usage: totalUsage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération'
    log.error(`Article generation failed for "${articleTitle}" — ${message}`, { keyword, articleType, articleId: parsed.data.articleId })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

export default router
