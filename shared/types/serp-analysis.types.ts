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

// --- IA Lieutenant Proposal (Refonte Lieutenants) ---

export interface ProposedLieutenant {
  keyword: string
  reasoning: string
  sources: ('paa' | 'serp' | 'group' | 'root' | 'content-gap')[]
  aiConfidence: 'fort' | 'moyen' | 'faible'
  suggestedHnLevel: 2 | 3
  score: number // 0-100, AI-generated quality score for filtering
}

export interface ProposeLieutenantsHnNode {
  level: number
  text: string
  children?: { level: number; text: string }[]
}

/** Raw AI output (before filtering) */
export interface ProposeLieutenantsResult {
  lieutenants: ProposedLieutenant[]
  hnStructure: ProposeLieutenantsHnNode[]
  contentGapInsights: string
}

/** Post-filtering result sent to the frontend */
export interface FilteredProposeLieutenantsResult {
  selectedLieutenants: ProposedLieutenant[]
  eliminatedLieutenants: ProposedLieutenant[]
  hnStructure: ProposeLieutenantsHnNode[]
  contentGapInsights: string
  totalGenerated: number
}

// --- IA Lexique Analysis (Refonte Lexique) ---

export interface LexiqueTermRecommendation {
  term: string
  aiRecommended: boolean
  aiReason: string
}

export interface LexiqueAnalysisResult {
  recommendations: LexiqueTermRecommendation[]
  missingTerms: string[]
  summary: string
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
