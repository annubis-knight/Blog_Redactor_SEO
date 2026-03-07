import { Router } from 'express'
import { generateOutlineRequestSchema, generateArticleRequestSchema, generateMetaRequestSchema, generateActionRequestSchema } from '../../shared/schemas/generate.schema.js'
import { streamChatCompletion } from '../services/claude.service.js'
import { loadPrompt } from '../utils/prompt-loader.js'
import type { Outline } from '../../shared/types/index.js'

const router = Router()

/** Parse an Outline JSON from Claude's text response (may contain markdown fences) */
function parseOutlineFromText(text: string): Outline {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const parsed = JSON.parse(cleaned) as Outline
  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error('Invalid outline format: missing sections array')
  }
  return parsed
}

/** POST /api/generate/outline — Stream outline generation via Claude */
router.post('/generate/outline', async (req, res) => {
  const parsed = generateOutlineRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  const { keyword, keywords, paa, articleType, articleTitle, cocoonName, theme } = parsed.data

  try {
    const paaFormatted = paa.length > 0
      ? paa.map(p => `- ${p.question}${p.answer ? ` → ${p.answer}` : ''}`).join('\n')
      : 'Aucune question PAA disponible.'

    const systemPrompt = await loadPrompt('generate-outline', {
      articleTitle,
      articleType,
      keyword,
      secondaryKeywords: keywords.filter(k => k !== keyword).join(', ') || 'Aucun',
      cocoonName,
      theme: theme || 'Non spécifié',
      paaQuestions: paaFormatted,
    })

    const userPrompt = `Génère le sommaire pour l'article "${articleTitle}" (type: ${articleType}, mot-clé: ${keyword}).`

    // SSE headers — sent AFTER loadPrompt succeeds so errors can use JSON response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    let fullContent = ''
    for await (const chunk of streamChatCompletion(systemPrompt, userPrompt)) {
      fullContent += chunk
      res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`)
    }

    const outline = parseOutlineFromText(fullContent)
    res.write(`event: done\ndata: ${JSON.stringify({ outline })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération'
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

/** POST /api/generate/article — Stream article generation via Claude */
router.post('/generate/article', async (req, res) => {
  const parsed = generateArticleRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  const { outline, keyword, keywords, articleType, articleTitle, cocoonName, theme } = parsed.data

  try {
    const systemPrompt = await loadPrompt('system-propulsite')

    const userPrompt = await loadPrompt('generate-article', {
      articleTitle,
      articleType,
      keyword,
      secondaryKeywords: keywords.filter(k => k !== keyword).join(', ') || 'Aucun',
      cocoonName,
      theme: theme || 'Non spécifié',
      outline,
    })

    // SSE headers — sent AFTER loadPrompt succeeds
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    let fullContent = ''
    for await (const chunk of streamChatCompletion(systemPrompt, userPrompt, 16384)) {
      fullContent += chunk
      res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`)
    }

    res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération'
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

/** POST /api/generate/meta — Generate meta title & description (JSON, not SSE) */
router.post('/generate/meta', async (req, res) => {
  const parsed = generateMetaRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  const { keyword, articleTitle, articleContent } = parsed.data

  try {
    const systemPrompt = await loadPrompt('system-propulsite')

    const userPrompt = await loadPrompt('generate-meta', {
      articleTitle,
      keyword,
      articleContent,
    })

    let fullContent = ''
    for await (const chunk of streamChatCompletion(systemPrompt, userPrompt, 1024)) {
      fullContent += chunk
    }

    // Parse JSON response from Claude
    const cleaned = fullContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const meta = JSON.parse(cleaned) as { metaTitle: string; metaDescription: string }

    if (!meta.metaTitle || !meta.metaDescription) {
      throw new Error('Invalid meta response: missing metaTitle or metaDescription')
    }

    res.json({ data: { metaTitle: meta.metaTitle, metaDescription: meta.metaDescription } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération des metas'
    res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
  }
})

/** POST /api/generate/action — Stream contextual action via Claude */
router.post('/generate/action', async (req, res) => {
  const parsed = generateActionRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  const { actionType, selectedText, keyword } = parsed.data

  try {
    const systemPrompt = await loadPrompt('system-propulsite')

    const variables: Record<string, string> = {
      selectedText,
      keywordInstruction: keyword
        ? `Mot-clé principal de l'article : ${keyword}. Intègre-le naturellement si pertinent.`
        : '',
    }

    const userPrompt = await loadPrompt(`actions/${actionType}`, variables)

    // SSE headers — sent AFTER loadPrompt succeeds
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    let fullContent = ''
    for await (const chunk of streamChatCompletion(systemPrompt, userPrompt, 2048)) {
      fullContent += chunk
      res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`)
    }

    res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'action'
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

export default router
