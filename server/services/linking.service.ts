import { join } from 'path'
import { log } from '../utils/logger.js'
import { readJson, writeJson } from '../utils/json-storage.js'
import { loadArticlesDb } from './data.service.js'
import type {
  InternalLink,
  LinkingMatrix,
  LinkSuggestion,
  OrphanArticle,
  AnchorDiversityAlert,
  CrossCocoonOpportunity,
} from '../../shared/types/linking.types.js'
import type { ArticleType } from '../../shared/types/index.js'

const LINKS_DIR = join(process.cwd(), 'data', 'links')
const MATRIX_PATH = join(LINKS_DIR, 'linking-matrix.json')

const DEFAULT_MATRIX: LinkingMatrix = {
  links: [],
  updatedAt: null,
}

/** Allowed linking directions in cocoon hierarchy */
const HIERARCHY_ORDER: Record<ArticleType, number> = {
  'Pilier': 0,
  'Intermédiaire': 1,
  'Spécialisé': 2,
}

/**
 * Check if a link respects the cocoon hierarchy.
 * Pilier ↔ Intermédiaire, Intermédiaire ↔ Spécialisé.
 * Pilier → Spécialisé is allowed but not recommended (distance = 2).
 */
export function isValidHierarchyLink(sourceType: ArticleType, targetType: ArticleType): boolean {
  const distance = Math.abs(HIERARCHY_ORDER[sourceType]! - HIERARCHY_ORDER[targetType]!)
  return distance <= 2
}

/** Load the linking matrix from disk, or return empty default */
export async function getMatrix(): Promise<LinkingMatrix> {
  try {
    return await readJson<LinkingMatrix>(MATRIX_PATH)
  } catch {
    return { ...DEFAULT_MATRIX, links: [] }
  }
}

/** Save the full linking matrix to disk atomically */
export async function saveMatrix(matrix: LinkingMatrix): Promise<LinkingMatrix> {
  const updated: LinkingMatrix = {
    ...matrix,
    updatedAt: new Date().toISOString(),
  }
  await writeJson(MATRIX_PATH, updated)
  return updated
}

/** Add or update links in the matrix */
export async function upsertLinks(newLinks: InternalLink[]): Promise<LinkingMatrix> {
  const matrix = await getMatrix()

  for (const link of newLinks) {
    const existingIndex = matrix.links.findIndex(
      (l) => l.sourceSlug === link.sourceSlug && l.targetSlug === link.targetSlug && l.position === link.position,
    )
    if (existingIndex >= 0) {
      matrix.links[existingIndex] = link
    } else {
      matrix.links.push(link)
    }
  }

  return saveMatrix(matrix)
}

/** Remove all links from a specific source article */
export async function removeLinksFromSource(sourceSlug: string): Promise<LinkingMatrix> {
  const matrix = await getMatrix()
  matrix.links = matrix.links.filter((l) => l.sourceSlug !== sourceSlug)
  return saveMatrix(matrix)
}

/** Get links for a specific article (as source or target) */
export function getLinksForArticle(
  matrix: LinkingMatrix,
  slug: string,
): { outgoing: InternalLink[]; incoming: InternalLink[] } {
  return {
    outgoing: matrix.links.filter((l) => l.sourceSlug === slug),
    incoming: matrix.links.filter((l) => l.targetSlug === slug),
  }
}

/** Suggest internal links for an article based on content analysis */
export async function suggestLinks(articleSlug: string, content: string): Promise<LinkSuggestion[]> {
  log.info(`Suggesting links for "${articleSlug}"`)
  const cocoons = await loadArticlesDb()
  const suggestions: LinkSuggestion[] = []

  // Find source article and its cocoon
  let sourceCocoonName: string | null = null
  let sourceType: ArticleType | null = null
  for (const cocoon of cocoons) {
    const found = cocoon.articles.find((a) => a.slug === articleSlug)
    if (found) {
      sourceCocoonName = cocoon.name
      sourceType = found.type
      break
    }
  }

  if (!sourceCocoonName || !sourceType) return suggestions

  const matrix = await getMatrix()
  const existingTargets = new Set(
    matrix.links.filter((l) => l.sourceSlug === articleSlug).map((l) => l.targetSlug),
  )

  const contentLower = content.toLowerCase()

  // Look for potential link targets in the same cocoon first, then others
  for (const cocoon of cocoons) {
    for (const article of cocoon.articles) {
      if (article.slug === articleSlug) continue
      if (existingTargets.has(article.slug)) continue

      // Check if article title words appear in content
      const titleWords = article.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      const matchingWords = titleWords.filter((w) => contentLower.includes(w))

      if (matchingWords.length >= 2) {
        const isSameCocoon = cocoon.name === sourceCocoonName
        const hierarchyValid = isValidHierarchyLink(sourceType!, article.type)

        if (hierarchyValid) {
          suggestions.push({
            targetSlug: article.slug,
            targetTitle: article.title,
            targetType: article.type,
            suggestedAnchor: matchingWords.slice(0, 4).join(' '),
            reason: isSameCocoon
              ? `Même cocon (${cocoon.name}), hiérarchie ${sourceType} → ${article.type}`
              : `Cross-cocon (${cocoon.name}), mots communs détectés`,
          })
        }
      }
    }
  }

  // Sort: same cocoon first, then by number of matching words (via reason length as proxy)
  suggestions.sort((a, b) => {
    const aIntra = a.reason.startsWith('Même cocon') ? 0 : 1
    const bIntra = b.reason.startsWith('Même cocon') ? 0 : 1
    return aIntra - bIntra
  })

  return suggestions.slice(0, 10)
}

