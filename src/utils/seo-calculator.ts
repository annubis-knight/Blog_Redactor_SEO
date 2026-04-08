import type { Keyword, ArticleKeywords } from '@shared/types/index.js'
import type {
  SeoScore,
  SeoFactors,
  KeywordDensity,
  HeadingValidation,
  HeadingError,
  MetaTagAnalysis,
  ChecklistItem,
  ChecklistLocation,
  NlpTermResult,
} from '@shared/types/seo.types.js'
import type { RelatedKeyword } from '@shared/types/dataforseo.types.js'
import {
  KEYWORD_DENSITY_TARGETS,
  SEO_SCORE_WEIGHTS,
  META_TITLE_LENGTH,
  META_DESCRIPTION_LENGTH,
  DEFAULT_CONTENT_LENGTH_TARGET,
} from '@shared/constants/seo.constants.js'
import {
  prepareText,
  matchKeywordPrepared,
  matchKeyword,
  type PreparedText,
} from './keyword-matcher'

/**
 * Strip HTML tags and return plain text.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Count words in a plain text string.
 */
export function countWords(text: string): number {
  const cleaned = text.trim()
  if (!cleaned) return 0
  return cleaned.split(/\s+/).length
}

/**
 * Calculate keyword density for a single keyword in HTML content.
 * Uses smart matching (exact → semantic → partial).
 */
export function calculateKeywordDensity(
  htmlContent: string,
  keyword: Keyword,
  prepared?: PreparedText,
): KeywordDensity {
  const plainText = stripHtml(htmlContent).toLowerCase()
  const totalWords = countWords(plainText)
  const prep = prepared ?? prepareText(plainText)
  const kwWords = keyword.keyword.split(/\s+/).length

  const match = matchKeywordPrepared(prep, keyword.keyword)

  const density = totalWords > 0
    ? (match.occurrences * kwWords / totalWords) * 100
    : 0
  const target = KEYWORD_DENSITY_TARGETS[keyword.type]

  return {
    keyword: keyword.keyword,
    type: keyword.type,
    occurrences: match.occurrences,
    density: Math.round(density * 100) / 100,
    target,
    inTarget: density >= target.min && density <= target.max,
    matchMethod: match.method,
  }
}

/**
 * Validate heading hierarchy in HTML content.
 * Rules:
 * - Exactly 1 H1
 * - No skipped levels (e.g., H1 → H3 without H2)
 * - H3 must be preceded by H2
 */
export function validateHeadingHierarchy(htmlContent: string): HeadingValidation {
  const headingRegex = /<h([1-6])[^>]*>/gi
  const errors: HeadingError[] = []
  const headings: number[] = []
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(htmlContent)) !== null) {
    headings.push(parseInt(match[1]!, 10))
  }

  const h1Count = headings.filter(h => h === 1).length

  if (h1Count === 0) {
    errors.push({ message: 'Aucun H1 trouvé', level: 1, index: 0 })
  } else if (h1Count > 1) {
    errors.push({ message: `${h1Count} H1 trouvés (1 attendu)`, level: 1, index: 0 })
  }

  for (let i = 1; i < headings.length; i++) {
    const current = headings[i]!
    const previous = headings[i - 1]!
    if (current > previous + 1) {
      errors.push({
        message: `Saut de niveau : H${previous} → H${current}`,
        level: current,
        index: i,
      })
    }
  }

  return {
    isValid: errors.length === 0,
    h1Count,
    errors,
  }
}

/**
 * Analyze meta tags for SEO compliance.
 * Uses smart keyword matching instead of exact includes.
 */
export function analyzeMetaTags(
  metaTitle: string | null,
  metaDescription: string | null,
  pilierKeyword: string | null,
): MetaTagAnalysis {
  const titleLength = metaTitle?.length ?? 0
  const descriptionLength = metaDescription?.length ?? 0

  let titleHasKeyword = false
  let descriptionHasKeyword = false

  if (pilierKeyword) {
    const titleMatch = matchKeyword(metaTitle ?? '', pilierKeyword)
    titleHasKeyword = titleMatch.detected

    const descMatch = matchKeyword(metaDescription ?? '', pilierKeyword)
    descriptionHasKeyword = descMatch.detected
  }

  return {
    titleLength,
    titleInRange: titleLength >= META_TITLE_LENGTH.min && titleLength <= META_TITLE_LENGTH.max,
    descriptionLength,
    descriptionInRange: descriptionLength >= META_DESCRIPTION_LENGTH.min && descriptionLength <= META_DESCRIPTION_LENGTH.max,
    titleHasKeyword,
    descriptionHasKeyword,
  }
}

/**
 * Score a density value against its target range (0-100).
 */
function scoreDensity(density: number, target: { min: number; max: number }): number {
  if (density >= target.min && density <= target.max) return 100
  if (density < target.min) {
    return target.min > 0 ? Math.max(0, (density / target.min) * 100) : 0
  }
  // Over target
  const overshoot = density - target.max
  const range = target.max - target.min
  return Math.max(0, 100 - (overshoot / (range || 1)) * 100)
}

