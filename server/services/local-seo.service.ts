import { join } from 'path'
import { log } from '../utils/logger.js'
import { getBaseUrl, getAuthHeader, slugify } from './dataforseo.service.js'
import { getOrFetch } from '../utils/cache.js'
import type { MapsResult, GbpListing, ReviewGap } from '../../shared/types/index.js'

const CACHE_DIR = join(process.cwd(), 'data', 'cache')

async function fetchGoogleMaps(keyword: string, locationCode: number = 1006157): Promise<any> {
  const url = `${getBaseUrl()}/serp/google/maps/live/advanced`
  const auth = getAuthHeader()

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      keyword,
      location_code: locationCode,
      language_code: 'fr',
    }]),
  })

  if (!res.ok) throw new Error(`DataForSEO Maps error: ${res.status}`)
  const json = await res.json()
  if (json.tasks?.[0]?.status_code !== 20000) {
    throw new Error(json.tasks?.[0]?.status_message ?? 'DataForSEO Maps error')
  }
  return json.tasks[0].result?.[0] ?? null
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
  return getOrFetch<MapsResult>(
    CACHE_DIR,
    `maps-${slugify(keyword)}`,
    Infinity,
    async () => {
      log.info(`Analyzing Google Maps for "${keyword}"`, { locationCode })

      const mapsResult = await fetchGoogleMaps(keyword, locationCode)
      const listings = extractListings(mapsResult)
      const reviewGap = calculateReviewGap(listings)
      const hasLocalPack = listings.length > 0

      return {
        keyword,
        locationCode,
        hasLocalPack,
        listings,
        reviewGap,
        cachedAt: new Date().toISOString(),
      }
    },
  )
}
