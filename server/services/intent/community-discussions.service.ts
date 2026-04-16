import { join } from 'path'
import { log } from '../../utils/logger.js'
import { fetchDataForSeo, slugify } from '../external/dataforseo.service.js'
import { getOrFetch } from '../../utils/cache.js'

// --- Types (local until Story 25.2 moves them to shared/types) ---

export interface TopDiscussion {
  title: string
  domain: string
  url: string
  timestamp: string
  votesCount: number
}

export interface CommunitySignal {
  discussionsCount: number
  uniqueDomains: string[]
  domainDiversity: number
  avgVotesCount: number
  freshness: 'recent' | 'moderate' | 'old'
  serpPosition: number | null
  topDiscussions: TopDiscussion[]
}

// --- Cache ---

const CACHE_DIR = join(process.cwd(), 'data', 'cache', 'discussions')
const CACHE_TTL_MS = 48 * 60 * 60 * 1000 // 48h

// --- Empty signal ---

const EMPTY_SIGNAL: CommunitySignal = {
  discussionsCount: 0,
  uniqueDomains: [],
  domainDiversity: 0,
  avgVotesCount: 0,
  freshness: 'old',
  serpPosition: null,
  topDiscussions: [],
}

// --- SERP API raw types ---

interface SerpAdvancedRawItem {
  type: string
  rank_group?: number
  title?: string
  url?: string
  domain?: string
  description?: string
  timestamp?: string
  rating?: {
    value?: number
    votes_count?: number
  }
  items?: Array<{
    type?: string
    title?: string
    url?: string
    domain?: string
    description?: string
    timestamp?: string
    rating?: {
      value?: number
      votes_count?: number
    }
  }>
}

interface SerpAdvancedRawResult {
  items: SerpAdvancedRawItem[] | null
}

// --- Helpers ---

function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/\/+$/, '')
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function computeFreshness(timestamps: string[]): 'recent' | 'moderate' | 'old' {
  if (timestamps.length === 0) return 'old'

  const now = Date.now()
  const threeMonthsMs = 3 * 30 * 24 * 60 * 60 * 1000
  const twelveMonthsMs = 12 * 30 * 24 * 60 * 60 * 1000

  // Use median timestamp
  const ages = timestamps
    .map(t => now - new Date(t).getTime())
    .filter(a => !isNaN(a))
    .sort((a, b) => a - b)

  if (ages.length === 0) return 'old'

  const median = ages[Math.floor(ages.length / 2)]

  if (median < threeMonthsMs) return 'recent'
  if (median < twelveMonthsMs) return 'moderate'
  return 'old'
}

// --- Core function ---

async function fetchSerpDiscussions(
  query: string,
  locationCode: number,
  languageCode: string,
): Promise<{ items: TopDiscussion[]; serpPosition: number | null }> {
  try {
    const result = await fetchDataForSeo<SerpAdvancedRawResult>(
      '/serp/google/organic/live/advanced',
      [{ keyword: query, location_code: locationCode, language_code: languageCode }],
    )

    const allItems = result.items ?? []
    const discussions: TopDiscussion[] = []
    let serpPosition: number | null = null

    for (const item of allItems) {
      // Check for discussions_and_forums SERP feature
      if (item.type === 'discussions_and_forums') {
        if (serpPosition === null) {
          serpPosition = item.rank_group ?? null
        }

        // The discussions_and_forums block contains nested items
        const nestedItems = item.items ?? []
        for (const nested of nestedItems) {
          if (nested.url) {
            discussions.push({
              title: nested.title ?? '',
              domain: extractDomain(nested.url),
              url: nested.url,
              timestamp: nested.timestamp ?? new Date().toISOString(),
              votesCount: nested.rating?.votes_count ?? 0,
            })
          }
        }

        // Also check if the top-level item itself has a URL (some API versions)
        if (item.url && nestedItems.length === 0) {
          discussions.push({
            title: item.title ?? '',
            domain: extractDomain(item.url),
            url: item.url,
            timestamp: item.timestamp ?? new Date().toISOString(),
            votesCount: item.rating?.votes_count ?? 0,
          })
        }
      }
    }

    return { items: discussions, serpPosition }
  } catch (err) {
    log.warn(`SERP discussions fetch failed for "${query}": ${(err as Error).message}`)
    return { items: [], serpPosition: null }
  }
}

/**
 * Fetch community discussions for a keyword by querying 3 SERP variants.
 * Results are deduplicated by URL, aggregated into a CommunitySignal.
 * Returns an empty signal on error (graceful degradation).
 */
export async function fetchCommunityDiscussions(
  keyword: string,
  locationCode = 2250,
  languageCode = 'fr',
): Promise<CommunitySignal> {
  try {
    return await getOrFetch<CommunitySignal>(
      CACHE_DIR,
      slugify(keyword),
      CACHE_TTL_MS,
      async () => {
        log.info(`Fetching community discussions for "${keyword}"`)

        // Build 3 query variants for better coverage
        const queries = [
          `${keyword} forum`,
          `${keyword} avis problème`,
          `${keyword} retour expérience`,
        ]

        // Fetch all 3 variants with a 5s timeout via Promise.race
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Community discussions timeout (5s)')), 5000),
        )

        const fetchPromise = Promise.allSettled(
          queries.map(q => fetchSerpDiscussions(q, locationCode, languageCode)),
        )

        const results = await Promise.race([fetchPromise, timeoutPromise]) as PromiseSettledResult<{ items: TopDiscussion[]; serpPosition: number | null }>[]

        // Collect all discussions and deduplicate by URL
        const seen = new Set<string>()
        const allDiscussions: TopDiscussion[] = []
        let firstSerpPosition: number | null = null

        for (const result of results) {
          if (result.status !== 'fulfilled') continue
          if (firstSerpPosition === null && result.value.serpPosition !== null) {
            firstSerpPosition = result.value.serpPosition
          }
          for (const disc of result.value.items) {
            const normalizedUrl = normalizeUrl(disc.url)
            if (!seen.has(normalizedUrl)) {
              seen.add(normalizedUrl)
              allDiscussions.push(disc)
            }
          }
        }

        // Aggregate into CommunitySignal
        const uniqueDomains = [...new Set(allDiscussions.map(d => d.domain))]
        const totalVotes = allDiscussions.reduce((sum, d) => sum + d.votesCount, 0)
        const avgVotesCount = allDiscussions.length > 0 ? Math.round(totalVotes / allDiscussions.length) : 0
        const timestamps = allDiscussions.map(d => d.timestamp).filter(Boolean)

        // Sort by votes descending, take top 10
        const topDiscussions = [...allDiscussions]
          .sort((a, b) => b.votesCount - a.votesCount)
          .slice(0, 10)

        const signal: CommunitySignal = {
          discussionsCount: allDiscussions.length,
          uniqueDomains,
          domainDiversity: uniqueDomains.length,
          avgVotesCount,
          freshness: computeFreshness(timestamps),
          serpPosition: firstSerpPosition,
          topDiscussions,
        }

        log.info(`Community discussions done for "${keyword}"`, {
          count: signal.discussionsCount,
          domains: signal.domainDiversity,
          freshness: signal.freshness,
        })

        return signal
      },
    )
  } catch (err) {
    log.warn(`Community discussions failed for "${keyword}": ${(err as Error).message}`)
    return { ...EMPTY_SIGNAL }
  }
}
