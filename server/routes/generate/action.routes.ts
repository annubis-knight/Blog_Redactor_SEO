import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { generateActionRequestSchema } from '../../../shared/schemas/generate.schema.js'
import { streamChatCompletion, WEB_SEARCH_TOOL } from '../../services/external/ai-provider.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { consumeStream } from './_helpers.js'

const router = Router()

/** POST /api/generate/action — Stream contextual action via Claude */
router.post('/generate/action', async (req, res) => {
  const parsed = generateActionRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  const { actionType, selectedText, keyword, articleId, keywords } = parsed.data

  log.info(`🎯 [action] INCOMING "${actionType}"`, {
    articleId,
    keyword,
    keywordsCount: keywords?.length ?? 0,
    selectedTextChars: selectedText.length,
    selectedTextPreview: selectedText.slice(0, 200),
  })

  try {
    const startTotal = Date.now()
    const systemPrompt = await loadPrompt('system-propulsite')

    const variables: Record<string, string> = {
      selectedText,
      keywordInstruction: keyword
        ? `Mot-clé principal de l'article : ${keyword}. Intègre-le naturellement si pertinent.`
        : '',
    }

    const userPrompt = await loadPrompt(`actions/${actionType}`, variables)
    log.debug(`[action] 📝 prompts built "${actionType}"`, {
      systemChars: systemPrompt.length,
      userChars: userPrompt.length,
      userPromptPreview: userPrompt.slice(0, 300),
    })

    // Web search enabled for actions that need grounded sources
    const needsWebSearch = actionType === 'sources-chiffrees' || actionType === 'exemples-reels'
    const tools = needsWebSearch ? [WEB_SEARCH_TOOL] : undefined
    log.debug(`[action] 🔧 tools config`, { actionType, webSearchEnabled: needsWebSearch })

    // SSE headers — sent AFTER loadPrompt succeeds
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const startAi = Date.now()
    const { fullContent, usage, chunkCount } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 2048, tools),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    log.info(`✅ [action] OUTGOING "${actionType}"`, {
      contentChars: fullContent.length,
      chunkCount,
      aiMs: Date.now() - startAi,
      totalMs: Date.now() - startTotal,
      cost: usage ? `$${usage.estimatedCost.toFixed(4)}` : 'n/a',
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      contentPreview: fullContent.slice(0, 300),
    })
    res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'action'
    log.error(`❌ [action] FAILED "${actionType}" — ${message}`, { keyword, textLength: selectedText.length })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

export default router
