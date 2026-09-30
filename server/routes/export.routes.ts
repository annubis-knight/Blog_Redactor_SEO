import { Router } from 'express'
import { log } from '../utils/logger.js'
import { buildArticlePage } from '../services/article/export.service.js'

const router = Router()

/**
 * POST /api/export/:id — la page HTML à publier (FR-RED-EXPORT-HTML). L'écran
 * la demande juste après la porte de publication : le fichier téléchargé est
 * donc toujours le texte que la porte vient de juger.
 */
router.post('/export/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Identifiant d’article invalide.' } })
    return
  }

  try {
    const page = await buildArticlePage(id)
    if (!page.ok) {
      res.status(page.status).json({ error: { code: page.code, message: page.message } })
      return
    }
    res.json({ data: { html: page.html, id } })
  } catch (err) {
    log.error(`POST /api/export/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Export impossible.' } })
  }
})

/** GET /api/preview/:id — la même page, CSS incluse, sans changer le statut. */
router.get('/preview/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Identifiant d’article invalide.' } })
    return
  }

  try {
    const page = await buildArticlePage(id, { embedCss: true })
    if (!page.ok) {
      res.status(page.status).json({ error: { code: page.code, message: page.message } })
      return
    }
    res.json({ data: { html: page.html, id, title: page.title } })
  } catch (err) {
    log.error(`GET /api/preview/${id} — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Aperçu impossible.' } })
  }
})

export default router
