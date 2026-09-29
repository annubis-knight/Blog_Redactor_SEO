import { Router } from 'express'
import { log } from '../utils/logger.js'
import { getCocoons, getArticlesByCocoon, getArticleKeywordsByCocoon } from '../services/infra/data.service.js'
import { getCocoonStrategy } from '../services/strategy/cocoon-strategy.service.js'
import { createCocoonArticle, attachCocoonArticle, CocoonArticleError, getCocoonTree } from '../services/article/cocoon-article.service.js'
import { createCocoonArticleSchema, attachCocoonArticleSchema, childCandidatesSchema } from '../../shared/schemas/article.schema.js'
import { proposeChildCandidates, ChildCandidatesError } from '../services/strategy/child-candidates.service.js'

const router = Router()

/** GET /api/cocoons — List all cocoons with stats */
router.get('/cocoons', async (_req, res) => {
  try {
    const cocoons = await getCocoons()
    res.json({ data: cocoons })
  } catch (err) {
    log.error(`GET /api/cocoons — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load cocoons' } })
  }
})

/** GET /api/cocoons/:id/articles — Articles for a specific cocoon */
router.get('/cocoons/:id/articles', async (req, res) => {
  try {
    const cocoonId = parseInt(req.params.id, 10)
    if (isNaN(cocoonId)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Cocoon ID must be a number' } })
      return
    }

    const articles = await getArticlesByCocoon(cocoonId)
    if (!articles) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Cocoon ${cocoonId} not found` } })
      return
    }

    res.json({ data: articles })
  } catch (err) {
    log.error(`GET /api/cocoons/${req.params.id}/articles — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load articles' } })
  }
})

/**
 * GET /api/cocoons/:cocoonId/tree — l'arbre réel du cocon : chaque article, s'il
 * est rédigé, et ses sections avec l'enfant qui en est né (FR-CER-CHILD-FROM-PILLAR-H2).
 */
router.get('/cocoons/:cocoonId/tree', async (req, res) => {
  const cocoonId = parseInt(req.params.cocoonId, 10)
  if (isNaN(cocoonId)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Cocoon ID must be a number' } })
    return
  }
  try {
    const tree = await getCocoonTree(cocoonId)
    if (!tree) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Cocoon ${cocoonId} not found` } })
      return
    }
    res.json({ data: tree })
  } catch (err) {
    log.error(`GET /api/cocoons/${cocoonId}/tree — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load cocoon tree' } })
  }
})

/**
 * POST /api/cocoons/:cocoonId/articles — crée UN article (FR-CER-COCOON-PROGRESSIVE).
 * Pilier d'abord ; un enfant naît d'une section de son parent rédigé. Refus :
 * 404 cocon inconnu, 409 `HIERARCHY_VIOLATION` (ordre du cocon), 409
 * `GATE_BLOCKED` (parent pas rédigé : `details` = évaluation de sa porte du
 * premier jet, l'écran ouvre l'alarme sur le parent), 422 `KEYWORD_NOT_MEASURED`,
 * 409 `SLUG_TAKEN`.
 */
router.post('/cocoons/:cocoonId/articles', async (req, res) => {
  const cocoonId = parseInt(req.params.cocoonId, 10)
  if (isNaN(cocoonId)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Cocoon ID must be a number' } })
    return
  }
  const parsed = createCocoonArticleSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    const article = await createCocoonArticle(cocoonId, parsed.data)
    res.status(201).json({ data: article })
  } catch (err) {
    if (err instanceof CocoonArticleError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } })
      return
    }
    log.error(`POST /api/cocoons/${cocoonId}/articles — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create article' } })
  }
})

/**
 * PUT /api/cocoons/:cocoonId/articles/:articleId/parent — rattache un article
 * existant à la section d'un parent (K8) : un article d'avant l'arbre, ou mal
 * placé. Mêmes refus qu'une création (409 HIERARCHY_VIOLATION / GATE_BLOCKED).
 */
router.put('/cocoons/:cocoonId/articles/:articleId/parent', async (req, res) => {
  const cocoonId = parseInt(req.params.cocoonId, 10)
  const articleId = parseInt(req.params.articleId, 10)
  if (isNaN(cocoonId) || isNaN(articleId)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Cocoon and article IDs must be numbers' } })
    return
  }
  const parsed = attachCocoonArticleSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  try {
    res.json({ data: await attachCocoonArticle(cocoonId, articleId, parsed.data) })
  } catch (err) {
    if (err instanceof CocoonArticleError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } })
      return
    }
    log.error(`PUT /api/cocoons/${cocoonId}/articles/${articleId}/parent — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to attach article' } })
  }
})

/**
 * POST /api/cocoons/:cocoonId/child-candidates — 3 à 5 mots-clés mesurés pour un
 * nouvel article (FR-CER-KEYWORD-REAL-DATA) : le pilier d'un cocon vide
 * (`parentId: null`), ou l'enfant d'une section libre d'un parent rédigé.
 * Action payante (IA + DataForSEO, base d'abord) : l'écran la déclenche sur un clic.
 */
router.post('/cocoons/:cocoonId/child-candidates', async (req, res) => {
  const cocoonId = parseInt(req.params.cocoonId, 10)
  if (isNaN(cocoonId)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Cocoon ID must be a number' } })
    return
  }
  const parsed = childCandidatesSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  req.socket?.setTimeout(0)
  try {
    const result = await proposeChildCandidates(cocoonId, { parentId: parsed.data.parentId ?? null, parentSection: parsed.data.parentSection ?? null })
    res.json({ data: result })
  } catch (err) {
    if (err instanceof ChildCandidatesError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } })
      return
    }
    log.error(`POST /api/cocoons/${cocoonId}/child-candidates — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to propose candidates' } })
  }
})

/** GET /api/cocoons/:id/strategy/context — Strategic context for Moteur */
router.get('/cocoons/:id/strategy/context', async (req, res) => {
  try {
    const cocoonId = Number(req.params.id)
    if (isNaN(cocoonId)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Cocoon ID must be a number' } })
      return
    }

    const cocoons = await getCocoons()
    const cocoon = cocoons.find(c => c.id === cocoonId)
    if (!cocoon) {
      res.json({ data: null })
      return
    }

    const slug = cocoon.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const strategy = await getCocoonStrategy(slug)
    if (!strategy) {
      res.json({ data: null })
      return
    }

    res.json({
      data: {
        cocoonName: cocoon.name,
        siloName: cocoon.siloName,
        cible: strategy.cible?.validated || null,
        douleur: strategy.douleur?.validated || null,
        angle: strategy.angle?.validated || null,
        promesse: strategy.promesse?.validated || null,
        cta: strategy.cta?.validated || null,
      },
    })
  } catch (err) {
    log.error(`GET /api/cocoons/${req.params.id}/strategy/context — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load strategy context' } })
  }
})

/** GET /api/cocoons/:cocoonName/capitaines — Capitaine keywords per article in a cocoon */
router.get('/cocoons/:cocoonName/capitaines', async (req, res) => {
  try {
    const cocoonName = decodeURIComponent(req.params.cocoonName)
    const articleKeywords = await getArticleKeywordsByCocoon(cocoonName)

    const capitainesMap: Record<number, string> = {}
    for (const ak of articleKeywords) {
      if (ak.capitaine) {
        capitainesMap[ak.articleId] = ak.capitaine
      }
    }

    res.json({ data: capitainesMap })
  } catch (err) {
    log.error(`GET /api/cocoons/:cocoonName/capitaines — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load capitaines' } })
  }
})

export default router
