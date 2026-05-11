import type { ScanResponse } from './keyword-validate.types.js'
import type { MarketScoreResult, RelevanceScoreResult, RelevanceUnavailableReason } from './scoring.types.js'

// --- SERP Module Detection (Epic 11) ---

export type SerpModuleType =
  | 'local_pack'
  | 'featured_snippet'
  | 'people_also_ask'
  | 'video'
  | 'images'
  | 'shopping'
  | 'knowledge_graph'
  | 'top_stories'

export interface SerpModule {
  type: SerpModuleType
  present: boolean
  position?: number
}

export type IntentType = 'informational' | 'transactional_local' | 'navigational' | 'mixed'

export interface IntentScore {
  category: string
  score: number
  maxScore: number
}

export interface IntentRecommendation {
  module: SerpModuleType
  action: string
  priority: 'high' | 'medium' | 'low'
}

export interface OrganicResult {
  position: number
  title: string
  url: string
  description: string
  domain: string
}

export interface IntentAnalysis {
  keyword: string
  modules: SerpModule[]
  scores: IntentScore[]
  dominantIntent: IntentType
  classification: {
    type: IntentType
    confidence: number
    reasoning: string
  }
  recommendations: IntentRecommendation[]
  topOrganicResults: OrganicResult[]
  paaQuestions: string[]
  cachedAt: string
}

// --- Local vs National Comparison (Epic 12) ---

/**
 * LocationMetrics — KPIs marché pour une localisation (national vs local).
 *
 * Les 4 KPIs marché sont `number | null` (FR-INFRA-KPI-NULLABLE).
 * `null` = donnée absente — JAMAIS `0`.
 */
export interface LocationMetrics {
  searchVolume: number | null
  keywordDifficulty: number | null
  cpc: number | null
  competition: number | null
  monthlySearches: number[]
}

export interface LocalNationalComparison {
  keyword: string
  local: LocationMetrics
  national: LocationMetrics
  /**
   * Indice d'opportunité locale calculé sur volume * (100 - KD) / national_KD.
   * `null` (FR-INFRA-KPI-SCORING-NULLSAFE AC4) si l'une des opérandes est
   * `null` — pas de fallback à 0 qui masquerait l'absence de signal.
   */
  opportunityIndex: number | null
  alert: OpportunityAlert | null
  cachedAt: string
}

export interface OpportunityAlert {
  keyword: string
  index: number
  message: string
  type: 'opportunity' | 'warning'
}

// --- Autocomplete Validation (Epic 13) ---

export interface AutocompleteSuggestion {
  keyword: string
  type: string
  searchVolume: number | null
}

export interface CertaintyIndex {
  autocompleteExists: number
  volumeNormalized: number
  serpDensity: number
  total: number
}

export interface AutocompleteResult {
  keyword: string
  suggestions: AutocompleteSuggestion[]
  validated: boolean
  certaintyIndex: CertaintyIndex
  cachedAt: string
}

// --- Pain Validation Multi-Sources (Epic 25) ---

export interface TranslatedKeyword {
  keyword: string
  reasoning: string
}

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

export interface AutocompleteSignal {
  suggestionsCount: number
  suggestions: string[]
  hasKeyword: boolean
  position: number | null
}

export type PainVerdictCategory = 'brulante' | 'confirmee' | 'emergente' | 'latente' | 'froide' | 'incertaine'

export interface MultiSourceVerdict {
  category: PainVerdictCategory
  confidence: number
  consensusAgreement: number
  sourcesAvailable: number
  sourcesTotal: number
  perSourceBreakdown: Record<string, { score: number; weight: number; available: boolean }>
}

