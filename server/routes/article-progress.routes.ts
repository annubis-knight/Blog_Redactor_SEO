import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getProgress, saveProgress, addCheck, removeCheck } from '../services/article-progress.service.js'
import { getField, saveField, addTerms } from '../services/semantic-field.service.js'
import { articleProgressSchema, addCheckSchema, saveSemanticFieldSchema, addSemanticTermsSchema } from '../../shared/schemas/article-progress.schema.js'

const router = Router()

// --- Article Progress ---

router.get('/articles/:slug/progress', async (req, res) => {
  try {
    const progress = await getProgress(req.params.slug)
    res.json({ data: progress })
  } catch (err) {
    log.error(`GET /api/articles/${req.params.slug}/progress — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get progress' } })
  }
})

router.put('/articles/:slug/progress', async (req, res) => {
  const parsed = articleProgressSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    const progress = await saveProgress(req.params.slug, parsed.data)
    res.json({ data: progress })
  } catch (err) {
    log.error(`PUT /api/articles/${req.params.slug}/progress — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save progress' } })
  }
})

router.post('/articles/:slug/progress/check', async (req, res) => {
  const parsed = addCheckSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    const progress = await addCheck(req.params.slug, parsed.data.check)
    res.json({ data: progress })
  } catch (err) {
    log.error(`POST /api/articles/${req.params.slug}/progress/check — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add check' } })
  }
})

router.post('/articles/:slug/progress/uncheck', async (req, res) => {
  const parsed = addCheckSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    const progress = await removeCheck(req.params.slug, parsed.data.check)
    res.json({ data: progress })
  } catch (err) {
    log.error(`POST /api/articles/${req.params.slug}/progress/uncheck — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove check' } })
  }
})

// --- Semantic Field ---

router.get('/articles/:slug/semantic-field', async (req, res) => {
  try {
    const field = await getField(req.params.slug)
    res.json({ data: field })
  } catch (err) {
    log.error(`GET /api/articles/${req.params.slug}/semantic-field — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get semantic field' } })
  }
})

router.put('/articles/:slug/semantic-field', async (req, res) => {
  const parsed = saveSemanticFieldSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    const field = await saveField(req.params.slug, parsed.data.terms)
    res.json({ data: field })
  } catch (err) {
    log.error(`PUT /api/articles/${req.params.slug}/semantic-field — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save semantic field' } })
  }
})

router.post('/articles/:slug/semantic-field/add', async (req, res) => {
  const parsed = addSemanticTermsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    const field = await addTerms(req.params.slug, parsed.data.terms)
    res.json({ data: field })
  } catch (err) {
    log.error(`POST /api/articles/${req.params.slug}/semantic-field/add — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add terms' } })
  }
})

export default router
