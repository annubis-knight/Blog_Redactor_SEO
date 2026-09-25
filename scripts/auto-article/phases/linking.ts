/**
 * Maillage interne — parité avec le flux manuel.
 *
 * Un article auto n'écrivait rien dans `internal_links` : il apparaissait donc
 * comme orphelin dans la matrice de maillage, et son corps ne contenait aucun
 * lien vers les articles frères. Cette étape comble le trou, en réutilisant
 * **le même service déterministe** que le manuel (`POST /api/links/suggest`,
 * zéro appel IA) :
 *
 *   1. suggestions de liens (titres d'articles présents dans le contenu) ;
 *   2. injection des `<a>` à la première occurrence exploitable de l'ancre ;
 *   3. sauvegarde du contenu enrichi + des lignes matrice (`PUT /api/links`).
 *
 * Utilisable en fin de Rédaction (articles futurs) et en rétroactif (`--relink`).
 */

import type { PhaseDeps } from '../deps.js'
import { injectInternalLinks, removeLinksTo, type LinkTarget } from '../heuristics/inject-internal-links.js'

interface LinkSuggestion {
  targetId: number
  targetTitle: string
  suggestedAnchor: string
  reason: string
}

interface CocoonArticles {
  articles?: { id: number; slug?: string; status?: string }[]
}

interface ArticleIndex {
  /** id → slug (les suggestions ne portent pas le slug). */
  slugById: Map<number, string>
  /** Articles pas encore publiés : un lien vers eux mène à une page 404. */
  unpublishedIds: Set<number>
  unpublishedSlugs: Set<string>
}

/** Index des articles depuis le payload /cocoons : adresse et publication. */
async function loadArticleIndex(deps: PhaseDeps): Promise<ArticleIndex> {
  const cocoons = await deps.client.apiGet<CocoonArticles[]>('/cocoons')
  const index: ArticleIndex = { slugById: new Map(), unpublishedIds: new Set(), unpublishedSlugs: new Set() }
  for (const c of cocoons) {
    for (const a of c.articles ?? []) {
      if (a.slug) index.slugById.set(a.id, a.slug)
      if (a.status !== 'publié') {
        index.unpublishedIds.add(a.id)
        if (a.slug) index.unpublishedSlugs.add(a.slug)
      }
    }
  }
  return index
}

export async function runInternalLinking(deps: PhaseDeps, articleId: number): Promise<number> {
  const { client, logger, report } = deps

  const content = await client.apiGet<{ content?: string | null }>(`/articles/${articleId}/content`)
  const html = content.content ?? ''
  if (!html.trim()) {
    logger.dim('maillage : pas de contenu — ignoré')
    return 0
  }

  logger.step('Maillage interne — liens vers les articles frères…')
  const suggestions = await client
    .apiPost<LinkSuggestion[]>('/links/suggest', { articleId, content: html })
    .catch(() => [])

  if (suggestions.length === 0) {
    logger.dim('maillage : aucune cible pertinente (attendu pour un pilier isolé)')
    return 0
  }

  const index = await loadArticleIndex(deps)
  // Seulement vers un article publié : le lien d'un article exporté vers une
  // page pas encore en ligne mène à une 404 (recette C8).
  const skipped = suggestions.filter((s) => index.unpublishedIds.has(s.targetId))
  if (skipped.length > 0) logger.dim(`maillage : ${skipped.length} cible(s) pas encore publiée(s), lien reporté`)
  const targets: LinkTarget[] = suggestions
    .filter((s) => !index.unpublishedIds.has(s.targetId))
    .map((s) => ({ targetId: s.targetId, slug: index.slugById.get(s.targetId) ?? '', anchor: s.suggestedAnchor }))
    .filter((t) => t.slug)

  const { html: linkedHtml, applied } = injectInternalLinks(html, targets)
  if (applied.length === 0) {
    logger.dim('maillage : aucune ancre exploitable dans le contenu')
    return 0
  }

  // Contenu enrichi + matrice, comme le manuel (les deux, seulement si posé).
  await client.apiPut(`/articles/${articleId}`, { content: linkedHtml })
  await client.apiPut('/links', {
    links: applied.map((a) => ({
      sourceId: articleId,
      targetId: a.targetId,
      anchorText: a.anchorText,
      position: a.position,
    })),
  })

  report.addStep(`Maillage interne (${applied.length} lien${applied.length > 1 ? 's' : ''})`)
  logger.success(`Maillage : ${applied.length} lien(s) interne(s) posé(s).`)
  return applied.length
}

/**
 * Retire du texte les liens vers un article pas encore publié, en gardant leur
 * texte ; l'enregistrement du contenu les fait aussi sortir de la matrice.
 * Recette C8 : le pilier exporté pointait vers un pilier d'un autre cocon,
 * pas encore en ligne.
 */
export async function unlinkUnpublished(deps: PhaseDeps, articleId: number): Promise<number> {
  const { client, logger, report } = deps
  const content = await client.apiGet<{ content?: string | null }>(`/articles/${articleId}/content`)
  const html = content.content ?? ''
  const index = await loadArticleIndex(deps)
  index.unpublishedIds.delete(articleId)
  const cleaned = removeLinksTo(html, index.unpublishedIds, index.unpublishedSlugs)
  if (cleaned === html) return 0
  const removed = (html.match(/<a\b/gi) ?? []).length - (cleaned.match(/<a\b/gi) ?? []).length
  await client.apiPut(`/articles/${articleId}`, { content: cleaned })
  logger.warn(`Maillage : ${removed} lien(s) vers un article pas encore publié retiré(s)`)
  report.addStep(`Maillage · ${removed} lien(s) vers un article non publié retiré(s)`)
  return removed
}
