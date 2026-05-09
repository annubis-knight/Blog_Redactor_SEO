/**
 * AUTHORITY: PostgreSQL `keyword_serp_results` + `keyword_serp_scrapes` + `keyword_paa_questions`
 *            (writes only — single producer cross-domaine).
 *            Cache mémoire 1h module-scoped : Map<"keyword:lang:country", {result, cachedAt}>.
 * READS FROM: getSerpResultsFresh, reconstructSerpAnalysisResult, getPaaQuestions
 *             (depuis keyword-serp.service).
 * WRITES TO: scrape-corpus.fetchAndPersist (transaction unique via withSerpTransaction).
 * EXPOSES:   getHeadings(keyword), getTextContent(keyword), getPaaQuestions(keyword),
 *            fetchAndPersist(keyword, articleLevel).
 * CONSUMERS: lieutenants-analysis.service, lexique-analysis.service.
 * RELATED FR: FR-INFRA-SCRAPE-CORPUS-NEUTRE, NFR-MOT-LEXIQUE-DECOUPLAGE,
 *             NFR-MOT-SCHEMA-KEYWORD-DECOMPOSITION, NFR-INT-SERP-ONCE.
 * NEVER IMPORTS: tfidf.service, lieutenants-*.service, lexique-*.service
 *               (test grep architectural — AC.SCRAPE.1).
 *
 * Constantes : MEMORY_CACHE_TTL_MS = 1h, MEMORY_CACHE_MAX_ENTRIES = 100 (LRU).
 */
import { log } from '../../utils/logger.js'
import { fetchSerp, fetchPaa } from './dataforseo.service.js'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'
import type { HnNode } from '../../../shared/types/serp-analysis.types.js'
import { query } from '../../db/client.js'
import {
  getSerpResultsFresh,
  reconstructSerpAnalysisResult,
  getPaaQuestions as getPaaQuestionsRaw,
  upsertSerpResults,
  upsertSerpScrapes,
  upsertPaaQuestions,
  withSerpTransaction,
  type SerpResult,
  type SerpScrape,
  type PaaQuestionRow,
} from '../keyword/keyword-serp.service.js'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000
export const MEMORY_CACHE_MAX_ENTRIES = 100

const FETCH_TIMEOUT_MS = 10_000
const USER_AGENT = 'Mozilla/5.0 (compatible; BlogRedactorSEO/1.0; +https://example.com)'

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

export interface ScrapeCorpusResult {
  keyword: string
  lang: string
  country: string
  fromCache: 'memory' | 'db' | null
  scrapedAt: string
  serpResults: SerpResult[]
  scrapes: SerpScrape[]
  paaQuestions: PaaQuestionRow[]
}

export interface HeadingsRow {
  position: number
  url: string
  domain: string | null
  headings: HnNode[]
  isBlog: boolean | null
}

export interface TextContentRow {
  position: number
  url: string
  textContent: string | null
}

// ---------------------------------------------------------------------------
// Cache mémoire 1h LRU
// ---------------------------------------------------------------------------

interface MemoryCacheEntry {
  result: ScrapeCorpusResult
  cachedAt: number
  lastAccessedAt: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()

function buildCacheKey(keyword: string, lang: string, country: string): string {
  return `${keyword.toLowerCase()}:${lang}:${country}`
}

function getFromMemory(key: string): ScrapeCorpusResult | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  const age = Date.now() - entry.cachedAt
  if (age >= MEMORY_CACHE_TTL_MS) {
    memoryCache.delete(key)
    return null
  }
  entry.lastAccessedAt = Date.now()
  return { ...entry.result, fromCache: 'memory' }
}

function putInMemory(key: string, result: ScrapeCorpusResult): void {
  const now = Date.now()
  memoryCache.set(key, {
    result: { ...result, fromCache: null },
    cachedAt: now,
    lastAccessedAt: now,
  })
  evictIfNeeded()
}

