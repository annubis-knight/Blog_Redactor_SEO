/**
 * AUTHORITY: PostgreSQL `lexique_explorations` (une ligne par article × mot-clé
 *            source : termes TF-IDF, recommandations et manques de l'IA).
 * READS FROM: lexique_explorations (les mots génériques sont écartés à la
 *             relecture, y compris dans les lignes d'avant C3 — M16).
 * WRITES TO: lexique_explorations (saveLexiqueTfidf : lexique-analysis.service ;
 *            saveLexiqueAi : keyword-ai-panel.routes).
 * CONSUMERS: article-explorations.routes (GET /articles/:id/explorations),
 *            keyword-queries.service, panneau Lexique.
 * RELATED FR: FR-LEX-METIER-ONLY
 */
import { query } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import { isGenericTerm } from '../../../shared/utils/generic-terms.js'
import type {
  LexiqueAnalysisResult,
  LexiqueExploration,
  LexiqueTermRecommendation,
  TfidfResult,
} from '../../../shared/types/serp-analysis.types.js'

// ---------------------------------------------------------------------------
// Types (LexiqueExploration : partagé avec l'écran, contrat `explorations`)
// ---------------------------------------------------------------------------

interface LexiqueRow {
  article_id: number
  source_keyword: string
  tfidf_terms: TfidfResult | null
  ai_recommendations: LexiqueTermRecommendation[]
  ai_missing_terms: string[]
  ai_summary: string | null
  explored_at: Date
}

const TFIDF_LEVELS = ['obligatoire', 'differenciateur', 'optionnel'] as const

/**
 * Les explorations enregistrées avant le filtre du lexique (C3) gardent leurs
 * mots génériques (« être », « cookies ») : on les écarte à la relecture, comme
 * toute nouvelle analyse (M16, FR-LEX-METIER-ONLY).
 */
function withoutGenericTerms(tfidf: TfidfResult): TfidfResult {
  const out = { ...tfidf }
  for (const level of TFIDF_LEVELS) {
    if (Array.isArray(tfidf[level])) out[level] = tfidf[level].filter(t => !isGenericTerm(t.term))
  }
  return out
}

function rowToExploration(row: LexiqueRow): LexiqueExploration {
  const tfidf = row.tfidf_terms
  const hasTfidf = tfidf && typeof (tfidf as unknown as { keyword?: unknown }).keyword === 'string'
  return {
    articleId: row.article_id,
    sourceKeyword: row.source_keyword,
    tfidfTerms: hasTfidf ? withoutGenericTerms(tfidf) : null,
    aiRecommendations: (row.ai_recommendations ?? []).filter(r => !isGenericTerm(r.term)),
    aiMissingTerms: (row.ai_missing_terms ?? []).filter(t => !isGenericTerm(t)),
    aiSummary: row.ai_summary,
    exploredAt: row.explored_at.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getLexiqueExploration(
  articleId: number,
  sourceKeyword: string,
): Promise<LexiqueExploration | null> {
  const res = await query<LexiqueRow>(
    `SELECT article_id, source_keyword, tfidf_terms, ai_recommendations,
            ai_missing_terms, ai_summary, explored_at
       FROM lexique_explorations
      WHERE article_id = $1 AND source_keyword = $2`,
    [articleId, sourceKeyword],
  )
  return res.rows[0] ? rowToExploration(res.rows[0]) : null
}

export async function listLexiqueExplorations(articleId: number): Promise<LexiqueExploration[]> {
  const res = await query<LexiqueRow>(
    `SELECT article_id, source_keyword, tfidf_terms, ai_recommendations,
            ai_missing_terms, ai_summary, explored_at
       FROM lexique_explorations
      WHERE article_id = $1
      ORDER BY explored_at DESC`,
    [articleId],
  )
  return res.rows.map(rowToExploration)
}

export async function saveLexiqueTfidf(
  articleId: number,
  sourceKeyword: string,
  tfidf: TfidfResult,
): Promise<void> {
  await query(
    `INSERT INTO lexique_explorations (article_id, source_keyword, tfidf_terms, explored_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (article_id, source_keyword) DO UPDATE
       SET tfidf_terms = EXCLUDED.tfidf_terms,
           explored_at = NOW()`,
    [articleId, sourceKeyword, JSON.stringify(tfidf)],
  )
  log.info(`lexique-exploration: saved tfidf article=${articleId}, keyword="${sourceKeyword}"`)
}

export async function saveLexiqueAi(
  articleId: number,
  sourceKeyword: string,
  ai: LexiqueAnalysisResult,
): Promise<void> {
  await query(
    `INSERT INTO lexique_explorations
       (article_id, source_keyword, ai_recommendations, ai_missing_terms, ai_summary, explored_at)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, NOW())
     ON CONFLICT (article_id, source_keyword) DO UPDATE
       SET ai_recommendations = EXCLUDED.ai_recommendations,
           ai_missing_terms = EXCLUDED.ai_missing_terms,
           ai_summary = EXCLUDED.ai_summary,
           explored_at = NOW()`,
    [
      articleId,
      sourceKeyword,
      JSON.stringify(ai.recommendations ?? []),
      JSON.stringify(ai.missingTerms ?? []),
      ai.summary ?? null,
    ],
  )
  log.info(`lexique-exploration: saved AI article=${articleId}, keyword="${sourceKeyword}"`)
}

export async function deleteLexiqueExploration(articleId: number, sourceKeyword: string): Promise<void> {
  await query(
    `DELETE FROM lexique_explorations WHERE article_id = $1 AND source_keyword = $2`,
    [articleId, sourceKeyword],
  )
}
