/**
 * AUTHORITY: PostgreSQL `lexique_explorations` (writes via lexique-exploration.service.saveLexiqueTfidf
 *            quand `articleId` est fourni dans les opts).
 *            Service métier Lexique. Lit text_content via scrape-corpus,
 *            calcule TF-IDF via tfidf.service.
 *
 * READS FROM: scrape-corpus.fetchAndPersist (optionnel via triggerScrapeIfMissing),
 *             scrape-corpus.getTextContent, tfidf.service.extractTfidf.
 * WRITES TO: lexique-exploration.service.saveLexiqueTfidf (si opts.articleId fourni).
 * EXPOSES: analyzeLexique(keyword, opts?), LexiqueScrapeMissingError.
 * CONSUMERS: server/routes/serp-analysis.routes (POST /api/serp/tfidf, bascule en C2).
 * RELATED FR: FR-LEX-SCRAPE-DEDIE, FR-LEX-TFIDF, FR-LEX-MULTI-KEYWORD.
 *
 * NEVER IMPORTS: lieutenants-*.service, components/moteur/Lieutenants*
 *               (test grep architectural — AC.LEX-SCRAPE.1 / AC.DECOUPLAGE.3,
 *                vérifié en Story B3).
 * NEVER READS: headings du scrape (test mock count — AC.LEX-SCRAPE.2,
 *             vérifié dans tests/unit/services/lexique-analysis.service.test.ts).
 *
 * Le service ne fait PAS l'appel IA Lexique : l'IA est portée par
 * keyword-ai-panel.routes.ts (FR-LEX-AI-PANEL — hors périmètre du chantier 2).
 * Si un appel IA est ajouté ici plus tard, ce sera une story dédiée.
 */
import { log } from '../../utils/logger.js'
import {
  fetchAndPersist as scrapeCorpusFetchAndPersist,
  getTextContent as scrapeCorpusGetTextContent,
} from '../external/scrape-corpus.service.js'
import { extractTfidf } from './tfidf.service.js'
import { saveLexiqueTfidf } from './lexique-exploration.service.js'
import type { TfidfResult } from '../../../shared/types/serp-analysis.types.js'

/**
 * Erreur métier : pas de scrape SERP disponible pour ce keyword.
 * Message verbatim préservé pour compat front (AC.C2.2 — chantier 2 + chantier 1).
 */
export class LexiqueScrapeMissingError extends Error {
  constructor() {
    super("Lancez d'abord l'analyse SERP dans l'onglet Lieutenants")
    this.name = 'LexiqueScrapeMissingError'
  }
}

export interface AnalyzeLexiqueOptions {
  articleId?: number
  triggerScrapeIfMissing?: boolean
  lang?: string
  country?: string
}

export interface LexiqueAnalysisServiceResult {
  tfidfResult: TfidfResult
}

/**
 * Calcule le TF-IDF Lexique pour un keyword donné, avec persistance optionnelle.
 *
 * Pipeline :
 *   1. (si `triggerScrapeIfMissing=true`) déclenche le scrape via scrape-corpus.
 *   2. lit text_content via scrape-corpus.getTextContent (jamais headings).
 *   3. si vide → throw LexiqueScrapeMissingError (message verbatim).
 *   4. extractTfidf (réutilise tfidf.service).
 *   5. (si `articleId` fourni) persiste via saveLexiqueTfidf — best-effort.
 */
export async function analyzeLexique(
  keyword: string,
  opts: AnalyzeLexiqueOptions = {},
): Promise<LexiqueAnalysisServiceResult> {
  const lang = opts.lang ?? 'fr'
  const country = opts.country ?? 'fr'

  if (opts.triggerScrapeIfMissing === true) {
    // ArticleLevel = 'specifique' choisi par défaut : sémantique = "exploration
    // libre d'un keyword précis". Le niveau n'a pas d'effet structurel sur le
    // scrape (toujours 10 URLs), il sert au logging.
    await scrapeCorpusFetchAndPersist(keyword, 'specifique', lang, country)
  }

  const texts = await scrapeCorpusGetTextContent(keyword, lang, country)
  const validCount = texts.filter((t) => t.textContent !== null && t.textContent.length > 0).length
  if (validCount === 0) {
    throw new LexiqueScrapeMissingError()
  }

  const tfidfResult = await extractTfidf(keyword, lang, country)

  if (opts.articleId !== undefined) {
    try {
      await saveLexiqueTfidf(opts.articleId, keyword, tfidfResult)
    } catch (err) {
      log.warn(`lexique-analysis: persist tfidf failed — ${(err as Error).message}`)
    }
  }

  return { tfidfResult }
}
