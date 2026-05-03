import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { generateMetaRequestSchema } from '../../../shared/schemas/generate.schema.js'
import { streamChatCompletion } from '../../services/external/ai-provider.service.js'
import type { ApiUsage } from '../../services/external/claude.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import {
  RATE_LIMIT_DEFAULT_WAIT,
  RATE_LIMIT_MAX_RETRIES,
  consumeStream,
  getRetryAfterSeconds,
  isRateLimitError,
  sleep,
} from './_helpers.js'

const router = Router()

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

export default router
