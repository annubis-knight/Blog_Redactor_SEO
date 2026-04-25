import { log } from '../../utils/logger.js'
import { getBaseUrl, getAuthHeader } from '../external/dataforseo.service.js'
import {
  getKeywordMetrics,
  upsertKeywordLocalAnalysis,
  isKeywordMetricsFresh,
} from '../keyword/keyword-metrics.service.js'
import type { MapsResult, GbpListing, ReviewGap } from '../../../shared/types/index.js'

// Sprint 15.5 — local SEO maps analysis moved from api_cache[local-seo] to
// keyword_metrics.local_analysis (cross-article, JSONB column).

async function fetchGoogleMaps(keyword: string, locationCode: number = 1006157): Promise<any> {
  const url = `${getBaseUrl()}/serp/google/maps/live/advanced`
  const auth = getAuthHeader()

  log.debug('DataForSEO Maps request', { keyword, locationCode, url })
  const start = Date.now()

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      keyword,
      location_code: locationCode,
      language_code: 'fr',
    }]),
  })

  if (!res.ok) {
    log.error('DataForSEO Maps HTTP error', { keyword, status: res.status, ms: Date.now() - start })
    throw new Error(`DataForSEO Maps error: ${res.status}`)
  }
  const json = await res.json()
  if (json.tasks?.[0]?.status_code !== 20000) {
    const statusMsg = json.tasks?.[0]?.status_message ?? 'DataForSEO Maps error'
    log.error('DataForSEO Maps task error', { keyword, statusCode: json.tasks?.[0]?.status_code, statusMsg, ms: Date.now() - start })
    throw new Error(statusMsg)
  }

  const result = json.tasks[0].result?.[0] ?? null
  const itemCount = result?.items?.length ?? 0
  log.info('DataForSEO Maps done', { keyword, itemCount, ms: Date.now() - start })

  return result
}

function extractListings(mapsResult: any): GbpListing[] {
  if (!mapsResult?.items) return []
  return mapsResult.items.slice(0, 20).map((item: any, idx: number) => ({
    position: idx + 1,
    title: item.title ?? '',
    category: item.category ?? null,
    isClaimed: item.is_claimed ?? false,
    rating: item.rating?.value ?? null,
    votesCount: item.rating?.votes_count ?? 0,
    address: item.address ?? null,
    snippet: item.snippet ?? null,
    url: item.url ?? null,
    phone: item.phone ?? null,
  }))
}

function calculateReviewGap(listings: GbpListing[]): ReviewGap {
  const myReviews = parseInt(process.env.MY_GBP_REVIEWS ?? '0', 10)
  const top5 = listings.slice(0, 5)
  const avgReviews = top5.length > 0
    ? Math.round(top5.reduce((sum, l) => sum + l.votesCount, 0) / top5.length)
    : 0
  const gap = Math.max(0, avgReviews - myReviews)

  return {
    averageCompetitorReviews: avgReviews,
    myReviews,
    gap,
    objective: gap > 0 ? `Obtenir ${gap} avis supplémentaires pour rattraper la moyenne des Top 5` : 'Vous êtes au-dessus de la moyenne !',
  }
}

export async function analyzeMaps(keyword: string, locationCode: number = 1006157): Promise<MapsResult> {
  // Sprint 15.5 — DB-first on keyword_metrics.local_analysis.
  const existing = await getKeywordMetrics(keyword)
  if (existing?.localAnalysis && isKeywordMetricsFresh(existing.fetchedAt)) {
    log.debug(`Maps DB hit for "${keyword}"`)
    return existing.localAnalysis as MapsResult
  }

  log.info(`Analyzing Google Maps for "${keyword}"`, { locationCode })
  const totalStart = Date.now()

  let mapsResult: any
  try {
    mapsResult = await fetchGoogleMaps(keyword, locationCode)
  } catch (err) {
    log.error('Maps analysis failed', { keyword, locationCode, error: (err as Error).message, ms: Date.now() - totalStart })
    throw err
  }

  const listings = extractListings(mapsResult)
  const reviewGap = calculateReviewGap(listings)
  const hasLocalPack = listings.length > 0

  log.info('Maps analysis done', {
    keyword,
    hasLocalPack,
    listingCount: listings.length,
    avgRating: listings.length > 0 ? +(listings.reduce((s, l) => s + (l.rating ?? 0), 0) / listings.length).toFixed(1) : null,
    reviewGap: reviewGap.gap,
    avgCompetitorReviews: reviewGap.averageCompetitorReviews,
    ms: Date.now() - totalStart,
  })

  const result: MapsResult = {
    keyword,
    locationCode,
    hasLocalPack,
    listings,
    reviewGap,
    cachedAt: new Date().toISOString(),
  }

  try { await upsertKeywordLocalAnalysis(keyword, result) }
  catch (err) { log.warn(`Maps: DB persist failed — ${(err as Error).message}`) }

  return result
}
