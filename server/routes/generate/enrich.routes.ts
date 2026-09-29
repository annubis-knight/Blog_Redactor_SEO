import { Router, type Request, type Response } from 'express'
import { log } from '../../utils/logger.js'
import {
  generateEnrichRequestSchema,
  generateSectionRewriteRequestSchema,
} from '../../../shared/schemas/generate.schema.js'
import { ENRICHMENT_PASSES, type EnrichmentPass } from '../../../shared/verifiers/enrichment.js'
import { proposeChapter, type ProposalInput } from '../../services/article/enrichment.service.js'
import { SSE_HEADERS, pickStrategyContext } from './_helpers.js'
import { getArticleById, getArticleChildren } from '../../services/infra/data.service.js'
import { listChapters, sectionKey } from '../../../shared/chapters.js'
import { getStrategy } from '../../services/strategy/strategy.service.js'
import { getCocoonStrategy } from '../../services/strategy/cocoon-strategy.service.js'
import { parseArticleLevel } from '../../../shared/utils/article-level.js'

const router = Router()

/** Une recherche web peut durer plus d'une minute : un commentaire SSE garde la connexion ouverte. */
const KEEP_ALIVE_MS = 15_000

const isPass = (value: string): value is EnrichmentPass => (ENRICHMENT_PASSES as readonly string[]).includes(value)

/**
 * Accumule puis valide (comme l'humanisation) : la proposition n'est envoyée
 * qu'une fois vérifiée, en un seul événement `done`. Une erreur (Claude absent
 * pour la passe sources, quota…) part en événement `error`, avec son message.
 */
async function streamProposal(req: Request, res: Response, input: ProposalInput): Promise<void> {
  const found = await getArticleById(input.articleId)
  if (!found) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Article ${input.articleId} introuvable` } })
    return
  }
  req.socket.setTimeout(0)
  res.writeHead(200, SSE_HEADERS)
  const keepAlive = setInterval(() => res.write(': en cours\n\n'), KEEP_ALIVE_MS)
  try {
    // Type et stratégie de l'article : la FAQ suit les règles du type, et chaque
    // passe écrit pour la cible et la douleur de l'article (R18, R22).
    const [strategy, cocoonStrategy] = await Promise.all([
      getStrategy(input.articleId).catch(() => null),
      getCocoonStrategy(found.cocoonName).catch(() => null),
    ])
    // Passe « Résumer » (C7) : le chapitre doit avoir donné naissance à un article.
    let child: ProposalInput['child']
    if (input.pass === 'resumes') {
      const title = listChapters(input.chapterHtml)[0]?.title ?? ''
      const born = (await getArticleChildren(input.articleId)).find(c => c.parentSection && sectionKey(c.parentSection) === sectionKey(title))
      if (!born) throw new Error(`Le chapitre « ${title} » n’a aucun article enfant : rien à résumer.`)
      child = { title: born.title, keyword: born.keyword }
    }
    const proposal = await proposeChapter({
      ...input,
      ...(child ? { child } : {}),
      articleType: parseArticleLevel(found.article.type),
      strategyContext: pickStrategyContext(strategy, cocoonStrategy),
    })
    log.info(`[enrich] ${input.pass} chapitre ${input.chapterIndex}`, {
      issues: proposal.issues.map(i => `${i.level}:${i.rule}`),
      webSources: proposal.webSources.length,
    })
    res.write(`event: done\ndata: ${JSON.stringify(proposal)}\n\n`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la proposition'
    log.error(`[enrich] ${input.pass} chapitre ${input.chapterIndex} — ${message}`)
    res.write(`event: error\ndata: ${JSON.stringify({ message, chapterIndex: input.chapterIndex })}\n\n`)
  } finally {
    clearInterval(keepAlive)
    res.end()
  }
}

/**
 * POST /api/generate/enrich/:pass — une passe d'enrichissement sur UN chapitre
 * (FR-RED-ENRICH-PASSES). Passes : sources (recherche web, FR-RED-ENRICH-SOURCES),
 * exemples, tableaux, images, faq. Pour la FAQ, `chapterHtml` est vide : elle
 * produit un chapitre à insérer avant `chapterIndex`.
 */
router.post('/generate/enrich/:pass', async (req, res) => {
  const pass = String(req.params.pass)
  if (!isPass(pass)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Passe inconnue : ${pass}. Passes : ${ENRICHMENT_PASSES.join(', ')}.` } })
    return
  }
  const parsed = generateEnrichRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  if (pass !== 'faq' && !parsed.data.chapterHtml.trim()) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Le chapitre à enrichir est vide.' } })
    return
  }
  await streamProposal(req, res, { pass, ...parsed.data })
})

/**
 * POST /api/generate/section-rewrite — réécrire UN chapitre selon une consigne,
 * en voyant l'article entier (FR-RED-SECTION-REWRITE).
 */
router.post('/generate/section-rewrite', async (req, res) => {
  const parsed = generateSectionRewriteRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } })
    return
  }
  await streamProposal(req, res, { pass: 'reecriture', ...parsed.data })
})

export default router
