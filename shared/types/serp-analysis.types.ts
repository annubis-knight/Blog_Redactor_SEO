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
  /** Heuristic blog-vs-institutional classification from URL/domain. */
  isBlog?: boolean
}

export interface LieutenantCandidate {
  text: string
  sources: ('serp' | 'paa' | 'group' | 'root')[]
  relevance: 'fort' | 'moyen' | 'faible'
}

export interface HnRecurrenceItem {
  level: number
  text: string
  count: number
  total: number
  percent: number
}

/** Réponse de GET /keywords/:keyword/serp/exists : `exists: null` = inconnu (l'écran garde le bouton « Extraire »). */
export interface SerpExistsResponse {
  exists: boolean | null
  scrapedAt: string | null
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
  suggestedHnLevel: 2 | 3
  /** Score IA 0-100 ; `null` = non fourni (carte du panier, ancienne liste) → « — », trié en bas. */
  score: number | null
}

export interface ProposeLieutenantsHnNode {
  level: number
  text: string
  children?: { level: number; text: string }[]
}

/**
 * Raw AI output (before filtering). Plus de structure H1/H2/H3 ici : elle naît
 * à l'onglet Structure, des lieutenants retenus (FR-HN-TAB, M7).
 */
export interface ProposeLieutenantsResult {
  lieutenants: ProposedLieutenant[]
  contentGapInsights: string
}

/** Post-filtering result sent to the frontend */
export interface FilteredProposeLieutenantsResult {
  selectedLieutenants: ProposedLieutenant[]
  eliminatedLieutenants: ProposedLieutenant[]
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

/** Exploration Lexique d'un article relue en base (`lexique_explorations`), une par mot-clé source. */
export interface LexiqueExploration {
  articleId: number
  sourceKeyword: string
  tfidfTerms: TfidfResult | null
  aiRecommendations: LexiqueTermRecommendation[]
  aiMissingTerms: string[]
  aiSummary: string | null
  exploredAt: string
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
