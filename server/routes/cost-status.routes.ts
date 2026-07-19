import { Router } from 'express'
import { costGuard } from '../services/external/dataforseo-cost-guard.js'

const router = Router()

/**
 * GET /api/cost-status — dépense DataForSEO de la fenêtre glissante courante.
 *
 * Le `costGuard` comptabilise déjà chaque appel (estimation tarifaire, pas une
 * vérité de facturation). L'exposer permet au CLI `auto:article` d'additionner
 * le coût SEO au coût IA dans son récap — sans ça le rapport sous-estimait la
 * dépense d'un facteur ~3,5 (cf. audit-auto-article-pipeline.md, défaut n°23).
 */
router.get('/cost-status', (_req, res) => {
  const status = costGuard.getStatus()
  res.json({
    data: {
      ...status,
      // Rappel explicite : estimation, pas la facturation réelle DataForSEO.
      estimated: true,
    },
  })
})

export default router
