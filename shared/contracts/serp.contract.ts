/**
 * Contrats d'affichage — « Analyse SERP » (Lieutenants) et « TF-IDF » (Lexique), lot 3.
 *
 * Forme attendue par LieutenantSerpAnalysis, LieutenantH2Structure (récurrence
 * des titres) et LexiqueTermsList, après :
 *   - POST /serp/analyze (scraping frais ou reconstruction depuis la base) ;
 *   - POST /serp/tfidf (calcul local sur les pages déjà lues).
 *
 * AUTHORITY: PostgreSQL `keyword_serp_results`, `keyword_serp_scrapes`,
 *            `keyword_paa_questions`, `lexique_explorations`
 * READS FROM: POST /serp/analyze, POST /serp/tfidf
 * CONSUMERS: useLieutenantsSerp, useLieutenantsIa, LieutenantSerpAnalysis, LexiquePanel
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-LIE-SERP-ANALYZE, FR-LEX-TFIDF, NFR-INT-SERP-ONCE
 */
import { z } from 'zod'
import { count, defineContract, nullableText, text, tolerantArray, withFallback } from './core.js'
import { ARTICLE_LEVELS } from './score-blocks.js'
import type { HnNode, SerpAnalysisResult, SerpCompetitor, SerpExistsResponse, TfidfResult, TfidfTerm } from '../types/serp-analysis.types.js'
import type { PaaQuestion } from '../types/dataforseo.types.js'

/**
 * Une page concurrente que le scraping n'a pas pu lire est enregistrée sans
 * titre ni texte, sans son message d'erreur. Le contrat la marque « non lue »,
 * au premier chargement comme au rechargement : l'écran affiche alors son
 * badge « ! », et la récurrence des titres ne la compte plus.
 */
export const UNREAD_PAGE_MESSAGE = 'Page concurrente non lue (contenu vide ou inaccessible)'

const hnNodeSchema: z.ZodType<HnNode, unknown> = z.looseObject({
  level: z.number().int().min(1).max(6),
  text: z.string().min(1),
})

const serpCompetitorSchema: z.ZodType<SerpCompetitor, unknown> = z
  .looseObject({
    position: count('competitors.position'),
    title: text('competitors.title', ''),
    url: z.string().min(1),
    domain: text('competitors.domain', ''),
    headings: tolerantArray(hnNodeSchema, 'competitors.headings'),
    // `null` relu en base = aucun texte extrait.
    textContent: nullableText('competitors.textContent').transform(value => value ?? ''),
    fetchError: withFallback(z.string().optional(), undefined, 'competitors.fetchError'),
    // `null` relu en base = classification inconnue.
    isBlog: withFallback(z.boolean().nullable().optional(), undefined, 'competitors.isBlog').transform(value => value ?? undefined),
  })
  .transform(competitor => {
    const unread = !competitor.fetchError && competitor.headings.length === 0 && competitor.textContent.trim() === ''
    return unread ? { ...competitor, fetchError: UNREAD_PAGE_MESSAGE } : competitor
  })

const paaQuestionSchema: z.ZodType<PaaQuestion, unknown> = z.looseObject({
  question: z.string().min(1),
  answer: nullableText('paaQuestions.answer'),
})

/** Réponse de POST /serp/analyze. */
const serpAnalysisSchema = z.looseObject({
  keyword: z.string().min(1),
  articleLevel: z.enum(ARTICLE_LEVELS),
  competitors: tolerantArray(serpCompetitorSchema, 'competitors'),
  paaQuestions: tolerantArray(paaQuestionSchema, 'paaQuestions'),
  maxScraped: count('maxScraped'),
  cachedAt: text('cachedAt', ''),
  fromCache: withFallback(z.boolean(), false, 'fromCache'),
})

export const serpAnalysisContract = defineContract<SerpAnalysisResult>('serp-analysis', serpAnalysisSchema)

/**
 * POST /serp/analyze en lecture seule (`cacheOnly`) : l'analyse en base, ou
 * `null` quand le mot-clé n'a jamais été analysé (M18).
 */
export const serpAnalysisStoredContract = defineContract<SerpAnalysisResult | null>(
  'serp-analysis',
  serpAnalysisSchema.nullable(),
)

const TFIDF_LEVELS = ['obligatoire', 'differenciateur', 'optionnel'] as const

// Fréquence et densité sont calculées localement : illisibles (cache abîmé), le
// terme est écarté plutôt qu'affiché « ×0/page · 0 % » (un faux zéro).
const tfidfTermSchema: z.ZodType<TfidfTerm, unknown> = z.looseObject({
  term: z.string().min(1),
  level: z.enum(TFIDF_LEVELS),
  documentFrequency: z.number(),
  density: z.number(),
  competitorCount: count('tfidf.competitorCount'),
  totalCompetitors: count('tfidf.totalCompetitors'),
})

/**
 * Réponse de GET /keywords/:keyword/serp/exists (pré-contrôle du Lexique) :
 * une réponse illisible donne « inconnu » (`null`) — l'écran garde le bouton
 * « Extraire » au lieu de proposer un scrape payant.
 */
export const serpExistsContract = defineContract<SerpExistsResponse>(
  'serp-exists',
  z.looseObject({
    exists: withFallback(z.boolean().nullable(), null, 'exists'),
    scrapedAt: nullableText('scrapedAt'),
  }),
)

/** Réponse de POST /serp/tfidf. */
export const tfidfResultContract = defineContract<TfidfResult>(
  'tfidf',
  z.looseObject({
    keyword: text('keyword', ''),
    totalCompetitors: count('totalCompetitors'),
    obligatoire: tolerantArray(tfidfTermSchema, 'obligatoire'),
    differenciateur: tolerantArray(tfidfTermSchema, 'differenciateur'),
    optionnel: tolerantArray(tfidfTermSchema, 'optionnel'),
  }),
)
