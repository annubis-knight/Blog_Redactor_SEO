import { Router } from 'express'
import { log } from '../utils/logger.js'
import { serpAnalyzeBodySchema } from '../../shared/schemas/serp-analysis.schema.js'
import { respondWithError } from '../utils/api-error.js'
import {
  getSerpResultsFresh,
  reconstructSerpAnalysisResult,
} from '../services/keyword/keyword-serp.service.js'
import { fetchAndPersist as scrapeCorpusFetchAndPersist } from '../services/external/scrape-corpus.service.js'
import {
  analyzeLexique,
  LexiqueScrapeMissingError,
} from '../services/keyword/lexique-analysis.service.js'
import type { SerpAnalysisResult, SerpCompetitor, HnNode } from '../../shared/types/serp-analysis.types.js'

// Story C2 (chantier 1) — la cache check freshness lit `keyword_serp_results`.
// Story C1 (chantier 2) — sur cache miss, la route appelle désormais
// scrape-corpus.fetchAndPersist (single producer cross-domaine).
// Story C3 (chantier 2) — analyzeSerpCompetitors a été supprimé.

const router = Router()

/** POST /api/serp/analyze — SERP competitor analysis (cross-article DB-first) */
router.post('/serp/analyze', async (req, res) => {
  try {
    const parsed = serpAnalyzeBodySchema.safeParse(req.body)
    if (!parsed.success) {
      const message = parsed.error.issues.map(e => e.message).join(', ')
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } })
      return
    }

    const { keyword, articleLevel } = parsed.data

    log.info(`POST /api/serp/analyze — keyword="${keyword}" level="${articleLevel}"`)

    // Cache check sur keyword_serp_results.fetched_at (TTL 7j) — préserve
    // NFR-INT-SERP-ONCE (multi-article même keyword = 1 seul fetch externe).
    const fresh = await getSerpResultsFresh(keyword)
    if (fresh) {
      const reconstructed = await reconstructSerpAnalysisResult(keyword)
      if (reconstructed) {
        log.info(`SERP DB hit for keyword="${keyword}" (reconstructed)`)
        res.json({ data: { ...reconstructed, articleLevel } })
        return
      }
    }

    // Story C1 (chantier 2) — bascule vers scrape-corpus.fetchAndPersist.
    // Le cache mémoire 1h interne renforce NFR-INT-SERP-ONCE.
    const scrapeResult = await scrapeCorpusFetchAndPersist(keyword, articleLevel)

    const result = toSerpAnalysisResult(scrapeResult, articleLevel)
    res.json({ data: result })
  } catch (err) {
    log.error(`POST /api/serp/analyze — ${(err as Error).message}`)
    respondWithError(res, err, { message: 'SERP analysis failed' })
  }
})

/**
 * Reconstruit un SerpAnalysisResult (contrat HTTP préservé) à partir d'un
 * ScrapeCorpusResult retourné par scrape-corpus.fetchAndPersist.
 *
 * Inclut textContent et isBlog dans chaque competitor (consommateurs aval :
 * Lieutenants UI). La provenance DB (memory/db/null) est résolue en boolean
 * pour SerpAnalysisResult.fromCache.
 */
function toSerpAnalysisResult(
  scrape: Awaited<ReturnType<typeof scrapeCorpusFetchAndPersist>>,
  articleLevel: SerpAnalysisResult['articleLevel'],
): SerpAnalysisResult {
  const scrapesByPosition = new Map<number, (typeof scrape.scrapes)[number]>()
  for (const s of scrape.scrapes) scrapesByPosition.set(s.position, s)

  const competitors: SerpCompetitor[] = scrape.serpResults.map((sr) => {
    const sc = scrapesByPosition.get(sr.position)
    return {
      position: sr.position,
      title: sr.title ?? '',
      url: sr.url,
      domain: sr.domain ?? '',
      headings: (sc?.headings ?? []) as HnNode[],
      textContent: sc?.textContent ?? '',
      isBlog: sc?.isBlog ?? undefined,
    }
  })

  return {
    keyword: scrape.keyword,
    articleLevel,
    competitors,
    paaQuestions: scrape.paaQuestions.map((p) => ({ question: p.question, answer: p.answer })),
    maxScraped: competitors.length,
    cachedAt: scrape.scrapedAt,
    fromCache: scrape.fromCache !== null,
  }
}

/**
 * POST /api/serp/tfidf — TF-IDF extraction via lexique-analysis service (Story C2).
 *
 * Body:
 *   - keyword (required): string, will be trimmed.
 *   - articleId (optional): number > 0.
 *   - triggerScrapeIfMissing (optional, chantier 3 E1-S3 / FR-LEX-PRECHECK-SERP):
 *     boolean. Si true et qu'aucun scrape SERP n'existe pour ce keyword,
 *     déclenche le scrape DataForSEO en amont avant l'extraction TF-IDF.
 *     Honoré par analyzeLexique (AC.LEX-SCRAPE.3 chantier 2 livré).
 *     Si false / absent : préserve le comportement legacy (404 verbatim si
 *     pas de scrape — compat AC.C1.1 chantier 1 + AC.C2.2 chantier 2).
 */
router.post('/serp/tfidf', async (req, res) => {
  try {
    const { keyword, articleId, triggerScrapeIfMissing } = req.body as {
      keyword?: unknown
      articleId?: unknown
      triggerScrapeIfMissing?: unknown
    }

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'keyword is required' } })
      return
    }

    const trimmed = keyword.trim()
    const articleIdNum = Number(articleId)
    const hasArticleId = Number.isInteger(articleIdNum) && articleIdNum > 0
    const shouldTriggerScrape = triggerScrapeIfMissing === true

    // Story C2 (chantier 2) — délègue à lexique-analysis.service.
    // Sans triggerScrapeIfMissing, le service throw LexiqueScrapeMissingError
    // → 404 verbatim (préservé pour compat AC.C1.1 chantier 1 + AC.C2.2).
    try {
      const { tfidfResult } = await analyzeLexique(trimmed, {
        articleId: hasArticleId ? articleIdNum : undefined,
        triggerScrapeIfMissing: shouldTriggerScrape,
      })
      res.json({ data: tfidfResult })
    } catch (err) {
      if (err instanceof LexiqueScrapeMissingError) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } })
        return
      }
      throw err
    }
  } catch (err) {
    log.error(`POST /api/serp/tfidf — ${(err as Error).message}`)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'TF-IDF extraction failed' } })
  }
})

export default router
