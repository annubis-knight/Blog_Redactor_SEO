/**
 * AUTHORITY: Jugement Haiku PAA × douleur pour un keyword sur un article.
 *            Calculé à la volée à chaque mount Capitaine, jamais persisté.
 * READS FROM: paa_explorations (PAA scannés via getCaptainExplorations),
 *             articles.pain_point, articles.pain_intent_expected, articles.title
 * WRITES TO: rien (read-only, retour HTTP uniquement)
 * CONSUMERS: server/services/keyword/captain-relevance.service.ts (signal 2),
 *            server/services/infra/data.service.ts (orchestration parallèle),
 *            src/components/intent/RadarKeywordCard.vue (badge + "PAA pts" mode capitaine)
 * RELATED FR: FR-CAP-PAA-JUDGE-HAIKU, FR-CAP-PAA-BADGE-SINGLE,
 *             FR-CAP-PAA-JUDGE-CACHE-SESSION, FR-CAP-RELEVANCE-UNAVAILABLE-REASON
 *
 * Voir tech-spec : _bmad-output/implementation-artifacts/tech-spec-captain-paa-pertinence-unify.md
 */

import type Anthropic from '@anthropic-ai/sdk'
import { classifyWithTool } from '../external/ai-provider.service.js'
import { loadPrompt } from '../../utils/prompt-loader.js'
import { log } from '../../utils/logger.js'
import type { PaaJudgmentBlock } from '../../../shared/types/captain-paa-judgment.types.js'
import type { PainIntentExpected } from '../../../shared/types/scoring.types.js'

/** Longueur minimale du painPoint pour qu'un jugement Haiku soit tenté. */
export const PAIN_POINT_MIN_LENGTH = 10

/** Modèle par défaut. Override possible via env CLAUDE_HAIKU_MODEL pour tests. */
const DEFAULT_HAIKU_MODEL = 'claude-haiku-4-5-20251001'

/**
 * Erreur levée si l'appel Haiku échoue (network, rate limit, schéma malformé).
 * Capturée en amont par le caller pour produire `unavailableReason: 'haiku-unavailable'`.
 */
export class HaikuJudgmentError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'HaikuJudgmentError'
  }
}

/**
 * Tool definition Anthropic — schéma strict du jugement PAA.
 * `tool_choice` est forcé sur ce tool pour garantir le format de sortie.
 */
export const PAA_JUDGE_TOOL: {
  name: string
  description: string
  input_schema: Anthropic.Tool['input_schema']
} = {
  name: 'submit_paa_judgments',
  description:
    'Soumet le jugement de pertinence pour chaque PAA d\'un keyword vis-à-vis du sujet et du point de douleur de l\'article. Un seul badge synthétique par PAA, dérivé de l\'analyse combinée sujet + douleur.',
  input_schema: {
    type: 'object',
    required: ['paaJudgments', 'overallPaaScore', 'summary'],
    properties: {
      paaJudgments: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['paaIndex', 'badge', 'paaScore', 'reasonShort'],
          properties: {
            paaIndex: {
              type: 'integer',
              minimum: 0,
              description: 'Index 0-based de la PAA dans la liste fournie.',
            },
            badge: {
              type: 'string',
              enum: ['pertinent', 'partiel', 'hors-sujet'],
              description:
                'Verdict de synthèse. `pertinent` = aligné sujet ET utile pour la douleur. `partiel` = un seul axe aligné ou alignement modéré. `hors-sujet` = ne sert pas l\'article.',
            },
            paaScore: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description:
                'Score 0-100 cohérent avec le badge. ≥70 = pertinent, 40-69 = partiel, <40 = hors-sujet.',
            },
            reasonShort: {
              type: 'string',
              maxLength: 60,
              description: 'Justification courte (≤ 10 mots, en français). Affichée en tooltip.',
            },
          },
        },
      },
      overallPaaScore: {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        description:
          'Score agrégé 0-100. 100 = tous PAA pertinents. 0 = tous hors-sujet.',
      },
      summary: {
        type: 'string',
        maxLength: 140,
        description: 'Synthèse 1 phrase de l\'apport éditorial des PAA pour cet article.',
      },
    },
  },
}

