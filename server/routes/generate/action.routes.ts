import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { generateActionRequestSchema } from '../../../shared/schemas/generate.schema.js'
import { streamChatCompletion, webSearchTool } from '../../services/external/ai-provider.service.js'
import { loadZoneContext } from '../../services/strategy/prompt-context.service.js'
import { keepKnownLinks, knownSources } from '../../../shared/verifiers/enrichment.js'
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

    // Texte fourni par l'utilisateur : échappé avant d'entrer dans le prompt (G3, épopée qualité SEO R12).
    const userPrompt = await loadPrompt(`actions/${actionType}`, variables, { escapeKeys: ['selectedText'] })
    log.debug(`[action] 📝 prompts built "${actionType}"`, {
      systemChars: systemPrompt.length,
      userChars: userPrompt.length,
      userPromptPreview: userPrompt.slice(0, 300),
    })

    // Recherche web pour les actions qui citent des sources : localisée dans la
    // zone du client, et ses liens rapprochés des résultats réels (R21). Leur
    // texte est donc accumulé et vérifié avant de partir : un lien inventé ne
    // doit pas atteindre l'éditeur, même au fil du flux.
    const needsWebSearch = actionType === 'sources-chiffrees' || actionType === 'exemples-reels'
    const tools = needsWebSearch ? [webSearchTool((await loadZoneContext()).zone)] : undefined
    log.debug(`[action] 🔧 tools config`, { actionType, webSearchEnabled: needsWebSearch })

    // Une recherche web peut durer plus que le délai par défaut du socket.
    if (needsWebSearch) req.socket.setTimeout(0)

    // SSE headers — sent AFTER loadPrompt succeeds
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const startAi = Date.now()
    const writeChunk = (content: string) => res.write(`event: chunk\ndata: ${JSON.stringify({ content })}\n\n`)
    // Rien ne part pendant la recherche : un commentaire SSE garde la connexion ouverte.
    const keepAlive = needsWebSearch ? setInterval(() => res.write(': en cours\n\n'), 15_000) : null
    const { fullContent: rawContent, usage, chunkCount } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 2048, tools),
      needsWebSearch ? () => {} : writeChunk,
    ).finally(() => { if (keepAlive) clearInterval(keepAlive) })
    // Coupée avant la fin (plafond de jetons, recherche interrompue) : rien à
    // insérer. Un texte tronqué remplaçait sinon la sélection.
    if (usage?.stopReason && usage.stopReason !== 'end') {
      log.warn(`[action] réponse coupée avant la fin "${actionType}"`, { stopReason: usage.stopReason })
      res.write(`event: error\ndata: ${JSON.stringify({
        code: 'ACTION_TRUNCATED',
        message: 'La réponse a été coupée avant la fin : rien n’est proposé. Sélectionnez un passage plus court, ou relancez.',
      })}\n\n`)
      res.end()
      return
    }

    let fullContent = rawContent
    let removedLinks: string[] = []
    if (needsWebSearch) {
      const { html, removed } = keepKnownLinks(rawContent, knownSources(selectedText, usage?.webSources))
      if (removed.length) log.warn(`[action] liens absents de la recherche web retirés`, { actionType, removed })
      fullContent = html
      removedLinks = removed
      writeChunk(fullContent)
    }

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
    // Les liens retirés partent avec le résultat : l'écran le dit à l'utilisateur.
    res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent, usage, ...(removedLinks.length ? { removedLinks } : {}) })}\n\n`)
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
