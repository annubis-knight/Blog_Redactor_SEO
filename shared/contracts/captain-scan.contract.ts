/**
 * Contrat d'affichage — famille « Scan du Capitaine » (lot 1, pilote).
 *
 * Forme attendue par CaptainRadarList, CaptainSidePanel, CaptainVerdictPanel,
 * VerdictBar et CaptainRootsSidebar, après :
 *   - la réponse de POST /keywords/:kw/scan (frontières serveur et client) ;
 *   - la relecture de l'historique en base (frontière relecture).
 *
 * AUTHORITY: PostgreSQL `keyword_metrics` (KPI bruts), `captain_explorations`,
 *            `paa_explorations`
 * READS FROM: POST /keywords/:kw/scan, GET /articles/:id/keywords (richCaptain)
 * CONSUMERS: useExploredKeywords (hydrateCardFromValidation, restoreFromHistory),
 *            CaptainPanel, captain-trigger.store, robot (moteur-valider)
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-INFRA-KPI-NULLABLE,
 *             FR-INFRA-KPI-SCORING-NULLSAFE, FR-CAP-SCAN
 */
import { z } from 'zod'
import {
  defineContract,
  kpiValue,
  count,
  text,
  nullableText,
  oneOf,
  withFallback,
  tolerantArray,
  optionalObject,
  signal,
} from './core.js'
import type { KpiResult, PaaQuestionScan, ScanResponse, ScanVerdict } from '../types/keyword-validate.types.js'
import type { CaptainScanEntry, KpiSummary } from '../types/keyword.types.js'
import { ARTICLE_LEVELS, UNAVAILABLE_REASONS, marketScoreSchema, relevanceScoreSchema } from './score-blocks.js'
import type { PaaJudgmentBlock } from '../types/captain-paa-judgment.types.js'

const KPI_COLORS = ['green', 'orange', 'red', 'neutral', 'bonus'] as const
const VERDICT_LEVELS = ['GO', 'ORANGE', 'NO-GO', 'GRAY'] as const
const PAA_MATCHES = ['none', 'partial', 'total'] as const
const MATCH_QUALITIES = ['exact', 'stem'] as const

// ---------------------------------------------------------------------------
// Blocs réutilisables
// ---------------------------------------------------------------------------

/**
 * Un KPI noté : `rawValue` absent reste `null` (« — »), jamais 0.
 * Cohérence affichage : un KPI absent s'affiche toujours « — » en neutre,
 * quel que soit le libellé reçu (ex. « NaN rech/m »).
 */
export const kpiResultSchema: z.ZodType<KpiResult, unknown> = z
  .looseObject({
    name: z.string().min(1),
    rawValue: kpiValue('kpis.rawValue'),
    color: oneOf(KPI_COLORS, 'neutral', 'kpis.color'),
    label: text('kpis.label', '—'),
    thresholds: withFallback(
      z.looseObject({ green: z.number(), orange: z.number().optional(), red: z.number().optional() }),
      { green: 0 },
      'kpis.thresholds',
    ),
  })
  .transform(kpi => {
    if (kpi.rawValue !== null || (kpi.label === '—' && kpi.color === 'neutral')) return kpi
    signal('coerced', `kpis.${kpi.name}`, `absent affiché « ${kpi.label} » → « — »`)
    return { ...kpi, label: '—', color: 'neutral' as const }
  })

/** Un KPI tel que gardé en base : seulement son nom et sa valeur brute. */
export const kpiSummarySchema: z.ZodType<KpiSummary, unknown> = z.looseObject({
  name: z.string().min(1),
  rawValue: kpiValue('kpis.rawValue'),
})

/** Un verdict inconnu ou illisible devient GRAY (neutre), jamais NO-GO. */
export const scanVerdictSchema: z.ZodType<ScanVerdict, unknown> = z.looseObject({
  level: oneOf(VERDICT_LEVELS, 'GRAY', 'verdict.level'),
  greenCount: count('verdict.greenCount'),
  totalKpis: count('verdict.totalKpis'),
  reason: withFallback(z.string().optional(), undefined, 'verdict.reason'),
  autoNoGo: withFallback(z.boolean(), false, 'verdict.autoNoGo'),
})

export const paaQuestionScanSchema: z.ZodType<PaaQuestionScan, unknown> = z.looseObject({
  question: z.string().min(1),
  answer: nullableText('paaQuestions.answer'),
  match: withFallback(z.enum(PAA_MATCHES).optional(), undefined, 'paaQuestions.match'),
  matchQuality: withFallback(z.enum(MATCH_QUALITIES).optional(), undefined, 'paaQuestions.matchQuality'),
})

/** Le jugement des questions PAA n'est pas affiché tel quel : transmis sans contrôle. */
const paaJudgmentSchema = z.custom<PaaJudgmentBlock | null>(() => true)

// ---------------------------------------------------------------------------
// Contrats
// ---------------------------------------------------------------------------

/** Réponse de POST /keywords/:kw/scan. */
export const captainScanContract = defineContract<ScanResponse>(
  'captain-scan',
  z.looseObject({
    keyword: z.string().min(1),
    articleLevel: z.enum(ARTICLE_LEVELS),
    kpis: tolerantArray(kpiResultSchema, 'kpis'),
    verdict: scanVerdictSchema,
    fromCache: withFallback(z.boolean(), false, 'fromCache'),
    cachedAt: nullableText('cachedAt'),
    paaQuestions: tolerantArray(paaQuestionScanSchema, 'paaQuestions').optional(),
    marketScore: optionalObject(marketScoreSchema, 'marketScore').transform(value => value ?? undefined),
    relevanceScore: optionalObject(relevanceScoreSchema, 'relevanceScore'),
  }),
)

/** Une entrée de l'historique du Capitaine, relue en base. */
export const captainScanEntrySchema: z.ZodType<CaptainScanEntry, unknown> = z.looseObject({
  keyword: z.string().min(1),
  kpis: tolerantArray(kpiSummarySchema, 'kpis'),
  articleLevel: z.enum(ARTICLE_LEVELS),
  rootKeywords: tolerantArray(z.string(), 'rootKeywords'),
  paaQuestions: tolerantArray(paaQuestionScanSchema, 'paaQuestions').optional(),
  aiPanelMarkdown: nullableText('aiPanelMarkdown').optional(),
  exploredAt: nullableText('exploredAt').optional(),
  marketScore: optionalObject(marketScoreSchema, 'marketScore'),
  relevanceScore: optionalObject(relevanceScoreSchema, 'relevanceScore'),
  relevanceUnavailableReason: withFallback(
    z.enum(UNAVAILABLE_REASONS).nullable().optional(),
    null,
    'relevanceUnavailableReason',
  ),
  paaJudgment: paaJudgmentSchema.optional(),
})

export const captainScanEntryContract = defineContract<CaptainScanEntry>('captain-history', captainScanEntrySchema)
