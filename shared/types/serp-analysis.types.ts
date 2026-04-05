import type { PaaQuestion } from './dataforseo.types.js'
import type { ArticleLevel } from './keyword-validate.types.js'

export interface HnNode {
  level: number // 1, 2, or 3
  text: string
}

export interface SerpCompetitor {
  position: number
  title: string
  url: string
  domain: string
  headings: HnNode[]
  textContent: string // Raw text for TF-IDF (Epic 8)
  fetchError?: string // If the HTML fetch failed
}

export interface LieutenantCandidate {
  text: string
  sources: ('serp' | 'paa' | 'group' | 'root')[]
  relevance: 'fort' | 'moyen' | 'faible'
}

export interface SerpAnalysisResult {
  keyword: string
  articleLevel: ArticleLevel
  competitors: SerpCompetitor[]
  paaQuestions: PaaQuestion[]
  maxScraped: number
  cachedAt: string
  fromCache: boolean
}

export interface TfidfTerm {
  term: string
  level: 'obligatoire' | 'differenciateur' | 'optionnel'
  documentFrequency: number
  density: number
  competitorCount: number
  totalCompetitors: number
}

export interface TfidfResult {
  keyword: string
  totalCompetitors: number
  obligatoire: TfidfTerm[]
  differenciateur: TfidfTerm[]
  optionnel: TfidfTerm[]
}
