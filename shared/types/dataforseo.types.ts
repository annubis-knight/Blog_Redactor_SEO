export interface SerpResult {
  position: number
  title: string
  url: string
  description: string
  domain: string
}

export interface PaaQuestion {
  question: string
  answer: string | null
}

export interface RelatedKeyword {
  keyword: string
  searchVolume: number
  competition: number
  cpc: number
}

/**
 * KeywordOverview — agrégat KPI marché renvoyé par DataForSEO Keyword Overview.
 *
 * Les 4 KPIs marché (`searchVolume`, `difficulty`, `cpc`, `competition`)
 * sont `number | null` (FR-INFRA-KPI-NULLABLE). `null` = donnée absente
 * (DataForSEO sans signal, miss DB) — JAMAIS substitué par `0`.
 *
 * `monthlySearches` reste `number[]` : l'adapter filtre les éléments
 * absents au lieu de les remplacer par 0 (cf. tech-spec D2).
 */
export interface KeywordOverview {
  searchVolume: number | null
  difficulty: number | null
  cpc: number | null
  competition: number | null
  monthlySearches: number[]
  wordsCount?: number
  coreKeyword?: string
}

export interface DataForSeoCacheEntry {
  keyword: string
  serp: SerpResult[]
  paa: PaaQuestion[]
  relatedKeywords: RelatedKeyword[]
  keywordData: KeywordOverview
  cachedAt: string
}
