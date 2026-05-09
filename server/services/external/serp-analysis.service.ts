import { log } from '../../utils/logger.js'
import { fetchSerp, fetchPaa } from './dataforseo.service.js'
import type { SerpCompetitor, SerpAnalysisResult, HnNode } from '../../../shared/types/serp-analysis.types.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'
import {
  upsertSerpResults,
  upsertSerpScrapes,
  upsertPaaQuestions,
  withSerpTransaction,
} from '../keyword/keyword-serp.service.js'
import {
  extractHeadings,
  extractTextContent,
  classifyIsBlog,
  __fetchPageHtmlInternal as fetchPageHtml,
} from './scrape-corpus.service.js'

// Story A1 (chantier 2) — les helpers HTML (extractHeadings, extractTextContent,
// classifyIsBlog, fetchPageHtml) sont désormais propriété de scrape-corpus.service.
// On les re-exporte ici pour la compatibilité des tests legacy
// (`tests/unit/services/serp-analysis.test.ts`) jusqu'à C3.
export { extractHeadings, extractTextContent }

// Persistence SERP : les artefacts sont écrits atomiquement dans les 4 tables
// filles (keyword_serp_results / _scrapes / _paa_questions) via
// keyword-serp.service. Cf. NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION.

// ---------------------------------------------------------------------------
// Core analysis function (legacy — @deprecated, supprimé en Story C3 chantier 2)
// ---------------------------------------------------------------------------

/**
 * @deprecated Story C1 (chantier 2 — découplage Lieutenants/Lexique) : la route
 * `POST /api/serp/analyze` est désormais branchée sur `scrape-corpus.fetchAndPersist`
 * (single producer cross-domaine) au lieu de cette fonction. Conservée pendant la
 * fenêtre C1→C3 pour les tests legacy uniquement (`tests/unit/services/serp-analysis.test.ts`,
 * `tests/integration/serp-analyze-dual-write.test.ts`). Sera supprimée en Story C3.
 *
 * Migration : utilisez `scrape-corpus.fetchAndPersist(keyword, articleLevel)` directement
 * (côté backend) ou consommez `lieutenants-analysis.proposeLieutenants` pour les contextes
 * Lieutenants spécifiques.
 */
export async function analyzeSerpCompetitors(
  keyword: string,
  articleLevel: ArticleLevel,
): Promise<SerpAnalysisResult> {
  log.warn(
    `analyzeSerpCompetitors is deprecated (chantier 2 Story C1) — use scrape-corpus.fetchAndPersist or lieutenants-analysis.proposeLieutenants. Will be removed in Story C3.`,
    { keyword, articleLevel },
  )
  // Story C2 — la cache check est dans la route (`/serp/analyze`) via
  // getSerpResultsFresh. Ce service ne fait que l'external fetch + la persist.
  log.info(`Analyzing SERP competitors for "${keyword}" (level: ${articleLevel})`)
  const totalStart = Date.now()

  // Fetch SERP results + PAA in parallel
  const [serpResults, paaQuestions] = await Promise.all([
    fetchSerp(keyword),
    fetchPaa(keyword),
  ])
  log.debug('SERP + PAA fetched', { keyword, serpCount: serpResults.length, paaCount: paaQuestions.length, ms: Date.now() - totalStart })

  // Fetch HTML for each competitor URL in parallel
  const fetchStart = Date.now()
  const competitors: SerpCompetitor[] = await Promise.all(
    serpResults.map(async (sr) => {
      try {
        const html = await fetchPageHtml(sr.url)
        const headings = extractHeadings(html)
        const textContent = extractTextContent(html)
        const isBlog = classifyIsBlog(sr.url, sr.domain, headings)
        log.debug('Competitor scraped', { url: sr.url, htmlSize: html.length, headings: headings.length, textSize: textContent.length, isBlog })
        return {
          position: sr.position,
          title: sr.title,
          url: sr.url,
          domain: sr.domain,
          headings,
          textContent,
          isBlog,
        }
      } catch (err) {
        log.warn(`Failed to fetch ${sr.url}: ${(err as Error).message}`)
        const isBlog = classifyIsBlog(sr.url, sr.domain, [] as HnNode[])
        return {
          position: sr.position,
          title: sr.title,
          url: sr.url,
          domain: sr.domain,
          headings: [],
          textContent: '',
          fetchError: (err as Error).message,
          isBlog,
        }
      }
    }),
  )

  const successCount = competitors.filter(c => !('fetchError' in c)).length
  const failCount = competitors.length - successCount
  log.info('Competitor pages fetched', { keyword, total: competitors.length, success: successCount, failed: failCount, ms: Date.now() - fetchStart })

  const result: SerpAnalysisResult = {
    keyword,
    articleLevel,
    competitors,
    paaQuestions,
    maxScraped: competitors.length,
    cachedAt: new Date().toISOString(),
    fromCache: false,
  }

  // Story C4 — persistence atomique sur les 4 tables filles uniquement.
  await withSerpTransaction(async (client) => {
    await client.query(
      `INSERT INTO keyword_metrics (keyword, lang, country, fetched_at)
       VALUES ($1, 'fr', 'fr', NOW())
       ON CONFLICT (keyword, lang, country) DO UPDATE SET fetched_at = NOW()`,
      [keyword],
    )

    if (competitors.length > 0) {
      await upsertSerpResults(
        keyword,
        competitors.map((c) => ({
          position: c.position,
          url: c.url,
          title: c.title,
          domain: c.domain,
        })),
        'fr',
        'fr',
        client,
      )

      await upsertSerpScrapes(
        keyword,
        competitors.map((c) => ({
          position: c.position,
          url: c.url,
          headings: c.headings,
          textContent: c.textContent || null,
          isBlog: c.isBlog ?? null,
        })),
        'fr',
        'fr',
        client,
      )
    }

    if (paaQuestions.length > 0) {
      await upsertPaaQuestions(
        keyword,
        paaQuestions.map((p) => ({
          question: p.question,
          answer: p.answer ?? null,
          depth: 1,
        })),
        'fr',
        'fr',
        client,
      )
    }
  })

  log.info(`SERP analysis done for "${keyword}": ${competitors.length} competitors, ${paaQuestions.length} PAA`, { ms: Date.now() - totalStart })

  return result
}
