// --- Google Search Console (Epic 17) ---

export interface GscToken {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface GscPerformanceRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscPerformance {
  siteUrl: string
  startDate: string
  endDate: string
  rows: GscPerformanceRow[]
  cachedAt: string
}

export interface GscKeywordComparison {
  keyword: string
  targeted: boolean
  inGsc: boolean
  position: number | null
  clicks: number
  impressions: number
}

export interface GscKeywordGap {
  articleUrl: string
  targetedNotIndexed: GscKeywordComparison[]
  discoveredOpportunities: GscKeywordComparison[]
  matched: GscKeywordComparison[]
}
