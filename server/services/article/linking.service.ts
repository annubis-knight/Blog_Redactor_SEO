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
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types.js'

const _DEFAULT_MATRIX: LinkingMatrix = {
  links: [],
  updatedAt: null,
}

/** Allowed linking directions in cocoon hierarchy */
const HIERARCHY_ORDER: Record<ArticleLevel, number> = {
  'pilier': 0,
  'intermediaire': 1,
  'specifique': 2,
}

/**
 * Check if a link respects the cocoon hierarchy.
 * Pilier <-> Intermédiaire, Intermédiaire <-> Spécialisé.
 * Pilier -> Spécialisé is allowed but not recommended (distance = 2).
 */
export function isValidHierarchyLink(sourceType: ArticleLevel, targetType: ArticleLevel): boolean {
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

/**
 * Meilleure ancre pour lier `title` depuis `content` : le plus long groupe de
 * mots **contigus** du titre effectivement présent dans le contenu.
 *
 * Sans ça, `suggestLinks` renvoyait une ancre faite des mots du titre présents
 * mais **collés** (`matchingWords.join(' ')`) — une chaîne qui n'existe presque
 * jamais telle quelle dans le texte. Résultat : côté éditeur comme côté CLI,
 * `indexOf(anchor)` échouait et le lien ne se posait jamais. Cette fonction
 * garantit une ancre réellement présente, donc plaçable.
 */
const ANCHOR_STOPWORDS = new Set([
  'de', 'la', 'le', 'les', 'du', 'des', 'un', 'une', 'a', 'au', 'aux', 'et', 'ou',
  'en', 'pour', 'sur', 'dans', 'par', 'ce', 'ces', 'cet', 'cette', 'son', 'sa', 'ses',
  'votre', 'vos', 'notre', 'nos', 'leur', 'leurs', 'qui', 'que', 'quoi', 'dont', 'se',
  'ne', 'pas', 'plus', 'avec', 'sans', 'mais', 'donc', 'or', 'ni', 'car', 'the', 'of', 'to',
])

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
const stripAccents = (w: string): string => w.toLowerCase().normalize('NFD').replace(DIACRITICS, '')
const isSubstantive = (w: string): boolean => /[a-zà-ÿ0-9]/i.test(w) && !ANCHOR_STOPWORDS.has(stripAccents(w))

export function bestContiguousAnchor(title: string, content: string): string | null {
  const contentLower = content.toLowerCase()
  const words = title.split(/\s+/).filter((w) => w.length > 0)
  // n-grams du plus long (max 6 mots) au plus court, minimum 2 mots : une ancre
  // d'un seul mot est trop générique (« comment », « design ») et gonfle la
  // répétition d'ancres. Parcours gauche→droite à longueur égale.
  for (let len = Math.min(6, words.length); len >= 2; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const slice = words.slice(i, i + len)
      // Bords substantiels : une ancre ne doit ni commencer ni finir par un mot
      // vide (« de la », « pour le »…) — c'est ce qui produisait des ancres
      // inutiles. Elle reste plaçable puisque le n-gram existe dans le contenu.
      if (!isSubstantive(slice[0]!) || !isSubstantive(slice[len - 1]!)) continue
      const phrase = slice.join(' ')
      if (phrase.length < 5) continue
      if (contentLower.includes(phrase.toLowerCase())) return phrase
    }
  }
  return null
}

/** Suggest internal links for an article based on content analysis */
export async function suggestLinks(articleId: number, content: string): Promise<LinkSuggestion[]> {
  log.info(`Suggesting links for article ${articleId}`)
  const cocoons = await loadArticlesDb()
  const suggestions: LinkSuggestion[] = []

  // Find source article and its cocoon
  let sourceCocoonName: string | null = null
  let sourceType: ArticleLevel | null = null
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
          // L'ancre doit exister telle quelle dans le contenu, sinon le lien
          // est impossible à poser (côté éditeur comme CLI). Pas d'ancre
          // plaçable → on n'émet pas une suggestion morte.
          const anchor = bestContiguousAnchor(article.title, content)
          if (!anchor) continue
          suggestions.push({
            targetId: article.id,
            targetTitle: article.title,
            targetType: article.type,
            suggestedAnchor: anchor,
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
  const articleCocoon = new Map<number, { cocoonName: string; title: string; type: ArticleLevel }>()
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
  const pilierArticles = [...articleCocoon.entries()].filter(([, info]) => info.type === 'pilier')

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
