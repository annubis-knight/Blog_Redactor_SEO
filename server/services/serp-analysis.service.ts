import { join } from 'path'
import { log } from '../utils/logger.js'
import { slugify, readCached, writeCached, isFresh } from '../utils/cache.js'
import { fetchSerp, fetchPaa } from './dataforseo.service.js'
import type { SerpCompetitor, SerpAnalysisResult, HnNode } from '../../shared/types/serp-analysis.types.js'
import type { ArticleLevel } from '../../shared/types/keyword-validate.types.js'

export const CACHE_DIR = join(process.cwd(), 'data', 'cache', 'serp')
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

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

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// Core analysis function
// ---------------------------------------------------------------------------

export async function analyzeSerpCompetitors(
  keyword: string,
  articleLevel: ArticleLevel,
): Promise<SerpAnalysisResult> {
  const cacheKey = slugify(keyword)

  // Check cache first
  const cached = await readCached<SerpAnalysisResult>(CACHE_DIR, cacheKey)
  if (cached && isFresh(cached.cachedAt, CACHE_TTL_MS)) {
    log.debug(`SERP cache hit for "${keyword}"`)
    return { ...cached.data, fromCache: true }
  }

  log.info(`Analyzing SERP competitors for "${keyword}" (level: ${articleLevel})`)

  // Fetch SERP results + PAA in parallel
  const [serpResults, paaQuestions] = await Promise.all([
    fetchSerp(keyword),
    fetchPaa(keyword),
  ])

  // Fetch HTML for each competitor URL in parallel
  const competitors: SerpCompetitor[] = await Promise.all(
    serpResults.map(async (sr) => {
      try {
        const html = await fetchPageHtml(sr.url)
        return {
          position: sr.position,
          title: sr.title,
          url: sr.url,
          domain: sr.domain,
          headings: extractHeadings(html),
          textContent: extractTextContent(html),
        }
      } catch (err) {
        log.warn(`Failed to fetch ${sr.url}: ${(err as Error).message}`)
        return {
          position: sr.position,
          title: sr.title,
          url: sr.url,
          domain: sr.domain,
          headings: [],
          textContent: '',
          fetchError: (err as Error).message,
        }
      }
    }),
  )

  const result: SerpAnalysisResult = {
    keyword,
    articleLevel,
    competitors,
    paaQuestions,
    maxScraped: competitors.length,
    cachedAt: new Date().toISOString(),
    fromCache: false,
  }

  // Write to cache (includes raw textContent for TF-IDF cascade — NFR11)
  await writeCached(CACHE_DIR, cacheKey, result)

  log.info(`SERP analysis done for "${keyword}": ${competitors.length} competitors, ${paaQuestions.length} PAA`)

  return result
}
