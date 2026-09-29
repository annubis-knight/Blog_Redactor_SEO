/**
 * Portes de qualité et dérogations (FR-INFRA-VERIFIER-SHARED, FR-INFRA-GATE-WAIVER).
 *
 *   GET  /articles/:id/gates/:gateId          → évaluation (alertes, empreinte, verdict)
 *   POST /articles/:id/gates/:gateId/waivers  → enregistre des dérogations, renvoie la nouvelle évaluation
 *   GET  /articles/:id/waivers                → dérogations posées sur l'article
 *
 * Les points de passage (checks du Moteur, publication) appellent la même
 * évaluation et refusent en 422 `GATE_BLOCKED` : voir articles.routes.ts.
 */
import { Router } from 'express'
import { z } from 'zod'
import { log } from '../utils/logger.js'
import { evaluateArticleGate, listArticleWaivers, saveGateWaivers } from '../services/gates/gate.service.js'
import { GATE_IDS, WAIVER_CATEGORIES } from '../../shared/verifiers/gate.js'

const router = Router()

const gateIdSchema = z.enum(GATE_IDS)

const waiversBodySchema = z.object({
  keyword: z.string().trim().min(1).max(200).optional(),
  waivers: z.array(z.object({
    rule: z.string().min(1).max(300),
    category: z.enum(WAIVER_CATEGORIES).nullable().optional(),
    reason: z.string().max(2000).nullable().optional(),
  })).min(1).max(50),
})

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10)
  return Number.isNaN(id) ? null : id
}

router.get('/articles/:id/gates/:gateId', async (req, res) => {
  const id = parseId(req.params.id)
  const gateId = gateIdSchema.safeParse(req.params.gateId)
  if (id === null || !gateId.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Identifiant d’article ou de porte invalide' } })
    return
  }
  const keyword = typeof req.query.keyword === 'string' && req.query.keyword.trim() ? req.query.keyword.trim() : undefined
  try {
    res.json({ data: await evaluateArticleGate(id, gateId.data, { keyword }) })
  } catch (err) {
    const message = (err as Error).message
    log.error(`GET /api/articles/${id}/gates/${gateId.data} — ${message}`)
    res.status(message.includes('introuvable') ? 404 : 500).json({ error: { code: 'GATE_ERROR', message } })
  }
})

router.post('/articles/:id/gates/:gateId/waivers', async (req, res) => {
  const id = parseId(req.params.id)
  const gateId = gateIdSchema.safeParse(req.params.gateId)
  const body = waiversBodySchema.safeParse(req.body)
  if (id === null || !gateId.success || !body.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: body.success ? 'Identifiant invalide' : body.error.message } })
    return
  }
  try {
    const { evaluation, refused } = await saveGateWaivers(id, gateId.data, body.data.waivers, { keyword: body.data.keyword })
    res.json({ data: { evaluation, refused } })
  } catch (err) {
    const message = (err as Error).message
    log.error(`POST /api/articles/${id}/gates/${gateId.data}/waivers — ${message}`)
    res.status(message.includes('introuvable') ? 404 : 500).json({ error: { code: 'GATE_ERROR', message } })
  }
})

router.get('/articles/:id/waivers', async (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Article ID must be a number' } })
    return
  }
  try {
    res.json({ data: await listArticleWaivers(id) })
  } catch (err) {
    log.error(`GET /api/articles/${id}/waivers — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list waivers' } })
  }
})

export default router
