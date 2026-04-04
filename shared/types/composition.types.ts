import type { ArticleLevel } from './keyword-validate.types.js'

/** Name of a single composition rule */
export type CompositionRuleName =
  | 'word_count'
  | 'location_present'
  | 'location_absent'
  | 'audience_present'
  | 'question_format'

/** Result of checking one rule against a keyword */
export interface CompositionRuleResult {
  rule: CompositionRuleName
  pass: boolean
  /** Human-readable message in French (advisory) */
  message: string
  /** Severity: 'warning' for rules that should pass, 'info' for informational */
  severity: 'warning' | 'info'
}

/** Full result of checking all applicable rules for a keyword at a given level */
export interface CompositionCheckResult {
  keyword: string
  level: ArticleLevel
  results: CompositionRuleResult[]
  /** Number of warnings (rules that should pass but don't) */
  warningCount: number
  /** true if all applicable rules pass */
  allPass: boolean
}
