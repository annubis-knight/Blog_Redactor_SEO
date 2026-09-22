/**
 * Contrats d'affichage — « Lexique IA » et explorations Lexique relues (lot 5).
 *
 * Forme attendue par LexiqueTermsList (badge « recommandé / exclu » et raison),
 * LexiqueAiPanel (résumé, termes manquants) et les onglets par mot-clé source
 * de LexiquePanel, après :
 *   - la sortie de l'IA (POST /keywords/:keyword/ai-lexique-upfront, frontière
 *     serveur avant sauvegarde, puis événement `done` côté client) ;
 *   - la relecture en base (`lexique_explorations`) via GET /articles/:id/explorations.
 *
 * Une recommandation sans décision lisible (`aiRecommended` absent ou « peut-être »)
 * est écartée : le terme s'affiche alors sans badge, comme un terme non analysé,
 * plutôt qu'avec une décision inventée.
 *
 * AUTHORITY: PostgreSQL `lexique_explorations` (tfidf_terms, ai_recommendations,
 *            ai_missing_terms, ai_summary)
 * READS FROM: POST /keywords/:keyword/ai-lexique-upfront (SSE), GET /articles/:id/explorations
 * CONSUMERS: useLexiqueIa, useLexiqueExplorations, LexiquePanel, LexiqueAiPanel
 * RELATED FR: NFR-INT-DISPLAY-CONTRACTS, FR-LEX-TFIDF, FR-LEX-LECTURE-VS-VERROUILLAGE
 */
import { z } from 'zod'
import { defineContract, nullableText, requiredList, text, tolerantArray, withFallback } from './core.js'
import { tfidfResultContract } from './serp.contract.js'
import type {
  LexiqueAnalysisResult,
  LexiqueExploration,
  LexiqueTermRecommendation,
} from '../types/serp-analysis.types.js'

const nonBlank = z.string().refine(value => value.trim() !== '', 'texte vide')

export const lexiqueRecommendationSchema: z.ZodType<LexiqueTermRecommendation, unknown> = z.looseObject({
  term: nonBlank,
  aiRecommended: z.boolean(),
  aiReason: text('recommendations.aiReason', ''),
})

/**
 * Analyse IA du Lexique : sans liste de recommandations, la réponse est refusée
 * (événement `error` → message et bouton « Relancer » à l'écran).
 */
export const lexiqueAnalysisContract = defineContract<LexiqueAnalysisResult>(
  'lexique-ai',
  z.looseObject({
    recommendations: requiredList(lexiqueRecommendationSchema, 'recommendations'),
    missingTerms: tolerantArray(nonBlank, 'missingTerms'),
    summary: text('summary', ''),
  }),
)

/** Exploration Lexique relue en base : un TF-IDF illisible devient « pas encore extrait » (null). */
export const lexiqueExplorationSchema: z.ZodType<LexiqueExploration, unknown> = z.looseObject({
  articleId: z.number(),
  sourceKeyword: nonBlank,
  tfidfTerms: withFallback(tfidfResultContract.schema.nullable(), null, 'lexique.tfidfTerms'),
  aiRecommendations: tolerantArray(lexiqueRecommendationSchema, 'lexique.aiRecommendations'),
  aiMissingTerms: tolerantArray(nonBlank, 'lexique.aiMissingTerms'),
  aiSummary: nullableText('lexique.aiSummary'),
  exploredAt: text('lexique.exploredAt', ''),
})
