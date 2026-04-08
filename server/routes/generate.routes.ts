import { Router } from 'express'
import { log } from '../utils/logger.js'
import { generateOutlineRequestSchema, generateArticleRequestSchema, generateMetaRequestSchema, generateActionRequestSchema } from '../../shared/schemas/generate.schema.js'
import { streamChatCompletion, USAGE_SENTINEL } from '../services/claude.service.js'
import type { ApiUsage } from '../services/claude.service.js'
import { loadPrompt } from '../utils/prompt-loader.js'
import { getStrategy } from '../services/strategy.service.js'
import { getArticleKeywords, loadArticleMicroContext } from '../services/data.service.js'
import type { ArticleStrategy, ArticleKeywords, Outline, OutlineSection } from '../../shared/types/index.js'
import { mergeConsecutiveElements } from '../../shared/html-utils.js'

/** Consume the async generator, separating content chunks from the usage sentinel */
async function consumeStream(
  gen: AsyncGenerator<string>,
  onChunk: (chunk: string) => void,
): Promise<{ fullContent: string; usage: ApiUsage | null; chunkCount: number }> {
  let fullContent = ''
  let usage: ApiUsage | null = null
  let chunkCount = 0
  for await (const chunk of gen) {
    if (chunk.startsWith(USAGE_SENTINEL)) {
      usage = JSON.parse(chunk.slice(USAGE_SENTINEL.length)) as ApiUsage
    } else {
      chunkCount++
      fullContent += chunk
      onChunk(chunk)
    }
  }
  return { fullContent, usage, chunkCount }
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
    const startTotal = Date.now()
    const paaFormatted = paa.length > 0
      ? paa.map(p => `- ${p.question}${p.answer ? ` → ${p.answer}` : ''}`).join('\n')
      : 'Aucune question PAA disponible.'

    const strategy = await getStrategy(parsed.data.slug)
    const articleKw = await getArticleKeywords(parsed.data.slug)
    const microCtx = await loadArticleMicroContext(parsed.data.slug)

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
    log.error(`Outline generation failed for "${articleTitle}" — ${message}`, { keyword, articleType, slug: parsed.data.slug })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

/** Split an outline into section groups (one H2 + its H3 children per group) */
interface SectionGroup {
  title: string
  position: 'intro' | 'middle' | 'conclusion'
  sections: OutlineSection[]
}

function splitOutlineIntoGroups(outline: Outline): SectionGroup[] {
  const groups: SectionGroup[] = []
  let currentGroup: OutlineSection[] = []
  let currentTitle = ''

  for (const section of outline.sections) {
    if (section.level === 1) continue // skip H1
    if (section.level === 2) {
      // Flush previous group
      if (currentGroup.length > 0) {
        groups.push({ title: currentTitle, position: 'middle', sections: currentGroup })
      }
      currentGroup = [section]
      currentTitle = section.title
    } else {
      // H3 — add to current group
      currentGroup.push(section)
    }
  }
  // Flush last group
  if (currentGroup.length > 0) {
    groups.push({ title: currentTitle, position: 'middle', sections: currentGroup })
  }

  // Tag first as intro, last as conclusion
  if (groups.length > 0) groups[0]!.position = 'intro'
  if (groups.length > 1) groups[groups.length - 1]!.position = 'conclusion'

  return groups
}

/** Format a section group into a readable outline for the prompt */
function formatSectionOutline(group: SectionGroup): string {
  return group.sections.map(s => {
    const tag = s.level === 2 ? 'H2' : 'H3'
    const ann = s.annotation ? ` [annotation: ${s.annotation}]` : ''
    return `- ${tag}: ${s.title}${ann}`
  }).join('\n')
}

/** Format the full outline for prompt context */
function formatFullOutline(outline: Outline): string {
  return outline.sections.map(s => {
    const tag = s.level === 1 ? 'H1' : s.level === 2 ? 'H2' : 'H3'
    return `- ${tag}: ${s.title}`
  }).join('\n')
}

/** Get position-specific directives for the prompt */
function getPositionDirectives(position: 'intro' | 'middle' | 'conclusion', keyword: string): string {
  if (position === 'intro') {
    return `## Directives spécifiques (Introduction)

- Commence directement par des balises \`<p>\` (PAS de \`<h2>\` pour l'introduction si le sommaire ne prévoit pas de H2 Intro).
- Place le mot-clé pilier « ${keyword} » dans l'introduction.
- Accroche le lecteur avec un constat chiffré ou une question percutante.
- Présente brièvement ce que l'article va couvrir.
- Si l'annotation \`content-valeur\` est présente, génère un bloc pédagogique.`
  }
  if (position === 'conclusion') {
    return `## Directives spécifiques (Conclusion)

- Réintègre le mot-clé pilier « ${keyword} ».
- Récapitule les points clés de l'article en 3-5 bullet points.
- Propose des étapes concrètes et actionnables.
- Si l'annotation \`content-reminder\` est présente, génère un bloc de rappel.
- Termine par un CTA clair si le contexte stratégique en définit un.`
  }
  return ''
}

/** Strip markdown code fences (```html ... ```) that Claude wraps around HTML output */
function stripCodeFences(text: string): string {
  return text.replace(/^```\w*\n?/gm, '').replace(/\n?```$/gm, '').trim()
}

/** Aggregate usage from multiple API calls */
function aggregateUsage(total: ApiUsage, section: ApiUsage | null): void {
  if (!section) return
  total.inputTokens += section.inputTokens
  total.outputTokens += section.outputTokens
  total.estimatedCost += section.estimatedCost
}

/** Build micro-context block from article data */
function buildMicroContextBlock(microCtx: { angle?: string; tone?: string; directives?: string; targetWordCount?: number } | null): string {
  if (!microCtx || !microCtx.angle) return ''
  const lines = ['## Micro-contexte article']
  lines.push(`- Angle: ${microCtx.angle}`)
  lines.push(`- Ton: ${microCtx.tone || 'non spécifié'}`)
  lines.push(`- Consignes: ${microCtx.directives || 'aucune'}`)
  if (microCtx.targetWordCount) {
    lines.push(`- Nombre de mots cible: ${microCtx.targetWordCount}`)
  }
  lines.push('')
  return lines.join('\n')
}

/** POST /api/generate/article — Stream article generation section-by-section */
router.post('/generate/article', async (req, res) => {
  const parsed = generateArticleRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  const { outline: outlineJson, keyword, keywords, articleType, articleTitle, cocoonName, topic } = parsed.data

  log.info(`Generate article for "${articleTitle}"`, { keyword, articleType })

  try {
    const startTotal = Date.now()
    const systemPrompt = await loadPrompt('system-propulsite')

    const strategy = await getStrategy(parsed.data.slug)
    const articleKw = await getArticleKeywords(parsed.data.slug)
    const microCtx = await loadArticleMicroContext(parsed.data.slug)
    const microContextBlock = buildMicroContextBlock(microCtx)

    // Parse outline and split into section groups
    const outline: Outline = JSON.parse(outlineJson)
    const groups = splitOutlineIntoGroups(outline)

    if (groups.length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Outline has no H2 sections' } })
      return
    }

    log.info(`Article split into ${groups.length} sections`, { sections: groups.map(g => g.title) })

    // Common prompt variables
    const commonVars = {
      articleTitle,
      articleType,
      keyword,
      secondaryKeywords: keywords.filter(k => k !== keyword).join(', ') || 'Aucun',
      cocoonName,
      strategyContext: buildStrategyContext(strategy),
      keywordContext: buildKeywordContext(articleKw),
      microContext: microContextBlock,
      fullOutline: formatFullOutline(outline),
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
    const totalUsage: ApiUsage = { inputTokens: 0, outputTokens: 0, model: '', estimatedCost: 0 }

    for (const [index, group] of groups.entries()) {
      // Check if client disconnected
      if (req.socket.destroyed) {
        log.warn(`Client disconnected during article generation`, { section: index, title: group.title })
        return
      }

      // SSE: section-start
      res.write(`event: section-start\ndata: ${JSON.stringify({ index, total: groups.length, title: group.title })}\n\n`)

      const previousContext = fullContent.length > 0
        ? `## Contexte précédent (derniers paragraphes déjà rédigés)\n\n${fullContent.slice(-500).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`
        : ''

      const sectionPrompt = await loadPrompt('generate-article-section', {
        ...commonVars,
        sectionOutline: formatSectionOutline(group),
        sectionPosition: group.position,
        previousContext,
        positionDirectives: getPositionDirectives(group.position, keyword),
      })

      log.debug(`Section ${index + 1}/${groups.length} "${group.title}" prompt built`, { promptChars: sectionPrompt.length })

      // Generate with 1 retry on failure
      let sectionContent = ''
      let sectionUsage: ApiUsage | null = null
      let sectionChunks = 0

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await consumeStream(
            streamChatCompletion(systemPrompt, sectionPrompt, 4096),
            (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
          )
          sectionContent = mergeConsecutiveElements(stripCodeFences(result.fullContent))
          sectionUsage = result.usage
          sectionChunks = result.chunkCount
          break // success
        } catch (sectionErr) {
          if (attempt === 0) {
            log.warn(`Section "${group.title}" failed, retrying...`, { error: (sectionErr as Error).message })
            continue
          }
          throw sectionErr // re-throw on second failure
        }
      }

      fullContent += sectionContent
      totalChunks += sectionChunks
      aggregateUsage(totalUsage, sectionUsage)
      if (sectionUsage?.model) totalUsage.model = sectionUsage.model

      log.info(`Section ${index + 1}/${groups.length} "${group.title}" done`, { chars: sectionContent.length, chunks: sectionChunks })

      // SSE: section-done
      res.write(`event: section-done\ndata: ${JSON.stringify({ index })}\n\n`)
    }

    log.info(`Article generated for "${articleTitle}"`, { contentLength: fullContent.length, totalChunks, sections: groups.length, totalMs: Date.now() - startTotal, cost: `$${totalUsage.estimatedCost.toFixed(4)}` })
    res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent, usage: totalUsage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération'
    log.error(`Article generation failed for "${articleTitle}" — ${message}`, { keyword, articleType, slug: parsed.data.slug })
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

  log.info(`Generate meta for "${articleTitle}"`, { keyword, contentChars: articleContent.length })

  try {
    const startTotal = Date.now()
    const systemPrompt = await loadPrompt('system-propulsite')

    const userPrompt = await loadPrompt('generate-meta', {
      articleTitle,
      keyword,
      articleContent,
    })
    log.debug('meta prompts built', { systemChars: systemPrompt.length, userChars: userPrompt.length })

    const startAi = Date.now()
    const { fullContent, usage, chunkCount } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 1024),
      () => {}, // no SSE chunks for meta
    )
    log.debug('meta stream complete', { chunkCount, contentChars: fullContent.length, ms: Date.now() - startAi })

    // Parse JSON response from Claude
    const cleaned = fullContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const meta = JSON.parse(cleaned) as { metaTitle: string; metaDescription: string }

    if (!meta.metaTitle || !meta.metaDescription) {
      throw new Error('Invalid meta response: missing metaTitle or metaDescription')
    }

    log.info(`Meta generated for "${articleTitle}"`, { titleLen: meta.metaTitle.length, descLen: meta.metaDescription.length, totalMs: Date.now() - startTotal })
    res.json({ data: { metaTitle: meta.metaTitle, metaDescription: meta.metaDescription, usage } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération des metas'
    log.error(`Meta generation failed for "${articleTitle}" — ${message}`, { keyword })
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
    const startTotal = Date.now()
    const systemPrompt = await loadPrompt('system-propulsite')

    const variables: Record<string, string> = {
      selectedText,
      keywordInstruction: keyword
        ? `Mot-clé principal de l'article : ${keyword}. Intègre-le naturellement si pertinent.`
        : '',
    }

    const userPrompt = await loadPrompt(`actions/${actionType}`, variables)
    log.debug('action prompts built', { actionType, systemChars: systemPrompt.length, userChars: userPrompt.length })

    // SSE headers — sent AFTER loadPrompt succeeds
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const startAi = Date.now()
    const { fullContent, usage, chunkCount } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 2048),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    log.info(`Action "${actionType}" done`, { contentChars: fullContent.length, chunkCount, aiMs: Date.now() - startAi, totalMs: Date.now() - startTotal })
    res.write(`event: done\ndata: ${JSON.stringify({ content: fullContent, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'action'
    log.error(`Action "${actionType}" failed — ${message}`, { keyword, textLength: selectedText.length })
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'CLAUDE_API_ERROR', message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'CLAUDE_API_ERROR', message } })
    }
  }
})

/** POST /api/generate/micro-context-suggest — Stream micro-context suggestion via Claude */
router.post('/generate/micro-context-suggest', async (req, res) => {
  const { slug, articleTitle, articleType, keyword, cocoonName, siloName, cocoonStrategy, themeConfig } = req.body as {
    slug: string; articleTitle: string; articleType: string; keyword: string
    cocoonName: string; siloName?: string; cocoonStrategy?: Record<string, unknown>; themeConfig?: Record<string, unknown>
  }

  if (!slug || !articleTitle || !keyword) {
    res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'slug, articleTitle, keyword are required' } })
    return
  }

  log.info(`Generate micro-context suggest for "${articleTitle}"`, { slug, keyword })

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

/** POST /api/generate/brief-explain — Stream brief analysis markdown via Claude */
router.post('/generate/brief-explain', async (req, res) => {
  const {
    slug, articleTitle, keyword, cocoonName, articleType,
    keywords, lexique, hnStructure,
    paaQuestions, topCompetitors, cocoonArticles,
  } = req.body as {
    slug: string; articleTitle: string; keyword: string; cocoonName: string; articleType?: string
    keywords?: string[]; lexique?: string[]
    hnStructure?: Array<{ level: number; text: string; children?: Array<{ level: number; text: string }> }>
    paaQuestions?: string[]; topCompetitors?: Array<{ title: string; domain: string }>
    cocoonArticles?: string[]
  }

  if (!slug || !articleTitle || !keyword) {
    res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'slug, articleTitle, keyword are required' } })
    return
  }

  log.info(`Generate brief-explain for "${articleTitle}"`, { slug, keyword })

  try {
    // Load micro-context server-side
    const microCtx = await loadArticleMicroContext(slug)
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
