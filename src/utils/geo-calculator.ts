import type {
  GeoScore,
  GeoFactors,
  AnswerCapsuleCheck,
  QuestionHeadingsAnalysis,
  SourcedStatsAnalysis,
  ParagraphAlert,
  JargonDetection,
} from '@shared/types/geo.types.js'
import {
  QUESTION_HEADINGS_TARGET,
  SOURCED_STATS_TARGET,
  GEO_SCORE_WEIGHTS,
  MAX_PARAGRAPH_WORDS,
  JARGON_DICTIONARY,
} from '@shared/constants/geo.constants.js'

/**
 * Strip HTML tags and return plain text.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Check if a text string is formulated as a question.
 */
function isQuestion(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.endsWith('?')) return true
  // French question patterns
  const questionPatterns = /^(comment|pourquoi|quand|où|quel|quelle|quels|quelles|combien|est-ce que|qu['']est-ce|que faire|qui|quoi)\b/i
  return questionPatterns.test(trimmed)
}

/**
 * Extract H2 sections: each H2 heading + content until the next H2/H1.
 */
function extractH2Sections(html: string): { heading: string; content: string }[] {
  const sections: { heading: string; content: string }[] = []
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
  const matches: { heading: string; index: number; endIndex: number }[] = []

  let m: RegExpExecArray | null
  while ((m = h2Regex.exec(html)) !== null) {
    matches.push({
      heading: stripHtml(m[1]!),
      index: m.index,
      endIndex: m.index + m[0].length,
    })
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i]!.endIndex
    const end = i + 1 < matches.length ? matches[i + 1]!.index : html.length
    sections.push({
      heading: matches[i]!.heading,
      content: html.slice(start, end),
    })
  }

  return sections
}

/**
 * Check answer capsules for each H2 section.
 * An answer capsule is a concise, extractable summary paragraph right after the H2.
 * We detect it via custom TipTap node data attributes or by checking if a short
 * (<= 50 words) paragraph follows the H2 heading.
 */
export function checkAnswerCapsules(htmlContent: string): AnswerCapsuleCheck[] {
  const sections = extractH2Sections(htmlContent)

  return sections.map(section => {
    // Check for answer-capsule data attribute (TipTap custom extension)
    const hasDataAttr = /data-type=["']answer-?capsule["']/i.test(section.content)

    // Fallback: check if the first paragraph is concise (<=50 words) — a simple heuristic
    let hasShortFirstParagraph = false
    if (!hasDataAttr) {
      const firstPMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(section.content)
      if (firstPMatch) {
        const words = stripHtml(firstPMatch[1]!).split(/\s+/).filter(Boolean)
        hasShortFirstParagraph = words.length > 0 && words.length <= 50
      }
    }

    return {
      heading: section.heading,
      hasAnswerCapsule: hasDataAttr || hasShortFirstParagraph,
    }
  })
}

/**
 * Analyze the percentage of H2/H3 headings formulated as questions.
 */
export function analyzeQuestionHeadings(htmlContent: string): QuestionHeadingsAnalysis {
  const headingRegex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi
  const headings: string[] = []
  let m: RegExpExecArray | null

  while ((m = headingRegex.exec(htmlContent)) !== null) {
    headings.push(stripHtml(m[1]!))
  }

  const totalH2H3 = headings.length
  const questionCount = headings.filter(h => isQuestion(h)).length
  const percentage = totalH2H3 > 0 ? Math.round((questionCount / totalH2H3) * 100) : 0

  return { totalH2H3, questionCount, percentage }
}

/**
 * Count sourced statistics in content.
 * A sourced stat is a number/percentage followed or preceded by a source marker
 * (parenthetical citation, "source:", "selon", etc.).
 */
export function countSourcedStats(htmlContent: string): SourcedStatsAnalysis {
  const plainText = stripHtml(htmlContent)

  // Patterns for sourced statistics:
  // - "X%" or "X %" near source indicators
  // - Numbers with "selon", "d'après", "source :", "(Source:", "(étude"
  const statPatterns = [
    /\d+[\s]?%\s*\([^)]+\)/g,           // "42% (Source XYZ)"
    /\d+[\s]?%\s*selon\b/gi,            // "42% selon..."
    /selon\s+[^,.]+(,?\s*\d+[\s]?%)/gi, // "selon X, 42%"
    /d['']après\s+[^,.]+\d+/gi,         // "d'après X... 42"
    /\(source\s*:[^)]+\)/gi,            // "(source: XYZ)"
    /\(étude\s+[^)]+\)/gi,              // "(étude XYZ)"
  ]

  const matches = new Set<number>()
  for (const pattern of statPatterns) {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(plainText)) !== null) {
      // Use match position to deduplicate overlapping matches
      matches.add(m.index)
    }
  }

  const count = matches.size
  return {
    count,
    inTarget: count >= SOURCED_STATS_TARGET.min,
  }
}

