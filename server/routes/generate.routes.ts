import { Router } from 'express'
import { log } from '../utils/logger.js'
import {
  generateOutlineRequestSchema,
  generateArticleRequestSchema,
  generateMetaRequestSchema,
  generateActionRequestSchema,
  generateReduceSectionRequestSchema,
  generateHumanizeSectionRequestSchema,
} from '../../shared/schemas/generate.schema.js'
import { streamChatCompletion, USAGE_SENTINEL, WEB_SEARCH_TOOL } from '../services/external/claude.service.js'
import type { ApiUsage } from '../services/external/claude.service.js'
import { loadPrompt } from '../utils/prompt-loader.js'
import { getStrategy } from '../services/strategy/strategy.service.js'
import { getArticleKeywords, loadArticleMicroContext } from '../services/infra/data.service.js'
import type { ArticleStrategy, ArticleKeywords, Outline, OutlineSection } from '../../shared/types/index.js'
import { mergeConsecutiveElements, validateHtmlStructurePreserved } from '../../shared/html-utils.js'

/** Detect if an error is a 429 rate-limit error from the Anthropic API */
function isRateLimitError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    return (err as { status: number }).status === 429
  }
  return err instanceof Error && err.message.startsWith('429')
}

/** Extract retry-after seconds from an Anthropic SDK error, or return a default */
function getRetryAfterSeconds(err: unknown, defaultSeconds: number): number {
  if (err && typeof err === 'object' && 'headers' in err) {
    const headers = (err as { headers: Record<string, string> }).headers
    const retryAfter = headers?.['retry-after']
    if (retryAfter) {
      const parsed = Number(retryAfter)
      if (!isNaN(parsed) && parsed > 0) return Math.ceil(parsed)
    }
  }
  return defaultSeconds
}

/** Sleep for a given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Max retry attempts specifically for rate limit errors */
const RATE_LIMIT_MAX_RETRIES = 4
/** Default wait time on first 429 (seconds) */
const RATE_LIMIT_DEFAULT_WAIT = 60
/** Delay between sections to proactively avoid rate limits (ms). Set INTER_SECTION_DELAY=0 in env to disable (tests). */
const INTER_SECTION_DELAY_MS = Number(process.env.INTER_SECTION_DELAY ?? 15_000)

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
  parts.push('Utilise la douleur comme fil rouge du raisonnement. L\'angle différenciateur doit orienter tes arguments. Le CTA, s\'il est défini, doit être amené naturellement en conclusion.')

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

    const articleId = parsed.data.articleId
    const strategy = await getStrategy(articleId)
    const articleKw = await getArticleKeywords(articleId)
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
function getPositionDirectives(position: 'intro' | 'middle' | 'conclusion', keyword: string, articleTitle?: string): string {
  if (position === 'intro') {
    return `## Directives spécifiques (Introduction)

- Commence OBLIGATOIREMENT par le titre H1 de l'article : \`<h1>${articleTitle}</h1>\`.
- Ensuite, enchaîne avec des balises \`<p>\` (PAS de \`<h2>\` si le sommaire ne prévoit pas de H2 Intro).
- Place le mot-clé pilier « ${keyword} » dans l'introduction.
- Accroche le lecteur dès la première phrase — pose le problème ou le contexte sans détour.
- Présente brièvement ce que l'article va couvrir.`
  }
  if (position === 'conclusion') {
    return `## Directives spécifiques (Conclusion)

- Réintègre le mot-clé pilier « ${keyword} ».
- Récapitule les points clés de l'article en 3-5 bullet points.
- Propose des étapes concrètes et actionnables.
- Termine par un CTA clair si le contexte stratégique en définit un.`
  }
  return ''
}

/** Strip markdown code fences (```html ... ```) that Claude wraps around HTML output */
function stripCodeFences(text: string): string {
  return text.replace(/^```\w*\n?/gm, '').replace(/\n?```$/gm, '').trim()
}

/**
 * Repair unclosed HTML tags at the end of generated section content.
 * Handles truncation patterns like `</p<h2>`, `</h<h2>`, or content
 * ending mid-tag when the model hits its token limit.
 */
