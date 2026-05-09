/**
 * AUTHORITY: PostgreSQL `lieutenant_explorations` (writes via lieutenants-exploration.service
 *            ou les routes consommatrices — ce service ne persiste pas directement).
 *            Service métier Lieutenants — préparation des données scrape pour
 *            l'IA (la prompt SSE elle-même reste portée par
 *            `keyword-ai-panel.routes.ts:/keywords/:keyword/propose-lieutenants`).
 *
 * READS FROM: scrape-corpus.fetchAndPersist, scrape-corpus.getHeadings,
 *             scrape-corpus.getPaaQuestions.
 * WRITES TO: nothing direct — la persistance des propositions IA reste portée
 *            par la route SSE existante via lieutenants-exploration.service.
 * EXPOSES: proposeLieutenants(keyword, articleLevel, opts?).
 * CONSUMERS: server/routes/serp-analysis.routes (POST /api/serp/analyze, bascule en C1).
 * RELATED FR: FR-LIE-SCRAPE-DEDIE, FR-LIE-SERP-ANALYZE, NFR-MOT-LEXIQUE-DECOUPLAGE.
 *
 * NEVER IMPORTS: tfidf.service, lexique-*.service (test grep architectural —
 *               AC.LIE-SCRAPE.1 / AC.DECOUPLAGE.3, vérifié en Story B3).
 * NEVER READS: textContent du scrape (test mock count — AC.LIE-SCRAPE.2,
 *             vérifié dans tests/unit/services/lieutenants-analysis.service.test.ts).
 */
import { log } from '../../utils/logger.js'
import {
  fetchAndPersist as scrapeCorpusFetchAndPersist,
  getHeadings as scrapeCorpusGetHeadings,
  getPaaQuestions as scrapeCorpusGetPaaQuestions,
} from '../external/scrape-corpus.service.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'
import type { HnNode } from '../../../shared/types/serp-analysis.types.js'
import type { PaaQuestion } from '../../../shared/types/dataforseo.types.js'

export interface LieutenantCompetitorView {
  position: number
  title: string
  url: string
  domain: string
  headings: HnNode[]
  isBlog: boolean | null
}

export interface ProposeLieutenantsServiceResult {
  keyword: string
  articleLevel: ArticleLevel
  competitors: LieutenantCompetitorView[]
  paaQuestions: PaaQuestion[]
  maxScraped: number
  cachedAt: string
  fromCache: boolean
}

export interface ProposeLieutenantsOptions {
  lang?: string
  country?: string
}

/**
 * Prépare les données scrape SERP scopées Lieutenants pour un keyword donné.
 *
 * Pipeline :
 *   1. assure que les scrapes existent (`fetchAndPersist`, idempotent grâce au
 *      cache mémoire 1h + cache DB 7j).
 *   2. lit headings + isBlog (jamais textContent — c'est le rôle du Lexique).
 *   3. lit les questions PAA.
 *   4. assemble le `ProposeLieutenantsServiceResult` consommable par la route
 *      `/serp/analyze` (forme compat `SerpAnalysisResult` à un mapping près :
 *      `textContent: ''` ajouté côté route en C1 si nécessaire).
 *
 * L'appel IA SSE qui propose effectivement les Lieutenants reste porté par la
 * route `/keywords/:keyword/propose-lieutenants` (keyword-ai-panel.routes.ts).
 */
export async function proposeLieutenants(
  keyword: string,
  articleLevel: ArticleLevel,
  opts: ProposeLieutenantsOptions = {},
): Promise<ProposeLieutenantsServiceResult> {
  const lang = opts.lang ?? 'fr'
  const country = opts.country ?? 'fr'

  const scrape = await scrapeCorpusFetchAndPersist(keyword, articleLevel, lang, country)
  const headings = await scrapeCorpusGetHeadings(keyword, lang, country)
  const paa = await scrapeCorpusGetPaaQuestions(keyword, lang, country)

  const headingsByPosition = new Map<number, (typeof headings)[number]>()
  for (const h of headings) headingsByPosition.set(h.position, h)

  const competitors: LieutenantCompetitorView[] = scrape.serpResults.map((sr) => {
    const h = headingsByPosition.get(sr.position)
    return {
      position: sr.position,
      title: sr.title ?? '',
      url: sr.url,
      domain: sr.domain ?? '',
      headings: h?.headings ?? [],
      isBlog: h?.isBlog ?? null,
    }
  })

  log.debug(`lieutenants-analysis ready for "${keyword}"`, {
    competitors: competitors.length,
    paa: paa.length,
    fromCache: scrape.fromCache,
  })

  return {
    keyword,
    articleLevel,
    competitors,
    paaQuestions: paa.map((p) => ({ question: p.question, answer: p.answer })),
    maxScraped: competitors.length,
    cachedAt: scrape.scrapedAt,
    fromCache: scrape.fromCache !== null,
  }
}
