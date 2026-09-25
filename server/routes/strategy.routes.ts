import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getStrategy, saveStrategy } from '../services/strategy/strategy.service.js'
import { getCocoonStrategy, saveCocoonStrategy } from '../services/strategy/cocoon-strategy.service.js'
import { strategySuggestRequestSchema, batchStrategyStatusRequestSchema, cocoonSuggestRequestSchema, strategyDeepenRequestSchema, strategyConsolidateRequestSchema, strategyEnrichRequestSchema } from '../../shared/schemas/strategy.schema.js'
import { collectStreamWithUsage as collectStream } from '../utils/stream-usage.js'
import {
  articleStrategyPrompt,
  cocoonStrategyPrompt,
  deepenPrompt,
  consolidatePrompt,
  enrichPrompt,
} from '../services/strategy/strategy-prompts.service.js'

const router = Router()

/**
 * Adaptateur pour conserver le nom `suggestion` utilisé dans les destructurations
 * des routes ci-dessous. Délègue au helper partagé `collectStreamWithUsage`.
 */
async function collectStreamWithUsage(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024,
) {
  const { text, usage } = await collectStream(systemPrompt, userPrompt, maxTokens)
  return { suggestion: text, usage }
}

/** POST /api/strategy/batch-status */
router.post('/strategy/batch-status', async (req, res) => {
  try {
    const { ids } = batchStrategyStatusRequestSchema.parse(req.body)
    log.info('POST /api/strategy/batch-status', { idCount: ids.length })
    const start = Date.now()
    const statuses: Record<number, { completedSteps: number }> = {}
    await Promise.all(
      ids.map(async (id) => {
        const strategy = await getStrategy(id)
        statuses[id] = { completedSteps: strategy?.completedSteps ?? 0 }
      }),
    )
    log.debug('batch-status done', { idCount: ids.length, ms: Date.now() - start })
    res.json({ data: statuses })
  } catch (err) {
    log.error(`POST /api/strategy/batch-status — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load strategy statuses' } })
  }
})

/** GET /api/strategy/:id */
router.get('/strategy/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    log.info('GET /api/strategy/:id', { id })
    const strategy = await getStrategy(id)
    log.debug('strategy loaded', { id, completedSteps: strategy?.completedSteps ?? 0 })
    res.json({ data: strategy })
  } catch (err) {
    log.error(`GET /api/strategy/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load strategy' } })
  }
})

/** PUT /api/strategy/:id */
router.put('/strategy/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    log.info('PUT /api/strategy/:id', { id })
    const saved = await saveStrategy(id, req.body)
    log.debug('strategy saved', { id, completedSteps: saved?.completedSteps ?? 0 })
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/strategy/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save strategy' } })
  }
})

/** POST /api/strategy/:id/suggest (also handles merge when mergeWith is present) */
router.post('/strategy/:id/suggest', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }

  try {
    const parsed = strategySuggestRequestSchema.parse(req.body)
    const isMerge = !!parsed.mergeWith

    log.info('POST /api/strategy/:id/suggest', { id, step: parsed.step, isMerge })

    const startPrompt = Date.now()
    const prompt = await articleStrategyPrompt(parsed)
    log.debug('strategy prompt built', { template: isMerge ? 'strategy-merge' : 'strategy-suggest', chars: prompt.length, ms: Date.now() - startPrompt })

    const userMessage = isMerge
      ? `Fusionne ces deux textes pour l'étape "${parsed.step}"`
      : parsed.currentInput || `Exécute la mission pour l'étape "${parsed.step}"`

    // Collect the streamed response into a single string + extract usage from sentinel
    const { suggestion, usage } = await collectStreamWithUsage(prompt, userMessage, 1024)

    log.info('suggest done', { id, step: parsed.step, isMerge, suggestionChars: suggestion.length })
    res.json({ data: { suggestion, usage } })
  } catch (err) {
    log.error(`POST /api/strategy/${id}/suggest — ${(err as Error).message}`, { id })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate suggestion' } })
  }
})

