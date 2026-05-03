import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { generateReduceSectionRequestSchema } from '../../../shared/schemas/generate.schema.js'
import { streamChatCompletion } from '../../services/external/ai-provider.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { getStrategy } from '../../services/strategy/strategy.service.js'
import {
  SSE_HEADERS,
  buildStrategyContext,
  consumeStream,
  stripCodeFences,
} from './_helpers.js'

const router = Router()

/**
 * POST /api/generate/reduce-section — Reduce a single H2 section to approach
 * a proportional word-count budget.
 *
 * Called in a loop by the client store (one call per section, same pattern as
 * humanize-section). The strategy context (cible, douleur, angle…) is loaded
 * server-side via `getStrategy(articleId)` so the model knows what to preserve.
 *
 * Protected against prompt injection via `escapeKeys: ['sectionHtml']` (G3).
 * SSE contract (F9): emits `chunk` then `done` events with unified key `html`.
 */
router.post('/generate/reduce-section', async (req, res) => {
  const parsed = generateReduceSectionRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  const { articleId, sectionHtml, sectionIndex, sectionTitle, targetWordCount, currentWordCount, keyword, keywords } = parsed.data

  log.info('[reduce-section] start', {
    articleId,
    sectionIndex,
    sectionTitle,
    targetWordCount,
    currentWordCount,
    delta: currentWordCount - targetWordCount,
  })

  try {
    const systemPrompt = await loadPrompt('system-propulsite')
    const strategy = await getStrategy(articleId)
    const strategyContext = buildStrategyContext(strategy)

    const userPrompt = await loadPrompt(
      'reduce-section',
      {
        sectionHtml,
        sectionTitle,
        targetWordCount: String(targetWordCount),
        currentWordCount: String(currentWordCount),
        keyword,
        keywords: keywords.join(', '),
        strategyContext: strategyContext || 'Aucun contexte stratégique disponible.',
      },
      { escapeKeys: ['sectionHtml'] },
    )

    req.socket.setTimeout(0)
    res.writeHead(200, SSE_HEADERS)

    const maxTokens = Math.min(8192, Math.max(512, Math.ceil(targetWordCount * 1.5 * 1.3)))

    const startAi = Date.now()
    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, maxTokens),
      () => {},
    )
    const fullHtml = stripCodeFences(fullContent).trim()

    log.info('[reduce-section] done', {
      articleId,
      sectionIndex,
      chars: fullHtml.length,
      ms: Date.now() - startAi,
      cost: usage ? `$${usage.estimatedCost.toFixed(4)}` : null,
    })

    res.write(`event: chunk\ndata: ${JSON.stringify({ html: fullHtml })}\n\n`)
    res.write(`event: done\ndata: ${JSON.stringify({ html: fullHtml, usage, sectionIndex })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la réduction'
    log.error(`[reduce-section] failed for article ${articleId} section ${sectionIndex} — ${message}`)
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

export default router
