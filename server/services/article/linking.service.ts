import { pool } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import { loadArticlesDb } from '../infra/data.service.js'
import type {
  InternalLink,
  LinkingMatrix,
  LinkSuggestion,
  OrphanArticle,
  AnchorDiversityAlert,
  CrossCocoonOpportunity,
} from '../../../shared/types/linking.types.js'
import type { ArticleType } from '../../../shared/types/index.js'

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
 * Pilier <-> Intermédiaire, Intermédiaire <-> Spécialisé.
 * Pilier -> Spécialisé is allowed but not recommended (distance = 2).
 */
export function isValidHierarchyLink(sourceType: ArticleType, targetType: ArticleType): boolean {
  const distance = Math.abs(HIERARCHY_ORDER[sourceType]! - HIERARCHY_ORDER[targetType]!)
  return distance <= 2
}

/** Load the linking matrix from PG */
export async function getMatrix(): Promise<LinkingMatrix> {
  const res = await pool.query(
    `SELECT source_id as "sourceId", target_id as "targetId", position, anchor_text as "anchorText"
     FROM internal_links ORDER BY source_id, target_id`
  )
  const updatedRes = await pool.query(`SELECT MAX(validated_at) as last FROM internal_links`)
  return {
    links: res.rows as InternalLink[],
    updatedAt: updatedRes.rows[0]?.last ? (updatedRes.rows[0].last as Date).toISOString() : null,
  }
}

/** Save the full linking matrix (replace all) */
export async function saveMatrix(matrix: LinkingMatrix): Promise<LinkingMatrix> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM internal_links')
    for (const link of matrix.links) {
      await client.query(
        `INSERT INTO internal_links (source_id, target_id, position, anchor_text)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (source_id, target_id, position) DO UPDATE
         SET anchor_text = EXCLUDED.anchor_text`,
        [link.sourceId, link.targetId, link.position ?? null, link.anchorText ?? '']
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
  return { ...matrix, updatedAt: new Date().toISOString() }
}

/** Add or update links in the matrix */
export async function upsertLinks(newLinks: InternalLink[]): Promise<LinkingMatrix> {
  for (const link of newLinks) {
    await pool.query(
      `INSERT INTO internal_links (source_id, target_id, position, anchor_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (source_id, target_id, position) DO UPDATE
       SET anchor_text = EXCLUDED.anchor_text`,
      [link.sourceId, link.targetId, link.position ?? null, link.anchorText ?? '']
    )
  }
  return getMatrix()
}

/** Get links for a specific article (as source or target) */
export function getLinksForArticle(
  matrix: LinkingMatrix,
  articleId: number,
): { outgoing: InternalLink[]; incoming: InternalLink[] } {
  return {
    outgoing: matrix.links.filter((l) => l.sourceId === articleId),
    incoming: matrix.links.filter((l) => l.targetId === articleId),
  }
}

/** Suggest internal links for an article based on content analysis */
export async function suggestLinks(articleId: number, content: string): Promise<LinkSuggestion[]> {
  log.info(`Suggesting links for article ${articleId}`)
  const cocoons = await loadArticlesDb()
  const suggestions: LinkSuggestion[] = []

  // Find source article and its cocoon
  let sourceCocoonName: string | null = null
  let sourceType: ArticleType | null = null
  for (const cocoon of cocoons) {
    const found = cocoon.articles.find((a) => a.id === articleId)
    if (found) {
      sourceCocoonName = cocoon.name
      sourceType = found.type
      break
    }
  }

  if (!sourceCocoonName || !sourceType) return suggestions

  const matrix = await getMatrix()
  const existingTargets = new Set(
    matrix.links.filter((l) => l.sourceId === articleId).map((l) => l.targetId),
  )

  const contentLower = content.toLowerCase()

  // Look for potential link targets in the same cocoon first, then others
  for (const cocoon of cocoons) {
    for (const article of cocoon.articles) {
      if (article.id === articleId) continue
      if (existingTargets.has(article.id)) continue

      // Check if article title words appear in content
      const titleWords = article.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      const matchingWords = titleWords.filter((w) => contentLower.includes(w))

      if (matchingWords.length >= 2) {
        const isSameCocoon = cocoon.name === sourceCocoonName
        const hierarchyValid = isValidHierarchyLink(sourceType!, article.type)

        if (hierarchyValid) {
          suggestions.push({
            targetId: article.id,
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
  const res = await pool.query(`
    SELECT a.id, a.slug, a.titre as title, a.type, c.nom as cocoon_name
    FROM articles a
    LEFT JOIN internal_links il ON il.target_id = a.id
    JOIN cocoons c ON c.id = a.cocoon_id
    WHERE il.id IS NULL AND a.cocoon_id IS NOT NULL
    ORDER BY a.id
  `)
  return res.rows.map(r => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    cocoonName: r.cocoon_name,
    type: r.type,
  }))
}

/** Check anchor text diversity -- flag anchors used more than 3 times */
export function checkAnchorDiversity(matrix: LinkingMatrix): AnchorDiversityAlert[] {
  const anchorCounts = new Map<string, string[]>()

  for (const link of matrix.links) {
    const key = link.anchorText.toLowerCase().trim()
    const targets = anchorCounts.get(key) || []
    targets.push(String(link.targetId))
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
  const articleCocoon = new Map<number, { cocoonName: string; title: string; type: ArticleType }>()
  for (const cocoon of cocoons) {
    for (const article of cocoon.articles) {
      articleCocoon.set(article.id, { cocoonName: cocoon.name, title: article.title, type: article.type })
    }
  }

  // Find existing cross-cocoon links
  const existingCrossLinks = new Set<string>()
  for (const link of matrix.links) {
    const source = articleCocoon.get(link.sourceId)
    const target = articleCocoon.get(link.targetId)
    if (source && target && source.cocoonName !== target.cocoonName) {
      existingCrossLinks.add(`${link.sourceId}->${link.targetId}`)
    }
  }

  // Suggest cross-cocoon links for Pilier articles
  const pilierArticles = [...articleCocoon.entries()].filter(([, info]) => info.type === 'Pilier')

  for (const [sourceId, sourceInfo] of pilierArticles) {
    for (const [targetId, targetInfo] of pilierArticles) {
      if (sourceId === targetId) continue
      if (sourceInfo.cocoonName === targetInfo.cocoonName) continue
      if (existingCrossLinks.has(`${sourceId}->${targetId}`)) continue

      opportunities.push({
        sourceId,
        sourceTitle: sourceInfo.title,
        sourceCocoon: sourceInfo.cocoonName,
        targetId,
        targetTitle: targetInfo.title,
        targetCocoon: targetInfo.cocoonName,
        suggestedAnchor: targetInfo.title,
      })
    }
  }

  return opportunities.slice(0, 20)
}
