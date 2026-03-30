import type { KeywordType } from '../types/keyword.types.js'

/** Target keyword density ranges by keyword type (in percentage) */
export const KEYWORD_DENSITY_TARGETS: Record<KeywordType, { min: number; max: number }> = {
  'Pilier': { min: 1.5, max: 2.5 },
  'Intermédiaire': { min: 1.0, max: 2.0 },
  'Moyenne traine': { min: 0.8, max: 1.5 },
  'Longue traine': { min: 0.3, max: 0.8 },
  'Spécialisé': { min: 0.5, max: 1.2 },
}

/** Score factor weights (must sum to 1.0) */
export const SEO_SCORE_WEIGHTS = {
  keywordPilier: 0.25,
  keywordSecondary: 0.15,
  heading: 0.20,
  metaTitle: 0.15,
  metaDescription: 0.10,
  contentLength: 0.15,
} as const

/** Meta tag optimal length ranges */
export const META_TITLE_LENGTH = { min: 50, max: 60 } as const
export const META_DESCRIPTION_LENGTH = { min: 150, max: 160 } as const

/** Score level thresholds */
export const SEO_SCORE_LEVELS = {
  good: 70,
  fair: 40,
} as const

/** Default recommended content length (words) when no brief data available */
export const DEFAULT_CONTENT_LENGTH_TARGET = 1500

/** Keyword composite score weights (must sum to 1.0) */
export const KEYWORD_SCORE_WEIGHTS = {
  volume: 0.35,
  difficultyInverse: 0.25,
  cpc: 0.15,
  competitionInverse: 0.25,
} as const

/** Keyword audit thresholds */
export const KEYWORD_AUDIT_THRESHOLDS = {
  /** Volume considered zero/nonexistent */
  zeroVolume: 0,
  /** Volume considered low */
  lowVolume: 50,
  /** Difficulty considered high */
  highDifficulty: 70,
  /** Related keyword overlap % to flag redundancy */
  redundancyOverlapPercent: 60,
} as const

/** Default min hours between DataForSEO refresh per keyword (overridden by env) */
export const DEFAULT_MIN_REFRESH_HOURS = 168 // 7 days
