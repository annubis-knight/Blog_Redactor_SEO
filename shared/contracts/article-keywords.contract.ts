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
 *             FR-INFRA-KPI-NULLABLE
 */
import { z } from 'zod'
import { defineContract, nullableText, oneOf, text, tolerantArray, optionalObject } from './core.js'
import { captainScanEntrySchema, kpiSummarySchema } from './captain-scan.contract.js'
import type { ArticleKeywords, RichCaptain, RichLieutenant, RichRootKeyword } from '../types/keyword.types.js'
import type { ProposeLieutenantsHnNode } from '../types/serp-analysis.types.js'

const ARTICLE_LEVELS = ['pilier', 'intermediaire', 'specifique'] as const

const richRootKeywordSchema: z.ZodType<RichRootKeyword, unknown> = z.looseObject({
  keyword: z.string().min(1),
  parentKeyword: z.string().min(1),
  kpis: tolerantArray(kpiSummarySchema, 'richRootKeywords.kpis'),
  articleLevel: z.enum(ARTICLE_LEVELS),
  timestamp: text('richRootKeywords.timestamp', ''),
})

const richCaptainSchema: z.ZodType<RichCaptain, unknown> = z.looseObject({
  keyword: text('richCaptain.keyword', ''),
  status: oneOf(['suggested', 'locked'] as const, 'suggested', 'richCaptain.status'),
  exploredKeywords: tolerantArray(captainScanEntrySchema, 'richCaptain.exploredKeywords'),
  aiPanelMarkdown: nullableText('richCaptain.aiPanelMarkdown'),
})

/** Lot 4 (Lieutenants) : durci plus tard ; ici, seule la forme « liste » est garantie. */
const richLieutenantsSchema = z.custom<RichLieutenant[]>(value => Array.isArray(value))
/** Lot 4 (plan Hn) : idem. */
const hnStructureSchema = z.custom<ProposeLieutenantsHnNode[]>(value => Array.isArray(value))

export const articleKeywordsSchema: z.ZodType<ArticleKeywords, unknown> = z.looseObject({
  articleId: z.number(),
  capitaine: text('capitaine', ''),
  lieutenants: tolerantArray(z.string(), 'lieutenants'),
  lexique: tolerantArray(z.string(), 'lexique'),
  rootKeywords: tolerantArray(z.string(), 'rootKeywords').optional(),
  hnStructure: hnStructureSchema.optional(),
  richCaptain: optionalObject(richCaptainSchema, 'richCaptain').transform(value => value ?? undefined),
  richRootKeywords: tolerantArray(richRootKeywordSchema, 'richRootKeywords').optional(),
  richLieutenants: richLieutenantsSchema.optional(),
})

/** Réponse de GET /articles/:id/keywords : `null` quand l'article n'a encore rien. */
export const articleKeywordsContract = defineContract<ArticleKeywords | null>(
  'article-keywords',
  articleKeywordsSchema.nullable(),
)
