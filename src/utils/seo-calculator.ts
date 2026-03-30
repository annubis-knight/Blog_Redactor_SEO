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
 */
export function calculateKeywordDensity(
  htmlContent: string,
  keyword: Keyword,
): KeywordDensity {
  const plainText = stripHtml(htmlContent).toLowerCase()
  const totalWords = countWords(plainText)
  const kw = keyword.keyword.toLowerCase()
  const kwWords = kw.split(/\s+/).length

  let occurrences = 0
  if (totalWords > 0) {
    // Count phrase occurrences
    let pos = 0
    while ((pos = plainText.indexOf(kw, pos)) !== -1) {
      occurrences++
      pos += kw.length
    }
  }

  const density = totalWords > 0 ? (occurrences * kwWords / totalWords) * 100 : 0
  const target = KEYWORD_DENSITY_TARGETS[keyword.type]

  return {
    keyword: keyword.keyword,
    type: keyword.type,
    occurrences,
    density: Math.round(density * 100) / 100,
    target,
    inTarget: density >= target.min && density <= target.max,
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
 */
export function analyzeMetaTags(
  metaTitle: string | null,
  metaDescription: string | null,
  pilierKeyword: string | null,
): MetaTagAnalysis {
  const titleLength = metaTitle?.length ?? 0
  const descriptionLength = metaDescription?.length ?? 0

  const titleHasKeyword = pilierKeyword
    ? (metaTitle?.toLowerCase().includes(pilierKeyword.toLowerCase()) ?? false)
    : false

  const descriptionHasKeyword = pilierKeyword
    ? (metaDescription?.toLowerCase().includes(pilierKeyword.toLowerCase()) ?? false)
    : false

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
 * Extract text content from the first paragraph of the HTML (intro).
 */
function extractIntro(html: string): string {
  const match = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html)
  return match ? stripHtml(match[1]!).toLowerCase() : ''
}

/**
 * Extract text content from the last paragraph of the HTML (conclusion).
 */
function extractConclusion(html: string): string {
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
 */
export function generateSeoChecklist(
  htmlContent: string,
  keywords: Keyword[],
  metaTitle: string | null,
  metaDescription: string | null,
): ChecklistItem[] {
  const pilierKeyword = keywords.find(kw => kw.type === 'Pilier')
  if (!pilierKeyword) return []

  const kw = pilierKeyword.keyword.toLowerCase()
  const metaTitleLower = metaTitle?.toLowerCase() ?? ''
  const metaDescLower = metaDescription?.toLowerCase() ?? ''
  const h1Text = extractH1(htmlContent)
  const introText = extractIntro(htmlContent)
  const h2Text = extractH2s(htmlContent)
  const conclusionText = extractConclusion(htmlContent)

  const detectors: Record<ChecklistLocation, string> = {
    metaTitle: metaTitleLower,
    h1: h1Text,
    intro: introText,
    metaDescription: metaDescLower,
    h2: h2Text,
    conclusion: conclusionText,
  }

  return CHECKLIST_LOCATIONS.map(({ location, label }) => ({
    keyword: pilierKeyword.keyword,
    location,
    label,
    isPresent: detectors[location].includes(kw),
  }))
}

/**
 * Detect NLP terms (DataForSEO related keywords) in HTML content.
 */
export function detectNlpTerms(
  htmlContent: string,
  relatedKeywords: RelatedKeyword[],
): NlpTermResult[] {
  const plainText = stripHtml(htmlContent).toLowerCase()

  return relatedKeywords.map(rk => ({
    term: rk.keyword,
    searchVolume: rk.searchVolume,
    isDetected: plainText.includes(rk.keyword.toLowerCase()),
  }))
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

  // Use article-level keywords if available, fallback to cocoon keywords
  let keywordDensities: KeywordDensity[]
  let pilierKeyword: string | null

  if (articleKeywords?.capitaine) {
    // Build keyword densities from article keywords hierarchy
    const capitaineKw: Keyword = { keyword: articleKeywords.capitaine, cocoonName: '', type: 'Pilier', status: 'validated' }
    const lieutenantKws: Keyword[] = articleKeywords.lieutenants.map(lt => ({
      keyword: lt, cocoonName: '', type: 'Moyenne traine' as const, status: 'validated' as const,
    }))

    keywordDensities = [capitaineKw, ...lieutenantKws].map(kw => calculateKeywordDensity(htmlContent, kw))
    pilierKeyword = articleKeywords.capitaine
  } else {
    keywordDensities = keywords.map(kw => calculateKeywordDensity(htmlContent, kw))
    pilierKeyword = keywords.find(kw => kw.type === 'Pilier')?.keyword ?? null
  }

  // Lexique presence score (if article keywords available)
  let lexiquePresenceScore = 50 // neutral default
  if (articleKeywords?.lexique && articleKeywords.lexique.length > 0) {
    const plainLower = plainText.toLowerCase()
    const presentCount = articleKeywords.lexique.filter(term => plainLower.includes(term.toLowerCase())).length
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
  }
}
