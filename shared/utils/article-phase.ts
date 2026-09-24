/**
 * Phase d'un article dans le pipeline (`articles.phase`).
 *
 * La liste « Articles publiés » du Moteur lit cette phase (FR-MOT-RECAP-PUBLISHED),
 * mais aucune route ne la faisait avancer : un article rédigé puis publié
 * restait en `proposed` (épopée qualité SEO, P2). Elle avance désormais avec
 * les événements réels, et ne recule jamais.
 */
import type { ArticlePhase } from '../types/article.types.js'

const ORDER: ArticlePhase[] = ['proposed', 'moteur', 'redaction', 'published']

export type ArticlePhaseEvent = 'content-saved' | 'published'

const TARGET: Record<ArticlePhaseEvent, ArticlePhase> = {
  'content-saved': 'redaction',
  'published': 'published',
}

export function nextArticlePhase(current: string | null | undefined, event: ArticlePhaseEvent): ArticlePhase {
  const from = ORDER.includes(current as ArticlePhase) ? (current as ArticlePhase) : 'proposed'
  const to = TARGET[event]
  return ORDER.indexOf(to) > ORDER.indexOf(from) ? to : from
}
