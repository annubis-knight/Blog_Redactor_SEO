import { Router } from 'express'
import { log } from '../utils/logger.js'
import { streamChatCompletion, USAGE_SENTINEL } from '../services/claude.service.js'
import type { ApiUsage } from '../services/claude.service.js'
import { loadPrompt } from '../utils/prompt-loader.js'

const router = Router()

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

/**
 * POST /keywords/:keyword/ai-panel
 * SSE streaming expert SEO analysis panel.
 * Body: { level, kpis, verdict }
 */
router.post('/keywords/:keyword/ai-panel', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { level, kpis, verdict, cocoonSlug } = req.body

  if (!keyword || !level) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword and level are required' } })
    return
  }

  log.info(`AI panel request for "${keyword}" (${level})`)

  try {
    // Build KPI summary for prompt context
    const kpisSummary = Array.isArray(kpis)
      ? kpis.map((k: { name: string; color: string; label: string }) => `${k.name}: ${k.label} (${k.color})`).join(', ')
      : 'KPIs non disponibles'

    const verdictSummary = verdict
      ? `${verdict.level} (${verdict.greenCount}/${verdict.totalKpis} verts)`
      : 'Verdict non disponible'

    const systemPrompt = await loadPrompt('capitaine-ai-panel', {
      keyword,
      level,
      verdict: verdictSummary,
      kpis_summary: kpisSummary,
    }, cocoonSlug ? { cocoonSlug } : undefined)

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, `Analyse le mot-clé "${keyword}" pour un article de niveau ${level}.`),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    log.info(`AI panel done for "${keyword}"`, { length: fullContent.length })
    res.write(`event: done\ndata: ${JSON.stringify({ metadata: { keyword, level }, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération du panel IA'
    log.error(`AI panel failed for "${keyword}" — ${message}`)
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
    }
  }
})

/**
 * POST /keywords/:keyword/ai-hn-structure
 * SSE streaming Hn structure recommendation using selected Lieutenants.
 * Body: { lieutenants: string[], level: string, hnStructure: { level: number, text: string, count: number }[] }
 */
router.post('/keywords/:keyword/ai-hn-structure', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { lieutenants, level, hnStructure, cocoonSlug } = req.body

  if (!keyword || !level || !Array.isArray(lieutenants) || lieutenants.length === 0) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword, level, and non-empty lieutenants are required' } })
    return
  }

  log.info(`AI Hn structure request for "${keyword}" (${level}, ${lieutenants.length} lieutenants)`)

  try {
    const hnSummary = Array.isArray(hnStructure)
      ? hnStructure.map((h: { level: number; text: string; count: number }) => `H${h.level}: ${h.text} (${h.count}x)`).join('\n')
      : 'Aucune donnee de structure concurrente'

    const systemPrompt = await loadPrompt('lieutenants-hn-structure', {
      keyword,
      level,
      lieutenants: lieutenants.join(', '),
      hn_structure: hnSummary,
    }, cocoonSlug ? { cocoonSlug } : undefined)

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const userPrompt = `Recommande une structure Hn pour un article "${keyword}" de niveau ${level} utilisant ces Lieutenants: ${lieutenants.join(', ')}`

    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    log.info(`AI Hn structure done for "${keyword}"`, { length: fullContent.length })
    res.write(`event: done\ndata: ${JSON.stringify({ metadata: { keyword, level }, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la génération de la structure Hn'
    log.error(`AI Hn structure failed for "${keyword}" — ${message}`)
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
    }
  }
})

/**
 * POST /keywords/:keyword/ai-lexique
 * SSE streaming lexical analysis panel for TF-IDF results.
 * Body: { level, lexiqueTerms: { obligatoire?: string[], differenciateur?: string[], optionnel?: string[] }, cocoonSlug? }
 */
router.post('/keywords/:keyword/ai-lexique', async (req, res) => {
  const keyword = decodeURIComponent(req.params.keyword)
  const { level, lexiqueTerms, cocoonSlug } = req.body

  if (!keyword || !level) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword and level are required' } })
    return
  }

  const hasTerms = lexiqueTerms &&
    ((lexiqueTerms.obligatoire?.length ?? 0) + (lexiqueTerms.differenciateur?.length ?? 0) + (lexiqueTerms.optionnel?.length ?? 0)) > 0

  if (!hasTerms) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'lexiqueTerms must contain at least one term' } })
    return
  }

  log.info(`AI lexique analysis request for "${keyword}" (${level})`)

  try {
    const systemPrompt = await loadPrompt('lexique-ai-panel', {
      keyword,
      level,
      obligatoire_terms: lexiqueTerms.obligatoire?.join(', ') || 'aucun',
      differenciateur_terms: lexiqueTerms.differenciateur?.join(', ') || 'aucun',
      optionnel_terms: lexiqueTerms.optionnel?.join(', ') || 'aucun',
    }, cocoonSlug ? { cocoonSlug } : undefined)

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })

    const userPrompt = `Analyse le champ lexical extrait pour l'article "${keyword}" de niveau ${level}.`

    const { fullContent, usage } = await consumeStream(
      streamChatCompletion(systemPrompt, userPrompt),
      (chunk) => res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`),
    )

    log.info(`AI lexique analysis done for "${keyword}"`, { length: fullContent.length })
    res.write(`event: done\ndata: ${JSON.stringify({ metadata: { keyword, level }, usage })}\n\n`)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse lexicale IA'
    log.error(`AI lexique analysis failed for "${keyword}" — ${message}`)
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
    }
  }
})

export default router
