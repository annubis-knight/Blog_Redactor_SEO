import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { streamChatCompletion } from '../../services/external/ai-provider.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { consumeStream } from './_helpers.js'

const router = Router()

/** POST /api/generate/micro-context-suggest — Stream micro-context suggestion via Claude */
router.post('/generate/micro-context-suggest', async (req, res) => {
  const { articleId, articleTitle, articleType, keyword, cocoonName, siloName, cocoonStrategy, themeConfig } = req.body as {
    articleId: number; articleTitle: string; articleType: string; keyword: string
    cocoonName: string; siloName?: string; cocoonStrategy?: Record<string, unknown>; themeConfig?: Record<string, unknown>
  }

  if (!articleId || !articleTitle || !keyword) {
    res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'articleId, articleTitle, keyword are required' } })
    return
  }

  log.info(`Generate micro-context suggest for "${articleTitle}"`, { articleId, keyword })

  try {
    const cocoonSlug = cocoonName
      ? cocoonName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : undefined

    const systemPrompt = await loadPrompt('micro-context-suggest', {
      articleTitle,
      articleType: articleType || 'Spécialisé',
      keyword,
      cocoonName: cocoonName || '',
      siloName: siloName || '',
      cocoonStrategy: cocoonStrategy ? JSON.stringify(cocoonStrategy, null, 2) : 'Non disponible',
      themeConfig: themeConfig ? JSON.stringify(themeConfig, null, 2) : 'Non disponible',
    }, cocoonSlug ? { cocoonSlug } : undefined)

    const userPrompt = `Suggère un micro-contexte (angle, ton, consignes) pour l'article "${articleTitle}" (mot-clé: ${keyword}).`

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 1024),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    const cleaned = fullContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const result = JSON.parse(cleaned) as { angle: string; tone: string; directives: string }

    log.info(`Micro-context suggested for "${articleTitle}"`)
    res.write(`event: done\ndata: ${JSON.stringify({ ...result, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la suggestion'
    log.error(`Micro-context suggest failed for "${articleTitle}" — ${message}`)
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

export default router