function evictIfNeeded(): void {
  if (memoryCache.size <= MEMORY_CACHE_MAX_ENTRIES) return

  let oldestKey: string | null = null
  let oldestAccessed = Infinity
  for (const [k, entry] of memoryCache) {
    if (entry.lastAccessedAt < oldestAccessed) {
      oldestAccessed = entry.lastAccessedAt
      oldestKey = k
    }
  }
  if (oldestKey !== null) memoryCache.delete(oldestKey)
}

export function __resetMemoryCacheForTests(): void {
  memoryCache.clear()
}

export function __getMemoryCacheSizeForTests(): number {
  return memoryCache.size
}

// ---------------------------------------------------------------------------
// HTML helpers (ex serp-analysis.service.ts ; déplacés ici comme single source)
// ---------------------------------------------------------------------------

export function extractHeadings(html: string): HnNode[] {
  const headings: HnNode[] = []
  const regex = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const level = Number(match[1])
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

export function extractTextContent(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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

export function classifyIsBlog(url: string, domain: string, headings: HnNode[]): boolean {
  const domLower = domain.toLowerCase()
  if (INSTITUTIONAL_DOMAINS.has(domLower)) return false
  if (INSTITUTIONAL_DOMAIN_SUFFIXES.some(s => domLower.endsWith(s))) return false
  if (KNOWN_BLOG_DOMAINS.has(domLower)) return true
  if (domLower.endsWith('.substack.com')) return true
  if (BLOG_URL_PATTERNS.some(rx => rx.test(url))) return true
  const h2Count = headings.filter(h => h.level === 2).length
  if (h2Count >= 5) return true
  return false
}

// Helper interne réutilisable par serp-analysis.service.ts pour limiter la duplication
// jusqu'à ce que `analyzeSerpCompetitors` soit retiré (story C3).
export { fetchPageHtml as __fetchPageHtmlInternal }

// ---------------------------------------------------------------------------
// Read API — SELECTs scopés
// ---------------------------------------------------------------------------

interface HeadingsSqlRow {
  position: number
  url: string
  domain: string | null
  headings: unknown
  is_blog: boolean | null
}

export async function getHeadings(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<HeadingsRow[]> {
  const res = await query<HeadingsSqlRow>(
    `SELECT s.position, s.url, r.domain, s.headings, s.is_blog
       FROM keyword_serp_scrapes s
       LEFT JOIN keyword_serp_results r
         ON s.keyword = r.keyword AND s.lang = r.lang AND s.country = r.country AND s.position = r.position
      WHERE s.keyword = $1 AND s.lang = $2 AND s.country = $3
      ORDER BY s.position`,
    [keyword, lang, country],
  )
  return res.rows.map((r) => ({
    position: r.position,
    url: r.url,
    domain: r.domain,
    headings: Array.isArray(r.headings) ? (r.headings as HnNode[]) : [],
    isBlog: r.is_blog,
  }))
}

interface TextContentSqlRow {
  position: number
  url: string
  text_content: string | null
}

export async function getTextContent(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<TextContentRow[]> {
  const res = await query<TextContentSqlRow>(
    `SELECT position, url, text_content
       FROM keyword_serp_scrapes
      WHERE keyword = $1 AND lang = $2 AND country = $3
      ORDER BY position`,
    [keyword, lang, country],
  )
  return res.rows.map((r) => ({
    position: r.position,
    url: r.url,
    textContent: r.text_content,
  }))
}

export async function getPaaQuestions(
  keyword: string,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<PaaQuestionRow[]> {
  return getPaaQuestionsRaw(keyword, lang, country)
}

// ---------------------------------------------------------------------------
// Orchestration : fetchAndPersist
// ---------------------------------------------------------------------------

export async function fetchAndPersist(
  keyword: string,
  articleLevel: ArticleLevel,
  lang: string = 'fr',
  country: string = 'fr',
): Promise<ScrapeCorpusResult> {
  const cacheKey = buildCacheKey(keyword, lang, country)

  // 1) Cache mémoire 1h ?
  const cached = getFromMemory(cacheKey)
  if (cached) {
    log.debug(`scrape-corpus memory hit for "${keyword}"`)
    return cached
  }

  // 2) DB freshness 7j ?
  const dbFresh = await getSerpResultsFresh(keyword, lang, country)
  if (dbFresh && dbFresh.length > 0) {
    const reconstructed = await reconstructSerpAnalysisResult(keyword, lang, country)
    if (reconstructed) {
      const result: ScrapeCorpusResult = {
        keyword,
        lang,
        country,
        fromCache: 'db',
        scrapedAt: reconstructed.cachedAt,
        serpResults: dbFresh,
        scrapes: reconstructed.competitors.map((c) => ({
          keyword,
          lang,
          country,
          position: c.position,
          url: c.url,
          headings: c.headings,
          textContent: c.textContent,
          isBlog: c.isBlog ?? null,
          scrapedAt: reconstructed.cachedAt,
        })),
        paaQuestions: await getPaaQuestionsRaw(keyword, lang, country),
      }
      putInMemory(cacheKey, result)
      return result
    }
  }

  // 3) Fetch externe + persist
  log.info(`scrape-corpus fetching SERP for "${keyword}" (level: ${articleLevel})`)
  const totalStart = Date.now()

  const [serp, paa] = await Promise.all([fetchSerp(keyword), fetchPaa(keyword)])

  const scrapeAttempts = await Promise.all(
    serp.map(async (sr) => {
      try {
        const html = await fetchPageHtml(sr.url)
        const headings = extractHeadings(html)
        const textContent = extractTextContent(html)
        const isBlog = classifyIsBlog(sr.url, sr.domain, headings)
        return {
          position: sr.position,
          title: sr.title,
          url: sr.url,
          domain: sr.domain,
          headings,
          textContent,
          isBlog,
          fetchError: undefined as string | undefined,
        }
      } catch (err) {
        const isBlog = classifyIsBlog(sr.url, sr.domain, [])
        return {
          position: sr.position,
          title: sr.title,
          url: sr.url,
          domain: sr.domain,
          headings: [] as HnNode[],
          textContent: '',
          isBlog,
          fetchError: (err as Error).message,
        }
      }
    }),
  )

  const scrapedAt = new Date().toISOString()

  await withSerpTransaction(async (client) => {
    // Garantit la row parent keyword_metrics(keyword, lang, country) pour les FKs.
    await client.query(
      `INSERT INTO keyword_metrics (keyword, lang, country, fetched_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (keyword, lang, country) DO UPDATE SET fetched_at = NOW()`,
      [keyword, lang, country],
    )

    if (scrapeAttempts.length > 0) {
      await upsertSerpResults(
        keyword,
        scrapeAttempts.map((c) => ({
          position: c.position,
          url: c.url,
          title: c.title,
          domain: c.domain,
        })),
        lang,
        country,
        client,
      )
      await upsertSerpScrapes(
        keyword,
        scrapeAttempts.map((c) => ({
          position: c.position,
          url: c.url,
          headings: c.headings,
          textContent: c.textContent || null,
          isBlog: c.isBlog ?? null,
        })),
        lang,
        country,
        client,
      )
    }

    if (paa.length > 0) {
      await upsertPaaQuestions(
        keyword,
        paa.map((p) => ({ question: p.question, answer: p.answer ?? null, depth: 1 })),
        lang,
        country,
        client,
      )
    }
  })

  const result: ScrapeCorpusResult = {
    keyword,
    lang,
    country,
    fromCache: null,
    scrapedAt,
    serpResults: scrapeAttempts.map((c) => ({
      keyword,
      lang,
      country,
      position: c.position,
      url: c.url,
      title: c.title,
      domain: c.domain,
      fetchedAt: scrapedAt,
    })),
    scrapes: scrapeAttempts.map((c) => ({
      keyword,
      lang,
      country,
      position: c.position,
      url: c.url,
      headings: c.headings,
      textContent: c.textContent || null,
      isBlog: c.isBlog ?? null,
      scrapedAt,
    })),
    paaQuestions: await getPaaQuestionsRaw(keyword, lang, country),
  }

  putInMemory(cacheKey, result)
  log.info(`scrape-corpus done for "${keyword}": ${scrapeAttempts.length} scrapes, ${paa.length} PAA`, { ms: Date.now() - totalStart })
  return result
}