// =============================================
// Cocoon-level strategy endpoints
// =============================================

/** GET /api/strategy/cocoon/:cocoonSlug */
router.get('/strategy/cocoon/:cocoonSlug', async (req, res) => {
  try {
    log.info('GET /api/strategy/cocoon/:cocoonSlug', { cocoonSlug: req.params.cocoonSlug })
    const strategy = await getCocoonStrategy(req.params.cocoonSlug)
    log.debug('cocoon strategy loaded', { cocoonSlug: req.params.cocoonSlug, completedSteps: strategy?.completedSteps ?? 0 })
    res.json({ data: strategy })
  } catch (err) {
    log.error(`GET /api/strategy/cocoon/${req.params.cocoonSlug} — ${(err as Error).message}`, { cocoonSlug: req.params.cocoonSlug })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load cocoon strategy' } })
  }
})

/** PUT /api/strategy/cocoon/:cocoonSlug */
router.put('/strategy/cocoon/:cocoonSlug', async (req, res) => {
  try {
    log.info('PUT /api/strategy/cocoon/:cocoonSlug', { cocoonSlug: req.params.cocoonSlug })
    const saved = await saveCocoonStrategy(req.params.cocoonSlug, req.body)
    log.debug('cocoon strategy saved', { cocoonSlug: req.params.cocoonSlug, completedSteps: saved?.completedSteps ?? 0 })
    res.json({ data: saved })
  } catch (err) {
    log.error(`PUT /api/strategy/cocoon/${req.params.cocoonSlug} — ${(err as Error).message}`, { cocoonSlug: req.params.cocoonSlug })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save cocoon strategy' } })
  }
})

/** POST /api/strategy/cocoon/:cocoonSlug/suggest (also handles merge when mergeWith is present) */
router.post('/strategy/cocoon/:cocoonSlug/suggest', async (req, res) => {
  try {
    const parsed = cocoonSuggestRequestSchema.parse(req.body)
    const isMerge = !!parsed.mergeWith

    log.info('POST /api/strategy/cocoon/:cocoonSlug/suggest', { cocoonSlug: req.params.cocoonSlug, step: parsed.step, isMerge })

    const startPrompt = Date.now()
    const prompt = await cocoonStrategyPrompt(parsed)
    log.debug('cocoon prompt built', { step: parsed.step, isMerge, chars: prompt.length, ms: Date.now() - startPrompt })

    const userMessage = isMerge
      ? `Fusionne ces deux textes pour l'étape "${parsed.step}"`
      : parsed.currentInput || `Exécute la mission pour l'étape "${parsed.step}"`

    const maxTokens = (parsed.step === 'articles' || parsed.step === 'articles-structure' || parsed.step === 'articles-spe') ? 4096
      : (parsed.step === 'articles-paa-queries' || parsed.step === 'articles-topics') ? 2048
      : 1024

    log.debug('cocoon suggest prompt built', { cocoonSlug: req.params.cocoonSlug, step: parsed.step, promptChars: prompt.length, maxTokens })

    const { suggestion, usage } = await collectStreamWithUsage(prompt, userMessage, maxTokens)

    log.info('cocoon suggest done', { cocoonSlug: req.params.cocoonSlug, step: parsed.step, isMerge, suggestionChars: suggestion.length })
    res.json({ data: { suggestion, usage } })
  } catch (err) {
    log.error(`POST /api/strategy/cocoon/${req.params.cocoonSlug}/suggest — ${(err as Error).message}`, { cocoonSlug: req.params.cocoonSlug, step: req.body?.step })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate cocoon suggestion' } })
  }
})

// =============================================
// Deepen & Consolidate (shared by article + cocoon)
// =============================================

