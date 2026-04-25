import type { ProposeLieutenantsHnNode } from './serp-analysis.types.js'
import type { ArticleLevel, PaaQuestionValidate } from './keyword-validate.types.js'

/** Lightweight KPI for persistence — only name and raw value */
export interface KpiSummary {
  name: string
  rawValue: number
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
export interface CaptainValidationEntry {
  keyword: string
  kpis: KpiSummary[]
  articleLevel: ArticleLevel
  rootKeywords: string[]                    // root variant names tested with this keyword
  paaQuestions?: PaaQuestionValidate[]
  aiPanelMarkdown?: string | null           // AI-generated analysis per keyword
  exploredAt?: string | null                // ISO 8601 — date de dernière exploration (règle TTL 7j)
}

/** Rich captain object with validation history and AI panel content */
export interface RichCaptain {
  keyword: string
  status: CaptainKeywordStatus
  validationHistory: CaptainValidationEntry[]
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
