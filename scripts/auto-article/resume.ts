/**
 * Hydratation d'un run de reprise (`--resume <id>`) : charge l'état persisté de
 * l'article (métadonnées, mots-clés, checks, stratégie, contenu) dans le
 * contexte, et calcule le plan de reprise (phases à sauter).
 */

import type { HttpClient } from './http-client.js'
import type { AutoRunContext } from './types.js'
import { fromCanonicalType } from './canonical.js'
import { planResume } from './resume-plan.js'

interface ArticleResp {
  article: {
    title: string
    type: string
    painPoint?: string | null
    suggestedKeyword?: string | null
    captainKeywordLocked?: string | null
  }
  cocoonName: string
}

export async function hydrateResume(client: HttpClient, ctx: AutoRunContext): Promise<void> {
  const id = ctx.articleId
  if (id == null) return

  const art = await client.apiGet<ArticleResp>(`/articles/${id}`)
  ctx.articleTitle = art.article.title
  ctx.articleType = fromCanonicalType(art.article.type)
  if (art.cocoonName) ctx.cocoonName = art.cocoonName
  ctx.painPoint = art.article.painPoint ?? ''
  ctx.pilierKeyword = art.article.suggestedKeyword ?? art.article.captainKeywordLocked ?? ''

  const kw = await client
    .apiGet<{ capitaine: string; lieutenants: string[]; lexique: string[] } | null>(`/articles/${id}/keywords`)
    .catch(() => null)
  if (kw) {
    ctx.capitaine = kw.capitaine || null
    ctx.lieutenants = kw.lieutenants ?? []
    ctx.lexique = kw.lexique ?? []
  }

  const prog = await client
    .apiGet<{ completedChecks: string[] }>(`/articles/${id}/progress`)
    .catch(() => ({ completedChecks: [] as string[] }))
  const strat = await client
    .apiGet<{ completedSteps?: number } | null>(`/strategy/${id}`)
    .catch(() => null)
  const content = await client
    .apiGet<{ content?: string | null }>(`/articles/${id}/content`)
    .catch(() => ({ content: null }))

  const skips = planResume({
    checks: prog.completedChecks ?? [],
    capitaine: ctx.capitaine,
    hasContent: Boolean(content.content),
    hasStrategy: Boolean(strat && (strat.completedSteps ?? 0) > 0),
  })
  ctx.resume = { active: true, ...skips }
}