/**
 * Score meta tag length (0-100).
 */
function scoreMetaLength(length: number, range: { min: number; max: number }): number {
  if (length === 0) return 0
  if (length >= range.min && length <= range.max) return 100
  if (length < range.min) return (length / range.min) * 100
  // Over max
  const overshoot = length - range.max
  return Math.max(0, 100 - (overshoot / range.max) * 100)
}

/**
 * Extract all text content BEFORE the first H2 (intro section).
 */
function extractIntro(html: string): string {
  const h2Index = html.search(/<h2[\s>]/i)
  const introHtml = h2Index > 0 ? html.substring(0, h2Index) : html
  return stripHtml(introHtml).toLowerCase()
}

/**
 * Extract all text content AFTER the last H2 (conclusion section).
 * Falls back to last paragraph if no H2 is found.
 */
function extractConclusion(html: string): string {
  const h2Matches = [...html.matchAll(/<h2[\s>]/gi)]
  if (h2Matches.length > 0) {
    const lastH2Index = h2Matches[h2Matches.length - 1]!.index!
    return stripHtml(html.substring(lastH2Index)).toLowerCase()
  }
  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi)
  if (!paragraphs || paragraphs.length === 0) return ''
  return stripHtml(paragraphs[paragraphs.length - 1]!).toLowerCase()
}

/**
 * Extract all H1 text content.
 */
function extractH1(html: string): string {
  const match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)
  return match ? stripHtml(match[1]!).toLowerCase() : ''
}

/**
 * Extract all H2 text content combined.
 */
function extractH2s(html: string): string {
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
  const texts: string[] = []
  let m: RegExpExecArray | null
  while ((m = h2Regex.exec(html)) !== null) {
    texts.push(stripHtml(m[1]!).toLowerCase())
  }
  return texts.join(' ')
}

const CHECKLIST_LOCATIONS: { location: ChecklistLocation; label: string }[] = [
  { location: 'metaTitle', label: 'Meta title' },
  { location: 'h1', label: 'Titre H1' },
  { location: 'intro', label: 'Introduction' },
  { location: 'metaDescription', label: 'Meta description' },
  { location: 'h2', label: 'Sous-titres H2' },
  { location: 'conclusion', label: 'Conclusion' },
]

/**
 * Generate SEO checklist items for pilier keyword presence in key content locations.
 * Uses smart matching (exact → semantic → partial).
 */
export function generateSeoChecklist(
  htmlContent: string,
  keywords: Keyword[],
  metaTitle: string | null,
  metaDescription: string | null,
): ChecklistItem[] {
  const pilierKeyword = keywords.find(kw => kw.type === 'Pilier')
  if (!pilierKeyword) return []

  const kw = pilierKeyword.keyword

  const sectionTexts: Record<ChecklistLocation, string> = {
    metaTitle: metaTitle?.toLowerCase() ?? '',
    h1: extractH1(htmlContent),
    intro: extractIntro(htmlContent),
    metaDescription: metaDescription?.toLowerCase() ?? '',
    h2: extractH2s(htmlContent),
    conclusion: extractConclusion(htmlContent),
  }

  return CHECKLIST_LOCATIONS.map(({ location, label }) => {
    const prepared = prepareText(sectionTexts[location])
    const match = matchKeywordPrepared(prepared, kw)
    return {
      keyword: pilierKeyword.keyword,
      location,
      label,
      isPresent: match.detected,
      matchMethod: match.method,
      matchScore: match.score,
    }
  })
}

/**
 * Detect NLP terms (DataForSEO related keywords) in HTML content.
 * Uses smart matching for better detection of multi-word terms.
 */
export function detectNlpTerms(
  htmlContent: string,
  relatedKeywords: RelatedKeyword[],
): NlpTermResult[] {
  const plainText = stripHtml(htmlContent).toLowerCase()
  const prepared = prepareText(plainText)

  return relatedKeywords.map(rk => {
    const match = matchKeywordPrepared(prepared, rk.keyword)
    return {
      term: rk.keyword,
      searchVolume: rk.searchVolume,
      isDetected: match.detected,
    }
  })
}

/**
 * Calculate the complete SEO score for an article.
 */
