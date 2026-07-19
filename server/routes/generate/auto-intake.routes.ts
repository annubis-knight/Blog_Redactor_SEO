import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { autoIntakeRequestSchema, autoIntakeResponseSchema } from '../../../shared/schemas/auto-intake.schema.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { collectStreamWithUsage } from '../../utils/stream-usage.js'

const router = Router()

/** Extrait le premier objet JSON d'une réponse IA (tolère les fences ```json). */
function extractJson(text: string): unknown {
  const stripped = text.replace(/```(?:json)?/gi, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Aucun objet JSON dans la réponse IA')
  return JSON.parse(match[0])
}

/**
 * POST /api/generate/auto-intake — brief éditorial structuré depuis un sujet vague.
 * Utilisé par le CLI `auto:article` (phase Cerveau). Réponse JSON (non-SSE).
 */
router.post('/generate/auto-intake', async (req, res) => {
  const parsed = autoIntakeRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }

  const { topic, businessContext, cocoonName, articleType } = parsed.data
  log.info('POST /api/generate/auto-intake', { topic: topic.slice(0, 60), cocoonName })

  try {
    const systemPrompt = await loadPrompt('auto-intake', {
      topic,
      businessContext: businessContext || 'Non précisé',
      cocoonName: cocoonName || 'Non précisé',
      articleType: articleType ?? 'intermediaire',
    }, { escapeKeys: ['topic', 'businessContext'] })

    const userMessage = 'Génère le brief éditorial auto-intake au format JSON strict.'
    const { text, usage } = await collectStreamWithUsage(systemPrompt, userMessage, 1024)

    let intake
    try {
      intake = autoIntakeResponseSchema.parse(extractJson(text))
    } catch (parseErr) {
      log.warn(`auto-intake: réponse IA non conforme — ${(parseErr as Error).message}`)
      res.status(502).json({ error: { code: 'AI_PARSE_ERROR', message: 'Réponse IA non exploitable (JSON attendu)' } })
      return
    }

    log.info('auto-intake done', { articleTitle: intake.articleTitle, pilierKeyword: intake.pilierKeyword })
    res.json({ data: { intake, usage } })
  } catch (err) {
    log.error(`POST /api/generate/auto-intake — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Échec de la génération du brief' } })
  }
})

export default router