/** Detect orphan articles (no incoming links) */
export async function detectOrphans(): Promise<OrphanArticle[]> {
  log.debug('Detecting orphan articles')
  const cocoons = await loadArticlesDb()
  const matrix = await getMatrix()

  const targetsWithIncoming = new Set(matrix.links.map((l) => l.targetSlug))
  const orphans: OrphanArticle[] = []

  for (const cocoon of cocoons) {
    for (const article of cocoon.articles) {
      if (!targetsWithIncoming.has(article.slug)) {
        orphans.push({
          slug: article.slug,
          title: article.title,
          cocoonName: cocoon.name,
          type: article.type,
        })
      }
    }
  }

  return orphans
}

/** Check anchor text diversity — flag anchors used more than 3 times */
export function checkAnchorDiversity(matrix: LinkingMatrix): AnchorDiversityAlert[] {
  const anchorCounts = new Map<string, string[]>()

  for (const link of matrix.links) {
    const key = link.anchorText.toLowerCase().trim()
    const targets = anchorCounts.get(key) || []
    targets.push(link.targetSlug)
    anchorCounts.set(key, targets)
  }

  const alerts: AnchorDiversityAlert[] = []
  for (const [anchorText, targets] of anchorCounts) {
    if (targets.length > 3) {
      alerts.push({
        anchorText,
        count: targets.length,
        targets: [...new Set(targets)],
      })
    }
  }

  return alerts.sort((a, b) => b.count - a.count)
}

/** Identify cross-cocoon linking opportunities */
export async function findCrossCocoonOpportunities(): Promise<CrossCocoonOpportunity[]> {
  const cocoons = await loadArticlesDb()
  const matrix = await getMatrix()
  const opportunities: CrossCocoonOpportunity[] = []

  // Build cocoon lookup
  const articleCocoon = new Map<string, { cocoonName: string; title: string; type: ArticleType }>()
  for (const cocoon of cocoons) {
    for (const article of cocoon.articles) {
      articleCocoon.set(article.slug, { cocoonName: cocoon.name, title: article.title, type: article.type })
    }
  }

  // Find existing cross-cocoon links
  const existingCrossLinks = new Set<string>()
  for (const link of matrix.links) {
    const source = articleCocoon.get(link.sourceSlug)
    const target = articleCocoon.get(link.targetSlug)
    if (source && target && source.cocoonName !== target.cocoonName) {
      existingCrossLinks.add(`${link.sourceSlug}→${link.targetSlug}`)
    }
  }

  // Suggest cross-cocoon links for Pilier articles
  const pilierArticles = [...articleCocoon.entries()].filter(([, info]) => info.type === 'Pilier')

  for (const [sourceSlug, sourceInfo] of pilierArticles) {
    for (const [targetSlug, targetInfo] of pilierArticles) {
      if (sourceSlug === targetSlug) continue
      if (sourceInfo.cocoonName === targetInfo.cocoonName) continue
      if (existingCrossLinks.has(`${sourceSlug}→${targetSlug}`)) continue

      opportunities.push({
        sourceSlug,
        sourceTitle: sourceInfo.title,
        sourceCocoon: sourceInfo.cocoonName,
        targetSlug,
        targetTitle: targetInfo.title,
        targetCocoon: targetInfo.cocoonName,
        suggestedAnchor: targetInfo.title,
      })
    }
  }

  return opportunities.slice(0, 20)
}
