/**
 * AUTHORITY: PostgreSQL `articles.pain_intent_expected` TEXT (CHECK contraint
 *            sur 'commercial' | 'transactional' | 'informational' | 'navigational').
 * READS FROM: SELECT pain_intent_expected FROM articles WHERE id = $1.
 * WRITES TO: rien (read-only par contrat).
 * CONSUMERS: captain-relevance.service → computeRelevanceForCaptainTab
 *            (5e signal Pertinence — Intent SERP × Intent éditorial attendu).
 * RELATED FR: FR-CAP-RELEVANCE-INTENT-SIGNAL.
 *
 * Helper miroir de `getArticlePainPoint` mais pour le champ `pain_intent_expected`.
 * Retourne `null` (pas de fallback string) :
 *   - article inexistant
 *   - colonne NULL en DB
 *   - articleId invalide
 *   - erreur DB (best-effort, pas de throw)
 *   - valeur DB hors des 4 valeurs autorisées (CHECK contournée)
 *
 * Lorsque le retour est `null`, le scoring neutralise le 5e signal à 50/100
 * (cf. `computeIntentPainAlignment` dans `shared/scoring.ts`).
 */
import { query } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import {
  PAIN_INTENT_EXPECTED_VALUES,
  type PainIntentExpected,
} from '../../../shared/types/scoring.types.js'

const ALLOWED = new Set<string>(PAIN_INTENT_EXPECTED_VALUES)

export async function getArticlePainIntent(
  articleId: number | null | undefined,
): Promise<PainIntentExpected | null> {
  if (!articleId || !Number.isFinite(articleId)) {
    log.debug('[painIntent] articleId invalide → null', { articleId })
    return null
  }
  log.debug('[painIntent] lecture DB', { articleId })
  try {
    const t = Date.now()
    const res = await query<{ pain_intent_expected: string | null }>(
      `SELECT pain_intent_expected FROM articles WHERE id = $1`,
      [articleId],
    )
    const raw = res.rows[0]?.pain_intent_expected
    const ms = Date.now() - t
    if (!raw) {
      log.debug('[painIntent] absent → null', { articleId, ms })
      return null
    }
    if (!ALLOWED.has(raw)) {
      log.warn('[painIntent] valeur DB hors enum → null', { articleId, raw, ms })
      return null
    }
    log.debug('[painIntent] trouvé', { articleId, value: raw, ms })
    return raw as PainIntentExpected
  } catch (err) {
    log.warn(`[painIntent lookup] échec lecture articleId=${articleId} — ${(err as Error).message}`)
    return null
  }
}