export interface ValidatePainResult {
  keyword: string
  /**
   * Données DataForSEO. Les 4 KPIs marché sont `number | null`
   * (FR-INFRA-KPI-NULLABLE). `relatedCount` reste `number` (compteur,
   * jamais absent — vaut 0 quand vide).
   */
  dataforseo: {
    searchVolume: number | null
    difficulty: number | null
    cpc: number | null
    competition: number | null
    relatedCount: number
  } | null
  community: CommunitySignal | null
  autocomplete: AutocompleteSignal | null
  verdict: {
    category: PainVerdictCategory
    confidence: number
    sourcesAvailable: number
  }
}

// --- Intent Scan / Resonance Scanner (Tab 0) ---

export type ResonanceMatch = 'total' | 'partial' | 'none'

export interface ResonanceItem {
  text: string
  answer?: string // PAA answer snippet from Google
  source: 'paa' | 'autocomplete'
  match: ResonanceMatch
  position: number | null
  depth: number // 1 = from broad keyword, 2 = from a level-1 PAA question
  parentQuestion?: string // for depth 2: which PAA question generated this
  query?: string // for autocomplete: the search term that produced this suggestion
  semanticScore?: number // 0-1 cosine similarity from embedding model (if available)
}

export interface IntentScanResult {
  broadKeyword: string
  specificTopic: string
  paaCount: number
  autocompleteCount: number
  cpc: number | null
  resonanceScore: number // 0-100
  heatLevel: 'brulante' | 'chaude' | 'tiede' | 'froide'
  items: ResonanceItem[]
  verdict: string
  depth: number // how many PAA levels were crawled
}

// --- NLP Embarqué (Epic 26) ---

export interface NlpResult {
  label: string
  confidence: number
  allScores: Array<{ label: string; score: number }>
}

export type NlpState = 'disabled' | 'loading-model' | 'analyzing' | 'active' | 'error' | 'unsupported'

// --- Keyword Radar (Redesigned Douleur Intent) ---

export interface RadarKeyword {
  keyword: string
  reasoning: string
}

export interface KeywordRadarGenerateResult {
  articleTitle: string
  articleKeyword: string
  painPoint: string
  keywords: RadarKeyword[]
  generatedAt: string
}

export type RadarIntentType = 'informational' | 'commercial' | 'transactional' | 'navigational'

export type RadarMatchQuality = 'exact' | 'stem' | 'semantic'

export type RadarPainAlignment = 'aligned' | 'partial' | 'off'

export interface RadarPaaItem {
  question: string
  answer?: string
  depth: number
  parentQuestion?: string
  match: ResonanceMatch
  matchQuality?: RadarMatchQuality
  semanticScore?: number
  /** QW5 — alignement de la PAA avec le painPoint de l'article (indep. du match lexical). */
  painAlignment?: RadarPainAlignment
}

/**
 * RadarKeywordKpis — KPIs d'une card Radar (marché + signaux PAA/Autocomplete).
 *
 * Les 4 KPIs marché (`searchVolume`, `difficulty`, `cpc`, `competition`)
 * sont `number | null` (FR-INFRA-KPI-NULLABLE).
 * Les signaux dérivés (`intentProbability`, `avgSemanticScore`) étaient déjà
 * nullables — pas de migration.
 */
export interface RadarKeywordKpis {
  searchVolume: number | null
  difficulty: number | null
  cpc: number | null
  competition: number | null
  intentTypes: RadarIntentType[]
  intentProbability: number | null
  autocompleteMatchCount: number
  paaMatchCount: number
  paaWeightedScore: number
  paaTotal: number
  avgSemanticScore: number | null
  /** Score 0-100 d'alignement sémantique entre le painPoint et le keyword+reasoning.
   *  Absent si pas de painPoint ou si l'embedding a échoué → traité comme neutre (50) par le scoring. */
  painAlignmentScore?: number
}

export interface RadarCombinedScoreBreakdown {
  paaMatchScore: number
  resonanceBonus: number
  opportunityScore: number
  intentValueScore: number
  cpcScore: number
  /** Composante QW3 : alignement du keyword avec le painPoint (50 = neutre si absent). */
  painAlignmentScore: number
  total: number
}

