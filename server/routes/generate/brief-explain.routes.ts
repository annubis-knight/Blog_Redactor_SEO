import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { streamChatCompletion } from '../../services/external/ai-provider.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { loadArticleMicroContext } from '../../services/infra/data.service.js'
import { consumeStream } from './_helpers.js'

const router = Router()

/** POST /api/generate/brief-explain — Stream brief analysis markdown via Claude */
router.post('/generate/brief-explain', async (req, res) => {
  const {
    articleId, articleTitle, keyword, cocoonName, articleType,
    keywords, lexique, hnStructure,
    paaQuestions, topCompetitors, cocoonArticles,
  } = req.body as {
    articleId: number; articleTitle: string; keyword: string; cocoonName: string; articleType?: string
    keywords?: string[]; lexique?: string[]
    hnStructure?: Array<{ level: number; text: string; children?: Array<{ level: number; text: string }> }>
    paaQuestions?: string[]; topCompetitors?: Array<{ title: string; domain: string }>
    cocoonArticles?: string[]
  }

  if (!articleId || !articleTitle || !keyword) {
    res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'articleId, articleTitle, keyword are required' } })
    return
  }

  log.info(`Generate brief-explain for "${articleTitle}"`, { articleId, keyword })

  try {
    // Load micro-context server-side
    const microCtx = await loadArticleMicroContext(articleId)
    const microContextBlock = microCtx && microCtx.angle
      ? `- Angle: ${microCtx.angle}\n- Ton: ${microCtx.tone || 'non spécifié'}\n- Consignes: ${microCtx.directives || 'aucune'}`
      : 'Non défini'

    // Build PAA block
    const paaBlock = paaQuestions && paaQuestions.length > 0
      ? paaQuestions.map(q => `- ${q}`).join('\n')
      : 'Aucune question PAA disponible'

    // Build competitors block
    const competitorsBlock = topCompetitors && topCompetitors.length > 0
      ? topCompetitors.map((c, i) => `${i + 1}. **${c.title}** (${c.domain})`).join('\n')
      : 'Aucune donnee SERP disponible'

    // Build cocoon articles block
    const cocoonArticlesBlock = cocoonArticles && cocoonArticles.length > 0
      ? cocoonArticles.map(a => `- ${a}`).join('\n')
      : 'Aucun autre article dans le cocon'

    const cocoonSlug = cocoonName
      ? cocoonName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : undefined

    const systemPrompt = await loadPrompt('brief-ia-panel', {
      articleTitle,
      keyword,
      cocoonName: cocoonName || '',
      articleType: articleType || 'Spécialisé',
      keywords: keywords ? keywords.join(', ') : '',
      lexique: lexique ? lexique.join(', ') : '',
      hnStructure: hnStructure ? JSON.stringify(hnStructure, null, 2) : '[]',
      microContext: microContextBlock,
      paaQuestions: paaBlock,
      topCompetitors: competitorsBlock,
      cocoonArticles: cocoonArticlesBlock,
    }, cocoonSlug ? { cocoonSlug } : undefined)

    const userPrompt = `Analyse le brief et la structure de l'article "${articleTitle}" et donne des recommandations concretes pour le redacteur.`

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 4096),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    log.info(`Brief explain done for "${articleTitle}"`, { contentChars: fullContent.length })
    res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse'
    log.error(`Brief explain failed for "${articleTitle}" — ${message}`)
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

export default router
