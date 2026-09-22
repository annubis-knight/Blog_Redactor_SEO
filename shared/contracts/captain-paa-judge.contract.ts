/**
 * Contrat d'affichage — « Jugement Haiku des questions PAA » (Capitaine).
 *
 * Sortie d'IA (tool use forcé `submit_paa_judgments`) : elle est contrôlée
 * dès sa réception dans le service, puis à nouveau aux frontières serveur et
 * client de POST /articles/:id/captain/judge-paa.
 *
 * AUTHORITY: aucune persistance (mémoire du store, FR-CAP-PAA-JUDGE-CACHE-SESSION)
 * READS FROM: classifyWithTool (Claude Haiku), POST /articles/:id/captain/judge-paa
 * CONSUMERS: captain-paa-judge.service (signal 2 Pertinence), article-keywords.store,
 *            RadarKeywordCard (badge + « PAA pts » en mode capitaine)
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-CAP-PAA-JUDGE-HAIKU
 */
import { z } from 'zod'
import { defineContract, text, tolerantArray, tolerantRecord } from './core.js'
import type { PaaJudgment, PaaJudgmentBlock } from '../types/captain-paa-judgment.types.js'
import type { RelevanceScoreLiveResult } from '../types/scoring.types.js'

const BADGES = ['pertinent', 'partiel', 'hors-sujet'] as const
const SCORE_VERDICTS = ['GO', 'ORANGE', 'NOGO'] as const
const UNAVAILABLE_REASONS = ['no-pain', 'long-tail', 'missing-paa', 'missing-autocomplete'] as const

/** Un score 0-100 : un débordement de l'IA est ramené dans les bornes. */
const boundedScore = z.number().transform(value => Math.max(0, Math.min(100, value)))

const paaJudgmentSchema: z.ZodType<PaaJudgment, unknown> = z.looseObject({
  paaIndex: z.number().int().nonnegative(),
  badge: z.enum(BADGES),
  paaScore: boundedScore,
  reasonShort: text('paaJudgments.reasonShort', ''),
})

export const paaJudgmentBlockSchema: z.ZodType<PaaJudgmentBlock, unknown> = z.looseObject({
  paaJudgments: tolerantArray(paaJudgmentSchema, 'paaJudgments'),
  overallPaaScore: boundedScore,
  summary: text('summary', ''),
})

/** Sortie brute de Haiku pour un mot-clé. */
export const paaJudgmentBlockContract = defineContract<PaaJudgmentBlock>('paa-judgment', paaJudgmentBlockSchema)

/** Score de pertinence recalculé : `total` absent ⇒ `unavailableReason` renseigné. */
const relevanceLiveSchema = z
  .looseObject({
    total: z.number().nullable(),
    verdict: z.enum(SCORE_VERDICTS).nullable(),
    breakdown: z.looseObject({}).nullable(),
    rootsContext: z.looseObject({}).nullable(),
    unavailableReason: z.enum(UNAVAILABLE_REASONS).nullable(),
  })
  .transform(value => value as unknown as RelevanceScoreLiveResult)

export interface CaptainPaaJudgeResponse {
  judgments: Record<string, PaaJudgmentBlock>
  relevanceScores: Record<string, RelevanceScoreLiveResult>
}

/** Réponse de POST /articles/:id/captain/judge-paa. */
export const captainPaaJudgeContract = defineContract<CaptainPaaJudgeResponse>(
  'captain-paa-judge',
  z.looseObject({
    judgments: tolerantRecord(paaJudgmentBlockSchema, 'judgments'),
    relevanceScores: tolerantRecord(relevanceLiveSchema, 'relevanceScores'),
  }),
)