export interface RadarCard {
  keyword: string
  reasoning: string
  /**
   * KPIs marché (volume, KD, CPC, intent, PAA…).
   * `null` quand la card est une suggestion longue-traîne issue de l'IA
   * (cf. `source: 'longtail'`) — pas de fallback fantôme : l'absence
   * doit rester explicite (CLAUDE.md §3.5 anti-pattern fallback silencieux).
   */
  kpis: RadarKeywordKpis | null
  paaItems: RadarPaaItem[]
  /**
   * @deprecated Score legacy hybride (mélange marché + pertinence). Conservé
   * pour compatibilité avec les payloads radar persistés. NE PAS utiliser
   * pour de nouveaux affichages : utiliser `marketScore` (Radar) ou
   * `relevanceScore` (Capitaine) — voir docs/scoring-kpi-vs-relevance.md.
   */
  combinedScore: number
  /**
   * @deprecated Breakdown du score legacy hybride. Pour le breakdown KPI,
   * utiliser `computeKpiScore(kpis, level)` côté front. Pour le breakdown
   * Pertinence, utiliser `relevanceScore.breakdown`.
   */
  scoreBreakdown: RadarCombinedScoreBreakdown
  cachedPaa: boolean
  /** Score KPI / Marché (0-100). Source de vérité pour l'onglet Radar. */
  marketScore?: MarketScoreResult
  /** Score de Pertinence (0-100). Source de vérité pour l'onglet Capitaine.
   *  `null` si painPoint absent ou aucun signal d'alignement disponible. */
  relevanceScore?: RelevanceScoreResult | null
  /**
   * Cause typée absence Score Pertinence (FR-CAP-RELEVANCE-UNAVAILABLE-REASON).
   * Backend (captain-relevance.service.ts) → tooltip frontend honnête.
   * null si relevanceScore présent.
   */
  relevanceUnavailableReason?: RelevanceUnavailableReason | null
  /**
   * Origine de la card. `'radar'` (ou absent) = card racine produite par le
   * scan Radar. `'longtail'` = suggestion longue-traîne IA (kpis null par
   * construction). Permet aux consommateurs (UI Capitaine, dédup, agrégats)
   * de différencier les deux origines sans avoir à inspecter `kpis`.
   */
  source?: 'radar' | 'longtail'
  /**
   * Score de préférence IA sur 10 — UNIQUEMENT pour les cards `source:'longtail'`.
   * Différent de marketScore/relevanceScore (qui sont 0-100). Sert au tri
   * et au pré-cochage côté UI. Absent pour les cards racines.
   */
  preferenceScore?: number
  /** Explication IA de la combinaison — UNIQUEMENT pour `source:'longtail'`. */
  rationale?: string
  /** Mots-clés racines ayant servi à construire la combinaison — UNIQUEMENT pour `source:'longtail'`. */
  derivedFromRoots?: string[]
}

export interface KeywordRootVariant {
  keyword: string
  card: RadarCard
  validation: ScanResponse
}

export interface KeywordRadarScanResult {
  specificTopic: string
  broadKeyword: string
  autocomplete: {
    suggestions: Array<{ text: string; query: string; position: number }>
    totalCount: number
  }
  cards: RadarCard[]
  globalScore: number
  heatLevel: 'brulante' | 'chaude' | 'tiede' | 'froide'
  verdict: string
  scannedAt: string
}

export interface PaaCacheEntry {
  keyword: string
  paaItems: Array<{
    question: string
    answer?: string
    depth: number
    parentQuestion?: string
  }>
  cachedAt: string
  isEmpty: boolean
  maxDepth?: number // depth at which this cache entry was crawled
}

// --- Exploration History (Epic 18) ---

export interface ExplorationHistoryEntry {
  keyword: string
  timestamp: string
  hasIntent: boolean
  hasAutocomplete: boolean
  dominantIntent?: IntentType
  certaintyTotal?: number
}
