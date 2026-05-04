import { Router } from 'express'
import { log } from '../utils/logger.js'
import {
  generateLongTailSuggestions,
  persistLongTailSelection,
  LongTailSuggestionsValidationError,
} from '../services/keyword/long-tail-suggest.service.js'
import {
  longTailSuggestRequestSchema,
  longTailSelectionPatchSchema,
} from '../../shared/schemas/long-tail-suggestions.schema.js'

const router = Router()

function parseArticleId(raw: unknown): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * POST /api/articles/:id/radar-exploration/long-tail
 * Genere (ou recupere depuis le cache) les suggestions longue-traine.
 */
router.post('/articles/:id/radar-exploration/long-tail', async (req, res) => {
  try {
    const articleId = parseArticleId(req.params.id)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'article id must be a positive integer' } })
      return
    }

    const inputParse = longTailSuggestRequestSchema.safeParse(req.body)
    if (!inputParse.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: inputParse.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
        },
      })
      return
    }

    const { suggestions, fromCache } = await generateLongTailSuggestions({
      ...inputParse.data,
      articleId,
    })

    res.json({ data: { suggestions, fromCache } })
  } catch (err) {
    if (err instanceof LongTailSuggestionsValidationError) {
      log.warn(`POST long-tail — AI invalid output: ${err.message}`)
      res.status(502).json({ error: { code: 'AI_VALIDATION_ERROR', message: err.message } })
      return
    }
    log.error(`POST /articles/:id/radar-exploration/long-tail — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate long-tail suggestions' } })
  }
})

/**
 * PATCH /api/articles/:id/radar-exploration/long-tail/selection
 * Met a jour la liste des longues-traines cochees par l'utilisateur (debounce
 * cote front). Ne touche pas aux suggestions.
 */
router.patch('/articles/:id/radar-exploration/long-tail/selection', async (req, res) => {
  try {
    const articleId = parseArticleId(req.params.id)
    if (!articleId) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'article id must be a positive integer' } })
      return
    }

    const parsed = longTailSelectionPatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
        },
      })
      return
    }

    await persistLongTailSelection(articleId, parsed.data.selectedKeywords)
    res.json({ data: { ok: true, count: parsed.data.selectedKeywords.length } })
  } catch (err) {
    log.error(`PATCH long-tail selection — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update long-tail selection' } })
  }
})

export default router
