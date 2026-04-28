/**
 * Helper de lecture du `painPoint` d'un article par son `articleId`.
 *
 * Utilisé par les routes du Moteur (capitaine ai-panel, propose-lieutenants,
 * hn-structure, lexique-ai, lexique-upfront) pour injecter le painPoint dans
 * leurs prompts respectifs.
 *
 * Sprint S1 (cf. tech-spec score-kpi-pertinence-separation et
 * docs/pain-point-editorial-backbone.md).
 */
import { query } from '../../db/client.js'
import { log } from '../../utils/logger.js'

/** Sentinelle utilisée dans les prompts quand l'article n'a pas de painPoint. */
export const PAIN_POINT_FALLBACK = '(non défini)'

/**
 * Récupère le painPoint d'un article par son `articleId`.
 *
 * Retourne :
 *  - la chaîne painPoint si elle existe et n'est pas vide
 *  - `PAIN_POINT_FALLBACK` (= "(non défini)") sinon (article absent, painPoint
 *    null ou string vide)
 *
 * Ne throw jamais : toute erreur DB est loggée et retourne le fallback. C'est
 * une lecture best-effort qui ne doit pas casser le flux de prompts.
 */
export async function getArticlePainPoint(articleId: number | null | undefined): Promise<string> {
  if (!articleId || !Number.isFinite(articleId)) return PAIN_POINT_FALLBACK
  try {
    const res = await query<{ pain_point: string | null }>(
      `SELECT pain_point FROM articles WHERE id = $1`,
      [articleId],
    )
    const raw = res.rows[0]?.pain_point
    if (!raw || typeof raw !== 'string' || raw.trim() === '') return PAIN_POINT_FALLBACK
    return raw.trim()
  } catch (err) {
    log.warn(`[painPoint lookup] échec lecture articleId=${articleId} — ${(err as Error).message}`)
    return PAIN_POINT_FALLBACK
  }
}
