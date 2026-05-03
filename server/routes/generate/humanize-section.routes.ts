import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { generateHumanizeSectionRequestSchema } from '../../../shared/schemas/generate.schema.js'
import { streamChatCompletion } from '../../services/external/ai-provider.service.js'
import type { ApiUsage } from '../../services/external/claude.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { validateHtmlStructurePreserved } from '../../../shared/html-utils.js'
import {
  REINFORCEMENT_BLOCK,
  SSE_HEADERS,
  aggregateUsage,
  consumeStream,
  stripCodeFences,
} from './_helpers.js'

const router = Router()

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

export default router