export function calculateSeoScore(
  htmlContent: string,
  keywords: Keyword[],
  metaTitle: string | null,
  metaDescription: string | null,
  contentLengthTarget?: number,
  relatedKeywords?: RelatedKeyword[],
  articleKeywords?: ArticleKeywords,
): SeoScore {
  const plainText = stripHtml(htmlContent)
  const wordCount = countWords(plainText)
  const prepared = prepareText(plainText.toLowerCase())

  // Use article-level keywords — no fallback to cocoon keywords
  let keywordDensities: KeywordDensity[]
  let pilierKeyword: string | null
  let hasArticleKeywords = false

  if (articleKeywords?.capitaine) {
    hasArticleKeywords = true
    // Build keyword densities from article keywords hierarchy
    const capitaineKw: Keyword = { keyword: articleKeywords.capitaine, cocoonName: '', type: 'Pilier', status: 'validated' }
    const lieutenantKws: Keyword[] = articleKeywords.lieutenants.map(lt => ({
      keyword: lt, cocoonName: '', type: 'Moyenne traine' as const, status: 'validated' as const,
    }))

    const allKws = [capitaineKw, ...lieutenantKws]
    keywordDensities = allKws.map(kw => calculateKeywordDensity(htmlContent, kw, prepared))
    pilierKeyword = articleKeywords.capitaine

    // Debug: log density calculation details
    if (typeof window !== 'undefined') {
      console.debug('[seo-calc] using articleKeywords —', {
        capitaine: articleKeywords.capitaine,
        lieutenants: articleKeywords.lieutenants,
        wordCount,
        plainTextSnippet: plainText.substring(0, 200),
        densities: keywordDensities.map(d => ({ kw: d.keyword, occ: d.occurrences, density: d.density, method: d.matchMethod })),
      })
    }
  } else {
    // No article keywords — return empty densities (no fallback to cocoon)
    keywordDensities = []
    pilierKeyword = null

    if (typeof window !== 'undefined') {
      console.debug('[seo-calc] no article keywords — keyword scoring disabled')
    }
  }

  // Lexique presence score (if article keywords available)
  let lexiquePresenceScore = 50 // neutral default
  if (articleKeywords?.lexique && articleKeywords.lexique.length > 0) {
    const presentCount = articleKeywords.lexique.filter(term => {
      const match = matchKeywordPrepared(prepared, term)
      return match.detected
    }).length
    lexiquePresenceScore = Math.round((presentCount / articleKeywords.lexique.length) * 100)
  }

  // Heading validation
  const headingValidation = validateHeadingHierarchy(htmlContent)

  // Meta analysis
  const metaAnalysis = analyzeMetaTags(metaTitle, metaDescription, pilierKeyword)

  // Factor scores
  const pilierDensities = keywordDensities.filter(d => d.type === 'Pilier')
  const secondaryDensities = keywordDensities.filter(d => d.type !== 'Pilier')

  const keywordPilierScore = pilierDensities.length > 0
    ? pilierDensities.reduce((sum, d) => sum + scoreDensity(d.density, d.target), 0) / pilierDensities.length
    : 50

  const keywordSecondaryScore = secondaryDensities.length > 0
    ? secondaryDensities.reduce((sum, d) => sum + scoreDensity(d.density, d.target), 0) / secondaryDensities.length
    : 50

  const headingScore = headingValidation.isValid
    ? 100
    : Math.max(0, 100 - headingValidation.errors.length * 25)

  const metaTitleScore = scoreMetaLength(metaAnalysis.titleLength, META_TITLE_LENGTH)
    * (metaAnalysis.titleHasKeyword ? 1 : 0.7)

  const metaDescriptionScore = scoreMetaLength(metaAnalysis.descriptionLength, META_DESCRIPTION_LENGTH)
    * (metaAnalysis.descriptionHasKeyword ? 1 : 0.7)

  const target = contentLengthTarget ?? DEFAULT_CONTENT_LENGTH_TARGET
  const contentLengthScore = target > 0
    ? Math.min(100, (wordCount / target) * 100)
    : 50

  const factors: SeoFactors = {
    keywordPilierScore: Math.round(keywordPilierScore),
    keywordSecondaryScore: Math.round(keywordSecondaryScore),
    headingScore: Math.round(headingScore),
    metaTitleScore: Math.round(metaTitleScore),
    metaDescriptionScore: Math.round(metaDescriptionScore),
    contentLengthScore: Math.round(contentLengthScore),
  }

  const global = Math.round(
    factors.keywordPilierScore * SEO_SCORE_WEIGHTS.keywordPilier +
    factors.keywordSecondaryScore * SEO_SCORE_WEIGHTS.keywordSecondary +
    factors.headingScore * SEO_SCORE_WEIGHTS.heading +
    factors.metaTitleScore * SEO_SCORE_WEIGHTS.metaTitle +
    factors.metaDescriptionScore * SEO_SCORE_WEIGHTS.metaDescription +
    factors.contentLengthScore * SEO_SCORE_WEIGHTS.contentLength,
  )

  // Checklist & NLP terms
  const checklistKeywords = articleKeywords?.capitaine
    ? [{ keyword: articleKeywords.capitaine, cocoonName: '', type: 'Pilier' as const, status: 'validated' as const }]
    : keywords
  const checklistItems = generateSeoChecklist(htmlContent, checklistKeywords, metaTitle, metaDescription)
  const nlpTerms = relatedKeywords ? detectNlpTerms(htmlContent, relatedKeywords) : []

  return {
    global: Math.min(100, Math.max(0, global)),
    factors,
    keywordDensities,
    headingValidation,
    metaAnalysis,
    wordCount,
    checklistItems,
    nlpTerms,
    hasArticleKeywords,
  }
}
