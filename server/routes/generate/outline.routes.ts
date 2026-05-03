import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { generateOutlineRequestSchema } from '../../../shared/schemas/generate.schema.js'
import { streamChatCompletion } from '../../services/external/ai-provider.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { getStrategy } from '../../services/strategy/strategy.service.js'
import { getArticleKeywords, loadArticleMicroContext } from '../../services/infra/data.service.js'
import {
  buildKeywordContext,
  buildStrategyContext,
  consumeStream,
  parseOutlineFromText,
} from './_helpers.js'

const router = Router()

/** POST /api/generate/outline — Stream outline generation via Claude */
router.post('/generate/outline', async (req, res) => {
  const parsed = generateOutlineRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  const { keyword, keywords, paa, articleType, articleTitle, cocoonName, topic } = parsed.data

  log.info(`Generate outline for "${articleTitle}"`, { keyword, articleType, cocoonName })

  try {
    const startTotal = Date.now()
    const paaFormatted = paa.length > 0
      ? paa.map(p => `- ${p.question}${p.answer ? ` → ${p.answer}` : ''}`).join('\n')
      : 'Aucune question PAA disponible.'

    const articleId = parsed.data.articleId
    const strategy = await getStrategy(articleId)
    const { data: articleKw } = await getArticleKeywords(articleId)
    const microCtx = await loadArticleMicroContext(articleId)

    const microContextBlock = microCtx && microCtx.angle
      ? `## Micro-contexte article\n- Angle: ${microCtx.angle}\n- Ton: ${microCtx.tone || 'non spécifié'}\n- Consignes: ${microCtx.directives || 'aucune'}\n`
      : ''

    const startPrompt = Date.now()
    const systemPrompt = await loadPrompt('generate-outline', {
      articleTitle,
      articleType,
      keyword,
      secondaryKeywords: keywords.filter(k => k !== keyword).join(', ') || 'Aucun',
      cocoonName,
      theme: topic || 'Non spécifié',
      paaQuestions: paaFormatted,
      strategyContext: buildStrategyContext(strategy),
      keywordContext: buildKeywordContext(articleKw),
      microContext: microContextBlock,
    })

    const userPrompt = `Génère le sommaire pour l'article "${articleTitle}" (type: ${articleType}, mot-clé: ${keyword}).`
    log.debug('outline prompts built', { systemChars: systemPrompt.length, userChars: userPrompt.length, ms: Date.now() - startPrompt })

    // SSE headers — sent AFTER loadPrompt succeeds so errors can use JSON response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const startAi = Date.now()
    const { fullContent, usage, chunkCount } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )
    log.debug('outline stream complete', { chunkCount, contentChars: fullContent.length, ms: Date.now() - startAi })

    const outline = parseOutlineFromText(fullContent)
    log.info(`Outline generated for "${articleTitle}"`, { sections: outline.sections.length, totalMs: Date.now() - startTotal })
    res.write(`event: done\ndata: ${JSON.stringify({ outline, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération'
    log.error(`Outline generation failed for "${articleTitle}" — ${message}`, { keyword, articleType, articleId: parsed.data.articleId })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

export default router
