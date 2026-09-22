/**
 * Blocs de score partagés par les contrats d'affichage (Capitaine, Radar).
 *
 * L'écran lit `total` et `verdict` : ils sont contrôlés strictement ; le
 * détail (`components`, `breakdown`) est seulement vérifié dans sa forme.
 *
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-RAD-MARKET-SCORE, FR-CAP-RELEVANCE-SCORE
 */
import { z } from 'zod'
import type { MarketScoreResult, RelevanceScoreResult } from '../types/scoring.types.js'

export const SCORE_VERDICTS = ['GO', 'ORANGE', 'NOGO'] as const
export const ARTICLE_LEVELS = ['pilier', 'intermediaire', 'specifique'] as const
export const UNAVAILABLE_REASONS = ['no-pain', 'long-tail', 'missing-paa', 'missing-autocomplete'] as const

/** Score de marché (0-100). */
export const marketScoreSchema = z
  .looseObject({ total: z.number(), verdict: z.enum(SCORE_VERDICTS), components: z.array(z.unknown()) })
  .transform(value => value as unknown as MarketScoreResult)

/** Score de pertinence (0-100). */
export const relevanceScoreSchema = z
  .looseObject({
    total: z.number(),
    verdict: z.enum(SCORE_VERDICTS),
    breakdown: z.looseObject({}),
    rootsContext: z.looseObject({}),
  })
  .transform(value => value as unknown as RelevanceScoreResult)
