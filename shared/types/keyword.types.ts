import type { ProposeLieutenantsHnNode } from './serp-analysis.types.js'
import type { ArticleLevel, PaaQuestionScan } from './keyword-validate.types.js'
import type { MarketScoreResult, RelevanceScoreResult, RelevanceUnavailableReason } from './scoring.types.js'

/**
 * Lightweight KPI for persistence — only name and raw value.
 *
 * `rawValue` est `number | null` (FR-INFRA-KPI-NULLABLE) : `null` = donnée
 * absente (DataForSEO sans signal, miss DB). L'UI affiche `'—'` via les
 * helpers `formatVolume / formatCpc / formatKd / formatPercent` du module
 * `shared/score/format.ts` (FR-INFRA-KPI-DISPLAY-DASH).
 */
export interface KpiSummary {
  name: string
  rawValue: number | null
}

/** Keyword type classification */
export type KeywordType = 'Pilier' | 'Intermédiaire' | 'Spécialisé' | 'Moyenne traine' | 'Longue traine'

/** Keyword validation status in the moteur workflow */
export type KeywordStatus = 'suggested' | 'validated' | 'rejected'

/** Raw keyword as stored in BDD_Mots_Clefs_SEO.json (snake_case) */
export interface RawKeyword {
  mot_clef: string
  cocon_seo: string
  type_mot_clef: KeywordType
  statut?: KeywordStatus
}

/** Raw keywords database structure */
export interface RawKeywordsDb {
  seo_data: RawKeyword[]
}

/** Keyword in camelCase for API responses */
export interface Keyword {
  keyword: string
  cocoonName: string
  type: KeywordType
  status: KeywordStatus
}

// ---- Article keyword status lifecycle ----

/** Captain keyword status: suggested by AI or locked by user */
export type CaptainKeywordStatus = 'suggested' | 'locked'

/** Lieutenant keyword status: suggested by AI, locked by user, or eliminated */
export type LieutenantKeywordStatus = 'suggested' | 'locked' | 'eliminated' | 'archived'

// ---- Rich captain types ----

/** A single captain validation test entry (one per keyword tested in carousel) */
export interface CaptainScanEntry {
  keyword: string
  kpis: KpiSummary[]
  articleLevel: ArticleLevel
  rootKeywords: string[]                    // root variant names tested with this keyword
  paaQuestions?: PaaQuestionScan[]
  aiPanelMarkdown?: string | null           // AI-generated analysis per keyword
  exploredAt?: string | null                // ISO 8601 — date de dernière exploration (règle TTL 7j)
  /**
   * 2026-05-05 — Refonte live computation (FR-CAP-RELEVANCE-COMPUTED-LIVE).
   *
   * marketScore : rapatrié depuis `radar_explorations.scan_result.cards[k]` au
   *   reload (snapshot stable, dépend uniquement du keyword).
   * relevanceScore : CALCULÉ À LA VOLÉE par `computeRelevanceForCaptainTab`
   *   à chaque hydratation Capitaine. JAMAIS persisté en DB.
   *   Toujours cohérent avec le `painPoint` actuel de l'article.
   *
   * Voir docs/data-flows/relevance-score-live-computation.md.
   */
  marketScore?: MarketScoreResult | null
  relevanceScore?: RelevanceScoreResult | null
  /**
   * 2026-05-05 — Cause typée renvoyée quand `relevanceScore` est null,
   * pour que le frontend affiche un tooltip honnête sans deviner.
   * Voir FR-CAP-RELEVANCE-UNAVAILABLE-REASON.
   */
  relevanceUnavailableReason?: RelevanceUnavailableReason | null
}

/** Rich captain object with validation history and AI panel content */
export interface RichCaptain {
  keyword: string
  status: CaptainKeywordStatus
  exploredKeywords: CaptainScanEntry[]
  aiPanelMarkdown: string | null
  lockedAt: string | null
}

// ---- Rich root keyword types ----

/** A root variant keyword with its own validation KPIs */
export interface RichRootKeyword {
  keyword: string
  parentKeyword: string                     // the captain keyword this root derives from
  kpis: KpiSummary[]
  articleLevel: ArticleLevel
  timestamp: string                         // ISO 8601
}

// ---- Rich lieutenant types ----

/** Rich lieutenant object with AI-generated metadata */
export interface RichLieutenant {
  keyword: string
  status: LieutenantKeywordStatus
  reasoning: string
  sources: ('paa' | 'serp' | 'group' | 'root' | 'content-gap')[]
  suggestedHnLevel: 2 | 3
  score: number                             // 0-100 AI quality score
  kpis: KpiSummary[] | null                 // null if not individually validated
  lockedAt: string | null
  exploredAt?: string | null                // ISO 8601 — date de dernière exploration (règle TTL 7j)
}

// ---- Article keywords ----

/** Keywords assigned to a specific article with 3-level hierarchy */
export interface ArticleKeywords {
  articleId: number
  capitaine: string            // 1 main keyword (Title, H1, URL)
  lieutenants: string[]        // 2-5 secondary variants (H2, H3)
  lexique: string[]            // 10-15 LSI terms (body text)
  rootKeywords?: string[]      // Root variants from Capitaine deconstruction
  hnStructure?: ProposeLieutenantsHnNode[]  // HN structure from Moteur lieutenant proposal
  richCaptain?: RichCaptain
  richRootKeywords?: RichRootKeyword[]
  richLieutenants?: RichLieutenant[]
}

/** Raw storage format for article-keywords.json */
export interface RawArticleKeywordsDb {
  keywords_par_article: ArticleKeywords[]
}