/**
 * Formate les PAA en lignes "index | question | answer" pour injection dans le prompt.
 * L'index 0-based correspond au `paaIndex` retourné par Haiku.
 */
function formatPaaList(paaItems: Array<{ question: string; answer: string }>): string {
  return paaItems
    .map((p, i) => {
      const q = (p.question ?? '').trim()
      const a = (p.answer ?? '').trim()
      return `${i} | ${q}${a ? ` | ${a}` : ''}`
    })
    .join('\n')
}

const SYSTEM_PROMPT =
  'Tu es un analyste SEO expert. Tu réponds exclusivement via l\'outil submit_paa_judgments. Aucun texte hors appel d\'outil.'

/**
 * Demande à Claude Haiku 4.5 d'évaluer la pertinence des PAA d'un keyword.
 *
 * Retourne `null` (sans appel API) si :
 *   - `painPoint` est vide ou < {@link PAIN_POINT_MIN_LENGTH} caractères.
 *   - `paaItems` est vide.
 *
 * Throw `HaikuJudgmentError` si l'appel à `classifyWithTool` échoue.
 * Le caller doit catcher pour produire `unavailableReason: 'haiku-unavailable'`.
 */
export async function judgePaaForKeyword(input: {
  articleId: number
  keyword: string
  paaItems: Array<{ question: string; answer: string }>
  painPoint: string
  articleTitle: string
  painIntentExpected: PainIntentExpected | null
}): Promise<PaaJudgmentBlock | null> {
  if (!input.painPoint || input.painPoint.length < PAIN_POINT_MIN_LENGTH) {
    log.info('[captain-paa-judge] skip — no-pain', {
      articleId: input.articleId,
      keyword: input.keyword,
      painPointLength: input.painPoint?.length ?? 0,
    })
    return null
  }
  if (input.paaItems.length === 0) {
    log.info('[captain-paa-judge] skip — missing-paa', {
      articleId: input.articleId,
      keyword: input.keyword,
    })
    return null
  }

  const userPrompt = await loadPrompt(
    'captain-paa-judge',
    {
      article_title: input.articleTitle,
      pain_point: input.painPoint,
      pain_intent_expected: input.painIntentExpected ?? 'non précisé',
      keyword: input.keyword,
      paa_list_formatted: formatPaaList(input.paaItems),
    },
    { escapeKeys: ['article_title', 'pain_point', 'keyword', 'paa_list_formatted'] },
  )

  const tStart = Date.now()
  try {
    const { result, usage } = await classifyWithTool<PaaJudgmentBlock>(
      SYSTEM_PROMPT,
      userPrompt,
      PAA_JUDGE_TOOL,
      { model: DEFAULT_HAIKU_MODEL },
    )

    const badgeDistribution = {
      pertinent: result.paaJudgments.filter(j => j.badge === 'pertinent').length,
      partiel: result.paaJudgments.filter(j => j.badge === 'partiel').length,
      horsSujet: result.paaJudgments.filter(j => j.badge === 'hors-sujet').length,
    }
    log.info('[captain-paa-judge] OK', {
      articleId: input.articleId,
      keyword: input.keyword,
      paaCount: input.paaItems.length,
      overallPaaScore: result.overallPaaScore,
      badgeDistribution,
      latencyMs: Date.now() - tStart,
      tokensIn: usage.inputTokens,
      tokensOut: usage.outputTokens,
      cost: `$${usage.estimatedCost.toFixed(4)}`,
    })
    return result
  } catch (err) {
    log.error('[captain-paa-judge] Haiku call failed', {
      articleId: input.articleId,
      keyword: input.keyword,
      latencyMs: Date.now() - tStart,
      error: (err as Error).message,
    })
    throw new HaikuJudgmentError(`Haiku PAA judgment failed: ${(err as Error).message}`, err)
  }
}

/** Helper exporté pour tests unitaires uniquement. */
export const __test__ = { formatPaaList, SYSTEM_PROMPT, DEFAULT_HAIKU_MODEL }
