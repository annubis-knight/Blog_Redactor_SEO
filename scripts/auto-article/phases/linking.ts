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
import { injectInternalLinks, type LinkTarget } from '../heuristics/inject-internal-links.js'

interface LinkSuggestion {
  targetId: number
  targetTitle: string
  suggestedAnchor: string
  reason: string
}

interface CocoonArticles {
  articles?: { id: number; slug?: string }[]
}

/** Table id → slug depuis le payload /cocoons (les suggestions ne portent pas le slug). */
async function loadSlugMap(deps: PhaseDeps): Promise<Map<number, string>> {
  const cocoons = await deps.client.apiGet<CocoonArticles[]>('/cocoons')
  const map = new Map<number, string>()
  for (const c of cocoons) {
    for (const a of c.articles ?? []) {
      if (a.slug) map.set(a.id, a.slug)
    }
  }
  return map
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

  const slugMap = await loadSlugMap(deps)
  const targets: LinkTarget[] = suggestions
    .map((s) => ({ targetId: s.targetId, slug: slugMap.get(s.targetId) ?? '', anchor: s.suggestedAnchor }))
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