async function handleDeepen(req: import('express').Request, res: import('express').Response, label: string) {
  try {
    const parsed = strategyDeepenRequestSchema.parse(req.body)
    log.info(label, { step: parsed.step, existingSubQuestions: parsed.existingSubQuestions.length })
    const prompt = await deepenPrompt(parsed)

    const { suggestion: result, usage } = await collectStreamWithUsage(prompt, `Génère une sous-question pour l'étape "${parsed.step}"`, 512)
    log.debug('deepen AI done', { step: parsed.step, resultChars: result.length })

    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[0])
      log.info('deepen parsed JSON sub-question', { step: parsed.step })
      res.json({ data: { question: obj.question, description: obj.description, usage } })
    } else {
      log.warn('deepen fallback — no JSON found, using raw text', { step: parsed.step, resultChars: result.length })
      res.json({ data: { question: result.trim(), description: '', usage } })
    }
  } catch (err) {
    log.error(`${label} — ${(err as Error).message}`, { step: req.body?.step })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate sub-question' } })
  }
}

async function handleConsolidate(req: import('express').Request, res: import('express').Response, label: string) {
  try {
    const parsed = strategyConsolidateRequestSchema.parse(req.body)
    log.info(label, { step: parsed.step, subAnswers: parsed.subAnswers.length })
    const prompt = await consolidatePrompt(parsed)

    const { suggestion: consolidated, usage } = await collectStreamWithUsage(prompt, `Consolide les réponses pour l'étape "${parsed.step}"`, 1024)

    log.info('consolidate done', { step: parsed.step, consolidatedChars: consolidated.length })
    res.json({ data: { consolidated, usage } })
  } catch (err) {
    log.error(`${label} — ${(err as Error).message}`, { step: req.body?.step })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to consolidate answers' } })
  }
}

async function handleEnrich(req: import('express').Request, res: import('express').Response, label: string) {
  try {
    const parsed = strategyEnrichRequestSchema.parse(req.body)
    log.info(label, { step: parsed.step, existingValidatedChars: parsed.existingValidated.length })
    const prompt = await enrichPrompt(parsed)

    const { suggestion: enriched, usage } = await collectStreamWithUsage(prompt, `Enrichis le texte validé avec la sous-réponse pour l'étape "${parsed.step}"`, 1024)

    log.info('enrich done', { step: parsed.step, enrichedChars: enriched.length })
    res.json({ data: { enriched, usage } })
  } catch (err) {
    log.error(`${label} — ${(err as Error).message}`, { step: req.body?.step })
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to enrich answer' } })
  }
}

/** POST /api/strategy/:id/deepen */
router.post('/strategy/:id/deepen', (req, res) =>
  handleDeepen(req, res, `POST /api/strategy/${req.params.id}/deepen`))

/** POST /api/strategy/:id/consolidate */
router.post('/strategy/:id/consolidate', (req, res) =>
  handleConsolidate(req, res, `POST /api/strategy/${req.params.id}/consolidate`))

/** POST /api/strategy/cocoon/:cocoonSlug/deepen */
router.post('/strategy/cocoon/:cocoonSlug/deepen', (req, res) =>
  handleDeepen(req, res, `POST /api/strategy/cocoon/${req.params.cocoonSlug}/deepen`))

/** POST /api/strategy/cocoon/:cocoonSlug/consolidate */
router.post('/strategy/cocoon/:cocoonSlug/consolidate', (req, res) =>
  handleConsolidate(req, res, `POST /api/strategy/cocoon/${req.params.cocoonSlug}/consolidate`))

/** POST /api/strategy/:id/enrich */
router.post('/strategy/:id/enrich', (req, res) =>
  handleEnrich(req, res, `POST /api/strategy/${req.params.id}/enrich`))

/** POST /api/strategy/cocoon/:cocoonSlug/enrich */
router.post('/strategy/cocoon/:cocoonSlug/enrich', (req, res) =>
  handleEnrich(req, res, `POST /api/strategy/cocoon/${req.params.cocoonSlug}/enrich`))

export default router
