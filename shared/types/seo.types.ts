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
export type ChecklistLocation = 'metaTitle' | 'h1' | 'intro' | 'metaDescription' | 'h2' | 'conclusion'

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

/** Complete SEO score result */
export interface SeoScore {
  global: number
  factors: SeoFactors
  keywordDensities: KeywordDensity[]
  headingValidation: HeadingValidation
  metaAnalysis: MetaTagAnalysis
  wordCount: number
  checklistItems: ChecklistItem[]
  nlpTerms: NlpTermResult[]
  /** True when article-level keywords (Capitaine/Lieutenants) are defined */
  hasArticleKeywords: boolean
}