function repairHtmlTail(html: string): string {
  let result = html.trim()

  // Fix truncated closing tags fused with the next opening tag: `</p<h2>` → `</p>`
  // or `</h<h2>` → nothing (orphaned fragment, just remove it)
  result = result.replace(/<\/[a-z]*<[^>]*>$/i, '')

  // Remove any trailing incomplete tag: `<h2`, `</p`, `<div class="fo`
  result = result.replace(/<[^>]*$/i, '')

  // Collect open tags and close any that remain unclosed
  const openTags: string[] = []
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*\/?>/gi
  let match: RegExpExecArray | null
  while ((match = tagRegex.exec(result)) !== null) {
    const full = match[0]
    const tag = match[1]!.toLowerCase()
    const voidTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'source']
    if (voidTags.includes(tag) || full.endsWith('/>')) continue
    if (full.startsWith('</')) {
      // closing tag — pop the last matching open tag
      const idx = openTags.lastIndexOf(tag)
      if (idx !== -1) openTags.splice(idx, 1)
    } else {
      openTags.push(tag)
    }
  }

  // Close remaining open tags in reverse order
  for (let i = openTags.length - 1; i >= 0; i--) {
    result += `</${openTags[i]}>`
  }

  return result
}

/** Aggregate usage from multiple API calls */
function aggregateUsage(total: ApiUsage, section: ApiUsage | null): void {
  if (!section) return
  total.inputTokens += section.inputTokens
  total.outputTokens += section.outputTokens
  total.cacheReadTokens += section.cacheReadTokens
  total.cacheCreationTokens += section.cacheCreationTokens
  total.estimatedCost += section.estimatedCost
}

/** Default target word counts per article type (used as fallback when client/microCtx don't provide one) */
const DEFAULT_TARGET_WORDS_BY_TYPE: Record<'Pilier' | 'Intermédiaire' | 'Spécialisé', number> = {
  'Pilier': 2500,
  'Intermédiaire': 1800,
  'Spécialisé': 1200,
}
const DEFAULT_TARGET_WORDS_FALLBACK = 2000

/**
 * Compute the word budget + max_tokens for a given section group.
 * Repartition is 15/75/10 for intro/corps/conclusion, with F6 guards for
 * articles with 1 or 2 groups only.
 */
