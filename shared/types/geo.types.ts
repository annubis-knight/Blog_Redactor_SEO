/** GEO scoring factors breakdown */
export interface GeoFactors {
  extractibilityScore: number
  questionHeadingsScore: number
  answerCapsulesScore: number
  sourcedStatsScore: number
}

/** Answer capsule check result per H2 section */
export interface AnswerCapsuleCheck {
  heading: string
  hasAnswerCapsule: boolean
}

/** Question headings analysis */
export interface QuestionHeadingsAnalysis {
  totalH2H3: number
  questionCount: number
  percentage: number
}

/** Sourced statistics analysis */
export interface SourcedStatsAnalysis {
  count: number
  inTarget: boolean
}

/** Paragraph length alert */
export interface ParagraphAlert {
  index: number
  wordCount: number
  excerpt: string
}

/** Jargon detection with suggestion */
export interface JargonDetection {
  term: string
  suggestion: string
  count: number
}

/** Complete GEO score result */
export interface GeoScore {
  global: number
  factors: GeoFactors
  answerCapsules: AnswerCapsuleCheck[]
  questionHeadings: QuestionHeadingsAnalysis
  sourcedStats: SourcedStatsAnalysis
  paragraphAlerts: ParagraphAlert[]
  jargonDetections: JargonDetection[]
}
