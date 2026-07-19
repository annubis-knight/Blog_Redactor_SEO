import { Router } from 'express'
import { log } from '../../utils/logger.js'
import {
  placementSuggestRequestSchema,
  placementSuggestResponseSchema,
} from '../../../shared/schemas/auto-placement.schema.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { collectStreamWithUsage } from '../../utils/stream-usage.js'

const router = Router()

function extractJson(text: string): unknown {
  const stripped = text.replace(/```(?:json)?/gi, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Aucun objet JSON dans la réponse IA')
  return JSON.parse(match[0])
}

/** Formate les candidats présélectionnés en markdown pour le prompt. */
function formatCandidates(candidates: PlacementCandidates): string {
  return candidates
    .map((c, i) => {
      const titles = c.sampleTitles.length > 0
        ? c.sampleTitles.map((t) => `     - ${t}`).join('\n')
        : '     (aucun article)'
      const state = c.isEmpty
        ? 'COCON VIDE — prévu par l\'utilisateur, attend son article fondateur'
        : `${c.counts.pilier} pilier, ${c.counts.intermediaire} intermédiaire(s), ${c.counts.specifique} spécialisé(s)`
      return [
        `${i + 1}. Silo « ${c.siloName} » → cocon « ${c.cocoonName} »`,
        `   Proximité thématique mesurée : ${Math.round(c.affinity * 100)} %`,
        `   Composition : ${state}`,
        `   Niveaux manquants : ${c.missing.length > 0 ? c.missing.join(', ') : 'aucun'}`,
        `   Articles existants :`,
        titles,
      ].join('\n')
    })
    .join('\n\n')
}

type PlacementCandidates = ReturnType<typeof placementSuggestRequestSchema.parse>['candidates']

/**
 * POST /api/generate/placement-suggest — choisit l'emplacement d'un article
 * dans l'arbre SEO parmi des candidats présélectionnés côté CLI.
 */
router.post('/generate/placement-suggest', async (req, res) => {
  const parsed = placementSuggestRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }

  const { idea, businessContext, articleTitle, pilierKeyword, painPoint, candidates } = parsed.data
  log.info('POST /api/generate/placement-suggest', { idea: idea.slice(0, 60), candidates: candidates.length })

  try {
    const systemPrompt = await loadPrompt('auto-placement', {
      idea,
      businessContext: businessContext || 'Non précisé',
      articleTitle: articleTitle || 'Non précisé',
      pilierKeyword: pilierKeyword || 'Non précisé',
      painPoint: painPoint || 'Non précisé',
      candidates: formatCandidates(candidates),
    }, { escapeKeys: ['idea', 'businessContext', 'painPoint'] })

    const userMessage = 'Choisis l\'emplacement de l\'article au format JSON strict (placement-suggest).'
    const { text, usage } = await collectStreamWithUsage(systemPrompt, userMessage, 512)

    let placement
    try {
      placement = placementSuggestResponseSchema.parse(extractJson(text))
    } catch (parseErr) {
      log.warn(`placement-suggest: réponse IA non conforme — ${(parseErr as Error).message}`)
      res.status(502).json({ error: { code: 'AI_PARSE_ERROR', message: 'Réponse IA non exploitable (JSON attendu)' } })
      return
    }

    log.info('placement-suggest done', {
      silo: placement.siloName,
      cocoon: placement.cocoonName,
      level: placement.level,
      createCocoon: placement.createCocoon,
    })
    res.json({ data: { placement, usage } })
  } catch (err) {
    log.error(`POST /api/generate/placement-suggest — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Échec de la proposition d\'emplacement' } })
  }
})

export default router
