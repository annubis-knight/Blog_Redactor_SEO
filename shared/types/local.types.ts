// --- Google Maps / GBP Audit (Epic 14) ---

export interface GbpListing {
  position: number
  title: string
  category: string | null
  isClaimed: boolean
  rating: number | null
  votesCount: number
  address: string | null
  snippet: string | null
  url: string | null
  phone: string | null
}

export interface ReviewGap {
  averageCompetitorReviews: number
  myReviews: number
  gap: number
  objective: string
}

export interface MapsResult {
  keyword: string
  locationCode: number
  hasLocalPack: boolean
  listings: GbpListing[]
  reviewGap: ReviewGap
  cachedAt: string
}

// --- Local Entities & Anchoring (Epic 15) ---

export type LocalEntityType = 'quartier' | 'entreprise' | 'lieu' | 'region'

export interface LocalEntity {
  name: string
  type: LocalEntityType
  aliases?: string[]
}

export interface EntityMatch {
  entity: LocalEntity
  count: number
  positions: number[]
}

export interface AnchorageScore {
  score: number
  maxScore: number
  matches: EntityMatch[]
  typesCovered: LocalEntityType[]
  suggestions: EntitySuggestion[]
}

export interface EntitySuggestion {
  entity: LocalEntity
  reason: string
}

export interface LocalEntitiesDb {
  quartiers: LocalEntity[]
  entreprises: LocalEntity[]
  lieux: LocalEntity[]
  regions: LocalEntity[]
}
