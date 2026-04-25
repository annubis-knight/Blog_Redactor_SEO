import { log } from '../../utils/logger.js'
import { fetchSerp, fetchPaa } from './dataforseo.service.js'
import type { SerpCompetitor, SerpAnalysisResult, HnNode } from '../../../shared/types/serp-analysis.types.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'

// Sprint 15.5-bis — SERP results now stored in keyword_metrics.serp_raw_json (cross-article).

const FETCH_TIMEOUT_MS = 10_000
const USER_AGENT = 'Mozilla/5.0 (compatible; BlogRedactorSEO/1.0; +https://example.com)'

// ---------------------------------------------------------------------------
// HTML extraction helpers
// ---------------------------------------------------------------------------

/** Extract H1/H2/H3 headings from raw HTML */
export function extractHeadings(html: string): HnNode[] {
  const headings: HnNode[] = []
  const regex = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const level = Number(match[1])
    // Strip inner HTML tags, decode basic entities
    const text = match[2]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
    if (text) {
      headings.push({ level, text })
    }
  }
  return headings
}

/** Extract plain text content from HTML (for TF-IDF in Epic 8) */
export function extractTextContent(html: string): string {
  return html
    // Remove script/style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// Fetch a single competitor page HTML
// ---------------------------------------------------------------------------

async function fetchPageHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const start = Date.now()

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok) {
      log.warn('Page fetch HTTP error', { url, status: res.status, ms: Date.now() - start })
      throw new Error(`HTTP ${res.status}`)
    }
    const html = await res.text()
    log.debug('Page fetched', { url, size: html.length, ms: Date.now() - start })
    return html
  } catch (err) {
    const message = (err as Error).message
    if (message.includes('abort')) {
      log.warn('Page fetch timeout', { url, timeoutMs: FETCH_TIMEOUT_MS, ms: Date.now() - start })
    } else if (!message.startsWith('HTTP ')) {
      log.warn('Page fetch network error', { url, error: message, ms: Date.now() - start })
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// Sprint 4.4 — Blog classification heuristic.
// No extra API call: purely URL/domain patterns. This is cheap and fast; the
// user can later ask for an AI-driven refinement for borderline cases.
// ---------------------------------------------------------------------------

const BLOG_URL_PATTERNS = [
  /\/blog\//i,
  /\/articles?\//i,
  /\/news\//i,
  /\/insights?\//i,
  /\/magazine\//i,
  /\/journal\//i,
  /\/ressources?\//i,
  /\/guide\//i,
  /\/tutoriels?\//i,
]

const KNOWN_BLOG_DOMAINS = new Set([
  'medium.com',
  'dev.to',
  'hashnode.com',
  'substack.com',
  'wordpress.com',
  'blogger.com',
  'tumblr.com',
])

const INSTITUTIONAL_DOMAIN_SUFFIXES = ['.gouv.fr', '.gov', '.edu', '.europa.eu']
const INSTITUTIONAL_DOMAINS = new Set([
  'wikipedia.org',
  'fr.wikipedia.org',
  'linkedin.com',
  'pagesjaunes.fr',
  'societe.com',
  'infogreffe.fr',
])

function classifyIsBlog(url: string, domain: string, headings: HnNode[]): boolean {
  const domLower = domain.toLowerCase()
  // Institutional / directory sites → not a blog.
  if (INSTITUTIONAL_DOMAINS.has(domLower)) return false
  if (INSTITUTIONAL_DOMAIN_SUFFIXES.some(s => domLower.endsWith(s))) return false

  // Obvious blog platforms.
  if (KNOWN_BLOG_DOMAINS.has(domLower)) return true
  if (domLower.endsWith('.substack.com')) return true

  // URL path patterns.
  if (BLOG_URL_PATTERNS.some(rx => rx.test(url))) return true

  // Strong secondary signal: many H2 headings suggest long-form editorial content.
  const h2Count = headings.filter(h => h.level === 2).length
  if (h2Count >= 5) return true

  return false
}

// ---------------------------------------------------------------------------
// Core analysis function
// ---------------------------------------------------------------------------

export async function analyzeSerpCompetitors(
  keyword: string,
  articleLevel: ArticleLevel,
): Promise<SerpAnalysisResult> {
  // Sprint 15.5-bis — DB-first check is now performed in the route itself
  // (`/serp/analyze`) via keyword_metrics.serp_raw_json. This service only handles
  // the external fetch path.
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
        // Even on fetch error, we can still classify based on URL/domain alone.
        const isBlog = classifyIsBlog(sr.url, sr.domain, [])
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

  // Sprint 15.5-bis — persistence handled by caller via upsertKeywordSerp().
  log.info(`SERP analysis done for "${keyword}": ${competitors.length} competitors, ${paaQuestions.length} PAA`, { ms: Date.now() - totalStart })

  return result
}
