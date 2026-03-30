import { Router } from 'express'
import { log } from '../utils/logger.js'
import { generateOutlineRequestSchema, generateArticleRequestSchema, generateMetaRequestSchema, generateActionRequestSchema } from '../../shared/schemas/generate.schema.js'
import { streamChatCompletion, USAGE_SENTINEL } from '../services/claude.service.js'
import type { ApiUsage } from '../services/claude.service.js'
import { loadPrompt } from '../utils/prompt-loader.js'
import { getStrategy } from '../services/strategy.service.js'
import { getArticleKeywords } from '../services/data.service.js'
import type { ArticleStrategy, ArticleKeywords, Outline } from '../../shared/types/index.js'

/** Consume the async generator, separating content chunks from the usage sentinel */
async function consumeStream(
  gen: AsyncGenerator<string>,
  onChunk: (chunk: string) => void,
): Promise<{ fullContent: string; usage: ApiUsage | null }> {
  let fullContent = ''
  let usage: ApiUsage | null = null
  for await (const chunk of gen) {
    if (chunk.startsWith(USAGE_SENTINEL)) {
      usage = JSON.parse(chunk.slice(USAGE_SENTINEL.length)) as ApiUsage
    } else {
      fullContent += chunk
      onChunk(chunk)
    }
  }
  return { fullContent, usage }
}

/** Build a markdown strategy context block for prompt injection */
function buildStrategyContext(strategy: ArticleStrategy | null): string {
  if (!strategy || strategy.completedSteps === 0) return ''

  const parts: string[] = ['## Contexte stratégique (Brain-First)\n']

  if (strategy.cible.validated) {
    parts.push(`- **Cible** : ${strategy.cible.validated}`)
  }
  if (strategy.douleur.validated) {
    parts.push(`- **Douleur adressée** : ${strategy.douleur.validated}`)
  }
  if (strategy.angle.validated) {
    parts.push(`- **Angle différenciateur** : ${strategy.angle.validated}`)
  }
  if (strategy.promesse.validated) {
    parts.push(`- **Promesse au lecteur** : ${strategy.promesse.validated}`)
  }
  if (strategy.cta.target) {
    parts.push(`- **CTA** : ${strategy.cta.type} — ${strategy.cta.target}`)
  }

  if (parts.length === 1) return '' // Only the header, no actual data

  parts.push('')
  parts.push('Intègre ces éléments stratégiques dans le ton, le choix des exemples et la structure du contenu. Le contenu doit naturellement guider le lecteur vers le CTA.')

  return parts.join('\n')
}

/** Build a markdown keyword context block for prompt injection */
function buildKeywordContext(articleKeywords: ArticleKeywords | null): string {
  if (!articleKeywords?.capitaine) return ''

  const parts: string[] = ['## Mots-clés par article (Capitaine/Lieutenants/Lexique)\n']
  parts.push(`- **Capitaine** (H1, Title, URL, intro) : ${articleKeywords.capitaine}`)

  if (articleKeywords.lieutenants.length > 0) {
    parts.push(`- **Lieutenants** (H2, H3) : ${articleKeywords.lieutenants.join(', ')}`)
  }

  if (articleKeywords.lexique.length > 0) {
    parts.push(`- **Lexique sémantique** (corps de texte) : ${articleKeywords.lexique.join(', ')}`)
  }

  parts.push('')
  parts.push('Place le Capitaine dans les zones chaudes (H1, intro, conclusion, Title). Répartis les Lieutenants dans les H2/H3. Intègre les termes du Lexique naturellement dans le corps de texte.')

  return parts.join('\n')
}

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

  const { keyword, keywords, paa, articleType, articleTitle, cocoonName, topic } = parsed.data

  log.info(`Generate outline for "${articleTitle}"`, { keyword, articleType, cocoonName })

  try {
    const paaFormatted = paa.length > 0
      ? paa.map(p => `- ${p.question}${p.answer ? ` → ${p.answer}` : ''}`).join('\n')
      : 'Aucune question PAA disponible.'

    const strategy = await getStrategy(parsed.data.slug)
    const articleKw = await getArticleKeywords(parsed.data.slug)

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
    })

    const userPrompt = `Génère le sommaire pour l'article "${articleTitle}" (type: ${articleType}, mot-clé: ${keyword}).`

    // SSE headers — sent AFTER loadPrompt succeeds so errors can use JSON response
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    const outline = parseOutlineFromText(fullContent)
    log.info(`Outline generated for "${articleTitle}"`, { sections: outline.sections.length })
    res.write(`event: done\ndata: ${JSON.stringify({ outline, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération'
    log.error(`Outline generation failed for "${articleTitle}" — ${message}`)
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

  const { outline, keyword, keywords, articleType, articleTitle, cocoonName, topic } = parsed.data

  log.info(`Generate article for "${articleTitle}"`, { keyword, articleType })

  try {
    const systemPrompt = await loadPrompt('system-propulsite')

    const strategy = await getStrategy(parsed.data.slug)
    const articleKw = await getArticleKeywords(parsed.data.slug)

    const userPrompt = await loadPrompt('generate-article', {
      articleTitle,
      articleType,
      keyword,
      secondaryKeywords: keywords.filter(k => k !== keyword).join(', ') || 'Aucun',
      cocoonName,
      theme: topic || 'Non spécifié',
      outline,
      strategyContext: buildStrategyContext(strategy),
      keywordContext: buildKeywordContext(articleKw),
    })

    // SSE headers — sent AFTER loadPrompt succeeds
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 16384),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    log.info(`Article generated for "${articleTitle}"`, { contentLength: fullContent.length })
    res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération'
    log.error(`Article generation failed for "${articleTitle}" — ${message}`)
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

    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 1024),
      () => {}, // no SSE chunks for meta
    )

    // Parse JSON response from Claude
    const cleaned = fullContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const meta = JSON.parse(cleaned) as { metaTitle: string; metaDescription: string }

    if (!meta.metaTitle || !meta.metaDescription) {
      throw new Error('Invalid meta response: missing metaTitle or metaDescription')
    }

    res.json({ data: { metaTitle: meta.metaTitle, metaDescription: meta.metaDescription, usage } })
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

  log.info(`Generate action "${actionType}"`, { keyword, textLength: selectedText.length })

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

    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 2048),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent, usage })}\n\n`)
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
