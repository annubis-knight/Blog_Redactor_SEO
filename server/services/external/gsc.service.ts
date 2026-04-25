import { join } from 'path'
import { readJson, writeJson } from '../../utils/json-storage.js'
import { getCached, setCached, slugify } from '../../db/cache-helpers.js'
import { log } from '../../utils/logger.js'
import type {
  GscToken,
  GscPerformance,
  GscPerformanceRow,
  GscKeywordGap,
  GscKeywordComparison,
} from '../../../shared/types/index.js'

const TOKEN_PATH = join(process.cwd(), 'data', 'gsc-token.json')
const GSC_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 1 day
const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// --- Token management ---

async function loadToken(): Promise<GscToken | null> {
  try {
    const token = await readJson<GscToken>(TOKEN_PATH)
    log.debug('GSC: token loaded')
    return token
  } catch {
    log.debug('GSC: no token found')
    return null
  }
}

async function saveToken(token: GscToken): Promise<void> {
  await writeJson(TOKEN_PATH, token)
  log.debug('GSC: token saved')
}

async function refreshAccessToken(refreshToken: string): Promise<GscToken> {
  log.info('GSC: refreshing access token')
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret)
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set')

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    log.error(`GSC: OAuth refresh failed with status ${res.status}`)
    throw new Error(`Google OAuth refresh error: ${res.status}`)
  }
  const json = await res.json()

  const token: GscToken = {
    accessToken: json.access_token,
    refreshToken,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  }
  await saveToken(token)
  log.info('GSC: access token refreshed successfully')
  return token
}

async function getValidToken(): Promise<string> {
  const token = await loadToken()
  if (!token)
    throw new Error('Google Search Console non connecte. Lancez le flow OAuth.')

  // Refresh if token expires within 60 seconds
  if (Date.now() >= token.expiresAt - 60_000) {
    log.debug('GSC: token expiring soon, refreshing')
    const refreshed = await refreshAccessToken(token.refreshToken)
    return refreshed.accessToken
  }
  log.debug('GSC: using cached token')
  return token.accessToken
}

// --- OAuth flow ---

export function getAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3005/api/gsc/callback'
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID must be set')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCode(code: string): Promise<GscToken> {
  log.info('GSC: exchanging OAuth code')
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3005/api/gsc/callback'
  if (!clientId || !clientSecret)
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set')

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    log.error(`GSC: OAuth exchange failed with status ${res.status}`)
    throw new Error(`Google OAuth exchange error: ${res.status}`)
  }
  const json = await res.json()

  const token: GscToken = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  }
  await saveToken(token)
  log.info('GSC: OAuth exchange successful')
  return token
}

export async function isConnected(): Promise<boolean> {
  const token = await loadToken()
  return token !== null
}

// --- Performance data ---

export async function queryPerformance(
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = ['query', 'page'],
): Promise<GscPerformance> {
  // Check daily cache — max 1 refresh per day
  const cacheKey = slugify(`${siteUrl}-${startDate}-${endDate}`)
  const cached = await getCached<GscPerformance>('gsc', cacheKey)
  if (cached && new Date(cached.cachedAt).toDateString() === new Date().toDateString()) {
    log.debug(`GSC queryPerformance: cache hit for ${siteUrl}`, { rows: cached.rows.length })
    return cached
  }

  log.info(`GSC queryPerformance: fetching ${siteUrl} (${startDate} → ${endDate})`)
  const accessToken = await getValidToken()
  const encodedSiteUrl = encodeURIComponent(siteUrl)

  const res = await fetch(
    `${GSC_API_BASE}/sites/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit: 1000,
      }),
    },
  )

  if (!res.ok) {
    log.error(`GSC queryPerformance: API error ${res.status}`)
    throw new Error(`GSC API error: ${res.status}`)
  }
  const json = await res.json()

  const rows: GscPerformanceRow[] = (json.rows ?? []).map((r: any) => ({
    keys: r.keys ?? [],
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }))

  const result: GscPerformance = {
    siteUrl,
    startDate,
    endDate,
    rows,
    cachedAt: new Date().toISOString(),
  }
  await setCached('gsc', cacheKey, result, GSC_CACHE_TTL_MS)
  log.info(`GSC queryPerformance: ${rows.length} rows fetched and cached`)
  return result
}

// --- Keyword gap ---

export async function analyzeKeywordGap(
  articleUrl: string,
  targetKeywords: string[],
  siteUrl: string,
): Promise<GscKeywordGap> {
  log.info(`GSC analyzeKeywordGap: ${articleUrl}`, { targetKeywords: targetKeywords.length })
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const performance = await queryPerformance(siteUrl, startDate, endDate)

  // Filter rows for this article
  const articleRows = performance.rows.filter((r) =>
    r.keys.some((k) => k.includes(articleUrl)),
  )
  const gscKeywords = new Set(
    articleRows.map((r) => r.keys[0]?.toLowerCase()).filter(Boolean),
  )
  const targetSet = new Set(targetKeywords.map((k) => k.toLowerCase()))

  const matched: GscKeywordComparison[] = []
  const targetedNotIndexed: GscKeywordComparison[] = []
  const discoveredOpportunities: GscKeywordComparison[] = []

  for (const kw of targetKeywords) {
    const kwLower = kw.toLowerCase()
    const row = articleRows.find((r) => r.keys[0]?.toLowerCase() === kwLower)
    if (row) {
      matched.push({
        keyword: kw,
        targeted: true,
        inGsc: true,
        position: row.position,
        clicks: row.clicks,
        impressions: row.impressions,
      })
    } else {
      targetedNotIndexed.push({
        keyword: kw,
        targeted: true,
        inGsc: false,
        position: null,
        clicks: 0,
        impressions: 0,
      })
    }
  }

  for (const row of articleRows) {
    const kw = row.keys[0]
    if (kw && !targetSet.has(kw.toLowerCase())) {
      discoveredOpportunities.push({
        keyword: kw,
        targeted: false,
        inGsc: true,
        position: row.position,
        clicks: row.clicks,
        impressions: row.impressions,
      })
    }
  }

  log.debug(`GSC analyzeKeywordGap: matched=${matched.length}, notIndexed=${targetedNotIndexed.length}, opportunities=${discoveredOpportunities.length}`)
  return { articleUrl, targetedNotIndexed, discoveredOpportunities, matched }
}