/**
 * Detect paragraphs that exceed the maximum word count.
 */
export function detectLongParagraphs(htmlContent: string): ParagraphAlert[] {
  const paragraphs = htmlContent.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? []
  const alerts: ParagraphAlert[] = []

  paragraphs.forEach((p, index) => {
    const text = stripHtml(p)
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length > MAX_PARAGRAPH_WORDS) {
      alerts.push({
        index,
        wordCount: words.length,
        excerpt: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
      })
    }
  })

  return alerts
}

/**
 * Detect jargon terms in content and provide reformulation suggestions.
 */
export function detectJargon(htmlContent: string): JargonDetection[] {
  const plainText = stripHtml(htmlContent).toLowerCase()
  const detections: JargonDetection[] = []

  for (const [term, suggestion] of Object.entries(JARGON_DICTIONARY)) {
    const termLower = term.toLowerCase()
    let count = 0
    let pos = 0
    while ((pos = plainText.indexOf(termLower, pos)) !== -1) {
      count++
      pos += termLower.length
    }
    if (count > 0) {
      detections.push({ term, suggestion, count })
    }
  }

  return detections.sort((a, b) => b.count - a.count)
}

/**
 * Calculate the complete GEO score for an article.
 */
export function calculateGeoScore(htmlContent: string): GeoScore {
  // Answer capsules
  const answerCapsules = checkAnswerCapsules(htmlContent)
  const capsulePresent = answerCapsules.filter(c => c.hasAnswerCapsule).length
  const capsuleTotal = answerCapsules.length
  const answerCapsulesScore = capsuleTotal > 0
    ? Math.round((capsulePresent / capsuleTotal) * 100)
    : 50

  // Question headings
  const questionHeadings = analyzeQuestionHeadings(htmlContent)
  const questionHeadingsScore = questionHeadings.totalH2H3 > 0
    ? Math.min(100, Math.round((questionHeadings.percentage / QUESTION_HEADINGS_TARGET) * 100))
    : 50

  // Sourced stats
  const sourcedStats = countSourcedStats(htmlContent)
  const sourcedStatsScore = Math.min(100, Math.round((sourcedStats.count / SOURCED_STATS_TARGET.min) * 100))

  // Extractibility: combination of short paragraphs, structured content
  // Simple heuristic: count paragraphs, check average paragraph length
  const paragraphs = htmlContent.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? []
  const paragraphWordCounts = paragraphs.map(p => {
    const words = stripHtml(p).split(/\s+/).filter(Boolean)
    return words.length
  })
  const avgParagraphLength = paragraphWordCounts.length > 0
    ? paragraphWordCounts.reduce((s, n) => s + n, 0) / paragraphWordCounts.length
    : 0
  // Good extractibility: avg paragraph <= 60 words
  const extractibilityScore = avgParagraphLength > 0
    ? Math.min(100, Math.round(Math.max(0, (1 - Math.max(0, avgParagraphLength - 30) / 60) * 100)))
    : 50

  const factors: GeoFactors = {
    extractibilityScore,
    questionHeadingsScore,
    answerCapsulesScore,
    sourcedStatsScore,
  }

  const global = Math.round(
    factors.extractibilityScore * GEO_SCORE_WEIGHTS.extractibility +
    factors.questionHeadingsScore * GEO_SCORE_WEIGHTS.questionHeadings +
    factors.answerCapsulesScore * GEO_SCORE_WEIGHTS.answerCapsules +
    factors.sourcedStatsScore * GEO_SCORE_WEIGHTS.sourcedStats,
  )

  // Paragraph alerts & jargon
  const paragraphAlerts = detectLongParagraphs(htmlContent)
  const jargonDetections = detectJargon(htmlContent)

  return {
    global: Math.min(100, Math.max(0, global)),
    factors,
    answerCapsules,
    questionHeadings,
    sourcedStats,
    paragraphAlerts,
    jargonDetections,
  }
}
