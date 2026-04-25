import { query } from '../../db/client.js'
import { log } from '../../utils/logger.js'
import type {
  LexiqueAnalysisResult,
  LexiqueTermRecommendation,
  TfidfResult,
} from '../../../shared/types/serp-analysis.types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LexiqueExploration {
  articleId: number
  sourceKeyword: string
  tfidfTerms: TfidfResult | null
  aiRecommendations: LexiqueTermRecommendation[]
  aiMissingTerms: string[]
  aiSummary: string | null
  exploredAt: string
}

interface LexiqueRow {
  article_id: number
  source_keyword: string
  tfidf_terms: TfidfResult | null
  ai_recommendations: LexiqueTermRecommendation[]
  ai_missing_terms: string[]
  ai_summary: string | null
  explored_at: Date
}

function rowToExploration(row: LexiqueRow): LexiqueExploration {
  const tfidf = row.tfidf_terms
  const hasTfidf = tfidf && typeof (tfidf as unknown as { keyword?: unknown }).keyword === 'string'
  return {
    articleId: row.article_id,
    sourceKeyword: row.source_keyword,
    tfidfTerms: hasTfidf ? tfidf : null,
    aiRecommendations: row.ai_recommendations ?? [],
    aiMissingTerms: row.ai_missing_terms ?? [],
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