function computeSectionBudget(
  group: SectionGroup,
  groupIndex: number,
  totalGroups: number,
  targetWordCount: number,
): { role: 'introduction' | 'corps' | 'conclusion'; budget: number; hint: string; maxTokens: number } {
  let role: 'introduction' | 'corps' | 'conclusion'
  let budget: number

  if (totalGroups === 1) {
    // Single group handles the whole article
    role = 'corps'
    budget = targetWordCount
  } else if (totalGroups === 2) {
    // No middle, split 40/60 between intro and conclusion
    if (groupIndex === 0) {
      role = 'introduction'
      budget = Math.ceil(targetWordCount * 0.4)
    } else {
      role = 'conclusion'
      budget = Math.ceil(targetWordCount * 0.6)
    }
  } else {
    // Standard 15/75/10 with nbMiddleGroups = totalGroups - 2
    const nbMiddleGroups = totalGroups - 2
    if (groupIndex === 0) {
      role = 'introduction'
      budget = Math.ceil(targetWordCount * 0.15)
    } else if (groupIndex === totalGroups - 1) {
      role = 'conclusion'
      budget = Math.ceil(targetWordCount * 0.10)
    } else {
      role = 'corps'
      budget = Math.ceil((targetWordCount * 0.75) / nbMiddleGroups)
    }
  }

  const ratio = Math.round((budget / targetWordCount) * 100)
  const hint = `~${budget} mots, soit ~${ratio}% du budget total`

  // max_tokens: ~4 tokens/word for HTML output (tags, attributes, structured lists consume ~60% of tokens).
  // Clamped [2048, 8192] — 2048 minimum so even small sections aren't truncated.
  const maxTokens = Math.min(8192, Math.max(2048, Math.ceil(budget * 4)))

  return { role, budget, hint, maxTokens }
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

  const { outline: outlineRaw, keyword, keywords, articleType, articleTitle, cocoonName, topic } = parsed.data

  // Frontend toggle overrides env default; env WEB_SEARCH_ENABLED=false disables globally
  const envDefault = process.env.WEB_SEARCH_ENABLED !== 'false'
  const webSearchEnabled = parsed.data.webSearchEnabled ?? envDefault

  log.info(`Generate article for "${articleTitle}"`, { keyword, articleType, webSearchEnabled })

  try {
    const startTotal = Date.now()
    const systemPrompt = await loadPrompt('system-propulsite')

    const articleId = parsed.data.articleId
    const strategy = await getStrategy(articleId)
    const articleKw = await getArticleKeywords(articleId)
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

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

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

/**
 * POST /api/generate/humanize-section — Rewrite a single <h2> section to remove
 * AI markers, with strict HTML structure preservation.
 *
 * Pattern: accumulate-then-validate. We do NOT stream partial chunks to the
 * client because an invalidated structure would create UI flicker. One section
 * ~500 words ≈ ~5s of generation, which is acceptable latency.
 *
 * Retry+fallback:
 *   1. First attempt.
 *   2. If structure broken → retry with REINFORCEMENT_BLOCK.
 *   3. If still broken → fallback to original section HTML (`structurePreserved: false`).
 *
 * Protected against prompt injection via `escapeKeys: ['sectionHtml']` (G3).
 * Unified SSE key: `html` (F9).
 */
const REINFORCEMENT_BLOCK = `## IMPORTANT — Retry

Tu as altéré la structure HTML à la tentative précédente. Reprends la section en préservant EXACTEMENT les mêmes balises dans le même ordre ET tous les attributs \`href\`, \`class\`, \`id\`, \`rel\`, \`target\` et \`data-*\`. Ne modifie QUE le texte des nœuds texte. Ne supprime aucun \`<p>\`, \`<ul>\`, \`<li>\`, \`<strong>\`, \`<a>\` ni aucun bloc. Ne fusionne pas, ne splitte pas, ne remplace aucune balise.
`

router.post('/generate/humanize-section', async (req, res) => {
  const parsed = generateHumanizeSectionRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
    })
    return
  }

  const { articleId, sectionHtml, sectionIndex, sectionTitle, keyword, keywords } = parsed.data

  log.info('[humanize-section] start', { articleId, sectionIndex, sectionTitle, chars: sectionHtml.length })

  const systemPrompt = await loadPrompt('system-propulsite')
  const buildUserPrompt = (reinforce: boolean) =>
    loadPrompt(
      'humanize-section',
      {
        sectionHtml,
        sectionTitle,
        keyword,
        keywords: keywords.join(', '),
        reinforcement: reinforce ? REINFORCEMENT_BLOCK : '',
      },
      { escapeKeys: ['sectionHtml'] },
    )

  // Approx budget: ~1.3 tokens/word × 1.3 safety margin, clamped
  const maxTokensForSection = Math.min(
    8192,
    Math.max(512, Math.ceil((sectionHtml.length / 3) * 1.3)),
  )

  req.socket.setTimeout(0)
  res.writeHead(200, SSE_HEADERS)

  const emitDone = (payload: Record<string, unknown>) => {
    res.write(`event: done\ndata: ${JSON.stringify(payload)}\n\n`)
    res.end()
  }
  const emitChunk = (html: string) => {
    res.write(`event: chunk\ndata: ${JSON.stringify({ html })}\n\n`)
  }

  try {
    // --- Attempt 1 ---
    const prompt1 = await buildUserPrompt(false)
    const { fullContent: raw1, usage: u1 } = await consumeStream(
      streamChatCompletion(systemPrompt, prompt1, maxTokensForSection),
      () => {},
    )
    const accumulated1 = stripCodeFences(raw1).trim()
    const v1 = validateHtmlStructurePreserved(sectionHtml, accumulated1)

    if (v1.preserved) {
      log.info('[humanize-section] v1 preserved', { articleId, sectionIndex })
      emitChunk(accumulated1)
      emitDone({
        html: accumulated1,
        usage: u1,
        structurePreserved: true,
        fallback: false,
        sectionIndex,
      })
      return
    }

    log.warn('[humanize-section] retry', {
      articleId,
      sectionIndex,
      reason: v1.diff?.reason,
      index: v1.diff?.index,
      expected: v1.diff?.expected,
      got: v1.diff?.got,
    })

    // --- Attempt 2 (reinforced) ---
    const prompt2 = await buildUserPrompt(true)
    const { fullContent: raw2, usage: u2 } = await consumeStream(
      streamChatCompletion(systemPrompt, prompt2, maxTokensForSection),
      () => {},
    )
    const accumulated2 = stripCodeFences(raw2).trim()
    const v2 = validateHtmlStructurePreserved(sectionHtml, accumulated2)

    const mergedUsage: ApiUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, model: '', estimatedCost: 0 }
    aggregateUsage(mergedUsage, u1)
    aggregateUsage(mergedUsage, u2)
    if (u2?.model) mergedUsage.model = u2.model
    else if (u1?.model) mergedUsage.model = u1.model

    if (v2.preserved) {
      log.info('[humanize-section] v2 preserved', { articleId, sectionIndex })
      emitChunk(accumulated2)
      emitDone({
        html: accumulated2,
        usage: mergedUsage,
        structurePreserved: true,
        fallback: false,
        sectionIndex,
      })
      return
    }

    log.warn('[humanize-section] fallback to original', {
      articleId,
      sectionIndex,
      sectionTitle,
      diff: v2.diff,
    })
    emitDone({
      html: sectionHtml,
      usage: mergedUsage,
      structurePreserved: false,
      fallback: true,
      sectionIndex,
      diff: v2.diff,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'humanisation'
    log.error(`[humanize-section] failed for article ${articleId} section ${sectionIndex} — ${message}`)
    res.write(`event: error\ndata: ${JSON.stringify({ message, sectionIndex })}\n\n`)
    // Emit a fallback done so the client loop can continue without blocking
    emitDone({
      html: sectionHtml,
      usage: null,
      structurePreserved: false,
      fallback: true,
      sectionIndex,
      error: message,
    })
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

    // Retry loop with backoff on 429 rate-limit
    let fullContent = ''
    let usage: ApiUsage | null = null
    for (let attempt = 0; attempt < RATE_LIMIT_MAX_RETRIES; attempt++) {
      try {
        const startAi = Date.now()
        const result = await consumeStream(
          streamChatCompletion(systemPrompt, userPrompt, 1024),
          () => {}, // no SSE chunks for meta
        )
        fullContent = result.fullContent
        usage = result.usage
        log.debug('meta stream complete', { chunkCount: result.chunkCount, contentChars: fullContent.length, ms: Date.now() - startAi })
        break
      } catch (metaErr) {
        if (isRateLimitError(metaErr) && attempt < RATE_LIMIT_MAX_RETRIES - 1) {
          const waitSeconds = getRetryAfterSeconds(metaErr, RATE_LIMIT_DEFAULT_WAIT * (attempt + 1))
          log.warn(`Meta generation hit rate limit (429), waiting ${waitSeconds}s before retry ${attempt + 1}/${RATE_LIMIT_MAX_RETRIES - 1}`, {
            error: (metaErr as Error).message, waitSeconds,
          })
          await sleep(waitSeconds * 1000)
          continue
        }
        throw metaErr
      }
    }

    // Parse JSON response from Claude
    const cleaned = fullContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const meta = JSON.parse(cleaned) as { metaTitle: string; metaDescription: string }

    if (!meta.metaTitle || !meta.metaDescription) {
      throw new Error('Invalid meta response: missing metaTitle or metaDescription')
    }

    // Enforce SEO character limits — truncate at last word boundary
    const MAX_TITLE = 60
    const MAX_DESC = 160
    if (meta.metaTitle.length > MAX_TITLE) {
      const truncated = meta.metaTitle.slice(0, MAX_TITLE)
      meta.metaTitle = truncated.slice(0, truncated.lastIndexOf(' ')) || truncated
      log.warn(`Meta title truncated from ${meta.metaTitle.length + (MAX_TITLE - meta.metaTitle.length)} to ${meta.metaTitle.length} chars`)
    }
    if (meta.metaDescription.length > MAX_DESC) {
      const truncated = meta.metaDescription.slice(0, MAX_DESC - 3)
      meta.metaDescription = (truncated.slice(0, truncated.lastIndexOf(' ')) || truncated) + '...'
      log.warn(`Meta description truncated to ${meta.metaDescription.length} chars`)
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
