import { Router } from 'express'
import { log } from '../../utils/logger.js'
import { generateMetaRequestSchema } from '../../../shared/schemas/generate.schema.js'
import { streamChatCompletion } from '../../services/external/ai-provider.service.js'
import type { ApiUsage } from '../../services/external/claude.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { consumeStream } from './_helpers.js'
import { fitMetaText } from '../../../shared/utils/meta-fit.js'

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

    // Le texte de l'article est du contenu utilisateur : échappé (NFR-SEC-PROMPT-INJECTION).
    const userPrompt = await loadPrompt('generate-meta', {
      articleTitle,
      keyword,
      articleContent,
    }, { escapeKeys: ['articleContent'] })
    log.debug('meta prompts built', { systemChars: systemPrompt.length, userChars: userPrompt.length })

    // Les réessais (quota, surcharge) vivent dans ai-provider (withRetry /
    // withFallbackChain) : la route ne réessaie pas (épopée qualité SEO, R15).
    const startAi = Date.now()
    const result = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt, 1024),
      () => {}, // no SSE chunks for meta
    )
    const fullContent = result.fullContent
    const usage: ApiUsage | null = result.usage
    log.debug('meta stream complete', { chunkCount: result.chunkCount, contentChars: fullContent.length, ms: Date.now() - startAi })

    // Parse JSON response from Claude
    const cleaned = fullContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const meta = JSON.parse(cleaned) as { metaTitle: string; metaDescription: string }

    if (!meta.metaTitle || !meta.metaDescription) {
      throw new Error('Invalid meta response: missing metaTitle or metaDescription')
    }

    // Longueurs affichées par Google : on raccourcit sans jamais couper en plein vol
    // ni ajouter « ... », que validateArticleMeta classe en erreur (épopée qualité SEO, R4).
    const MAX_TITLE = 60
    const MAX_DESC = 160
    const rawLengths = { title: meta.metaTitle.length, description: meta.metaDescription.length }
    meta.metaTitle = fitMetaText(meta.metaTitle, MAX_TITLE)
    meta.metaDescription = fitMetaText(meta.metaDescription, MAX_DESC)
    if (meta.metaTitle.length !== rawLengths.title || meta.metaDescription.length !== rawLengths.description) {
      log.warn('Meta ajustée aux longueurs affichées par Google', {
        title: `${rawLengths.title} → ${meta.metaTitle.length}`,
        description: `${rawLengths.description} → ${meta.metaDescription.length}`,
      })
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
