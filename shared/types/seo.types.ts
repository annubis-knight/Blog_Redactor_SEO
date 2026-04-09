import type { KeywordType } from './keyword.types.js'

/** How the keyword was matched in the content */
export type MatchMethod = 'exact' | 'semantic' | 'partial' | 'none'

/** Individual keyword density measurement */
export interface KeywordDensity {
  keyword: string
  type: KeywordType
  occurrences: number
  density: number
  target: { min: number; max: number }
  inTarget: boolean
  matchMethod: MatchMethod
}

/** Single heading validation error */
export interface HeadingError {
  message: string
  level: number
  index: number
}

/** Heading hierarchy validation result */
export interface HeadingValidation {
  isValid: boolean
  h1Count: number
  h2Count: number
  h3Count: number
  errors: HeadingError[]
}

/** Meta tag analysis */
export interface MetaTagAnalysis {
  titleLength: number
  titleInRange: boolean
  descriptionLength: number
  descriptionInRange: boolean
  titleHasKeyword: boolean
  descriptionHasKeyword: boolean
}

/** Breakdown of SEO score factors */
export interface SeoFactors {
  keywordPilierScore: number
  keywordSecondaryScore: number
  headingScore: number
  metaTitleScore: number
  metaDescriptionScore: number
  contentLengthScore: number
}

/** SEO checklist item — tracks keyword presence in a specific content location */
export type ChecklistLocation = 'metaTitle' | 'h1' | 'intro' | 'metaDescription' | 'h2' | 'conclusion' | 'slug' | 'imageAlt'

export interface ChecklistItem {
  keyword: string
  location: ChecklistLocation
  label: string
  isPresent: boolean
  matchMethod: MatchMethod
  matchScore: number
}

/** NLP term detection result */
export interface NlpTermResult {
  term: string
  searchVolume: number
  isDetected: boolean
}

/** Image alt text analysis */
export interface ImageAnalysis {
  total: number
  withAlt: number
  withKeywordInAlt: number
}

/** Cannibalization warning for SeoPanel alerts */
export interface CannibalizationWarning {
  keyword: string
  conflictingSlug: string
  conflictingTitle: string
}

/** Presence of a lieutenant keyword across content locations */
export interface KeywordLocationPresence {
  keyword: string
  detected: boolean
  matchMethod: MatchMethod
  matchScore: number
  locations: ChecklistLocation[]
}

/** Detection result for a single lexique term */
export interface LexiqueTermResult {
  term: string
  detected: boolean
  occurrences: number
  recommended: number
  matchMethod: MatchMethod
}

/** Overall lexique coverage stats */
export interface LexiqueCoverage {
  total: number
  detected: number
  ratio: number
  terms: LexiqueTermResult[]
}

/** Complete SEO score result */
export interface SeoScore {
  global: number
  factors: SeoFactors
  keywordDensities: KeywordDensity[]
  headingValidation: HeadingValidation
  metaAnalysis: MetaTagAnalysis
  wordCount: number
  readingTimeMinutes: number
  paragraphCount: number
  imageAnalysis: ImageAnalysis
  slugHasKeyword: boolean
  checklistItems: ChecklistItem[]
  nlpTerms: NlpTermResult[]
  /** True when article-level keywords (Capitaine/Lieutenants) are defined */
  hasArticleKeywords: boolean
  /** Presence of each lieutenant keyword by content location */
  lieutenantPresence: KeywordLocationPresence[]
  /** Lexique vocabulary coverage stats */
  lexiqueCoverage: LexiqueCoverage | null
}
