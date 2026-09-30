/**
 * Contrat d'affichage — « Mots-clés d'un article » (GET/PUT /articles/:id/keywords).
 *
 * Porte les décisions (Capitaine, Lieutenants, Lexique, plan Hn) et les
 * explorations relues en base qui réalimentent les onglets Capitaine,
 * Lieutenants, Lexique et Finalisation au rechargement.
 *
 * AUTHORITY: PostgreSQL `article_keywords`, `captain_explorations`,
 *            `lieutenant_explorations`
 * READS FROM: GET /articles/:id/keywords, PUT /articles/:id/keywords
 * CONSUMERS: article-keywords.store (CaptainPanel, LieutenantsPanel,
 *            LexiquePanel, FinalisationPanel)
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-MOT-EXPLORATIONS-HYDRATATION,
 *             FR-INFRA-KPI-NULLABLE, FR-CAP-ROOTS
 */
import { z } from 'zod'
import { defineContract, nullableText, oneOf, text, tolerantArray, optionalObject, withFallback } from './core.js'
import { captainScanEntrySchema, kpiSummarySchema, paaQuestionScanSchema } from './captain-scan.contract.js'
import { UNAVAILABLE_REASONS, relevanceScoreSchema } from './score-blocks.js'
import { proposeHnNodeSchema, richLieutenantSchema } from './lieutenants.contract.js'
import type { ArticleKeywords, RichCaptain, RichRootKeyword } from '../types/keyword.types.js'

const ARTICLE_LEVELS = ['pilier', 'intermediaire', 'specifique'] as const

/** Une racine relue : ses mesures connues, sans étude à elle pour l'article (FR-CAP-ROOTS). */
const richRootKeywordSchema: z.ZodType<RichRootKeyword, unknown> = z.looseObject({
  keyword: z.string().min(1),
  parentKeyword: z.string().min(1),
  kpis: tolerantArray(kpiSummarySchema, 'richRootKeywords.kpis'),
  articleLevel: z.enum(ARTICLE_LEVELS),
  timestamp: text('richRootKeywords.timestamp', ''),
  paaQuestions: tolerantArray(paaQuestionScanSchema, 'richRootKeywords.paaQuestions').optional(),
  relevanceScore: optionalObject(relevanceScoreSchema, 'richRootKeywords.relevanceScore'),
  relevanceUnavailableReason: withFallback(
    z.enum(UNAVAILABLE_REASONS).nullable().optional(),
    null,
    'richRootKeywords.relevanceUnavailableReason',
  ),
})

const richCaptainSchema: z.ZodType<RichCaptain, unknown> = z.looseObject({
  keyword: text('richCaptain.keyword', ''),
  status: oneOf(['suggested', 'locked'] as const, 'suggested', 'richCaptain.status'),
  exploredKeywords: tolerantArray(captainScanEntrySchema, 'richCaptain.exploredKeywords'),
  aiPanelMarkdown: nullableText('richCaptain.aiPanelMarkdown'),
})

const articleKeywordsSchema: z.ZodType<ArticleKeywords, unknown> = z.looseObject({
  articleId: z.number(),
  capitaine: text('capitaine', ''),
  lieutenants: tolerantArray(z.string(), 'lieutenants'),
  lexique: tolerantArray(z.string(), 'lexique'),
  rootKeywords: tolerantArray(z.string(), 'rootKeywords').optional(),
  hnStructure: tolerantArray(proposeHnNodeSchema, 'hnStructure').optional(),
  richCaptain: optionalObject(richCaptainSchema, 'richCaptain').transform(value => value ?? undefined),
  richRootKeywords: tolerantArray(richRootKeywordSchema, 'richRootKeywords').optional(),
  richLieutenants: tolerantArray(richLieutenantSchema, 'richLieutenants').optional(),
})

/** Réponse de GET /articles/:id/keywords : `null` quand l'article n'a encore rien. */
export const articleKeywordsContract = defineContract<ArticleKeywords | null>(
  'article-keywords',
  articleKeywordsSchema.nullable(),
)
