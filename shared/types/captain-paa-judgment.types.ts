/**
 * Types partagés pour le jugement Haiku PAA × douleur en Capitaine.
 *
 * Produit par `server/services/keyword/captain-paa-judge.service.ts` via
 * appel Claude Haiku 4.5 (tool_use forcé `submit_paa_judgments`).
 * Consommé par :
 *   - `server/services/keyword/captain-relevance.service.ts` (signal 2 du score Pertinence)
 *   - `server/services/infra/data.service.ts` (orchestration dans getCaptainExplorations)
 *   - `src/components/intent/RadarKeywordCard.vue` (mode capitaine — badge + "PAA pts")
 *
 * Stocké en mémoire JS uniquement (store Pinia `article-keywords.store.ts`).
 * Jamais persisté en DB (FR-CAP-PAA-JUDGE-CACHE-SESSION).
 *
 * Voir tech-spec : _bmad-output/implementation-artifacts/tech-spec-captain-paa-pertinence-unify.md
 */

/** Verdict synthétique du LLM pour un PAA donné. */
export type PaaBadge = 'pertinent' | 'partiel' | 'hors-sujet'

/** Jugement d'un PAA individuel par le LLM. */
export interface PaaJudgment {
  /** Index 0-based du PAA dans la liste fournie à Haiku. */
  paaIndex: number
  /** Verdict de synthèse, dérivé de l'analyse interne sujet + douleur. */
  badge: PaaBadge
  /** Score 0-100 cohérent avec `badge` : ≥70 pour pertinent, 40-69 pour partiel, <40 pour hors-sujet. */
  paaScore: number
  /** Justification ≤ 60 chars (≤10 mots), affichée en tooltip du badge. */
  reasonShort: string
}

/** Bloc complet retourné par Haiku pour un keyword. */
export interface PaaJudgmentBlock {
  /** Jugements pour chaque PAA, dans le même ordre que les inputs. */
  paaJudgments: PaaJudgment[]
  /** Score agrégé 0-100. 100 = tous PAA pertinents. 0 = tous hors-sujet. */
  overallPaaScore: number
  /** Synthèse 1 phrase (≤ 140 chars) — tooltip global de la card. */
  summary: string
}

/** Raison d'indisponibilité spécifique au jugement Haiku, étend RelevanceUnavailableReason. */
export type PaaJudgmentUnavailableReason =
  | 'no-pain'           // painPoint absent ou < 10 chars
  | 'missing-paa'       // paaItems vide
  | 'haiku-unavailable' // appel Haiku échoué (timeout, rate limit, schéma malformé)
