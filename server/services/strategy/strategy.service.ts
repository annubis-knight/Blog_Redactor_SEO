import { pool } from '../../db/client.js'
import { articleStrategySchema } from '../../../shared/schemas/strategy.schema.js'
import type { ArticleStrategy } from '../../../shared/types/index.js'
import { log } from '../../utils/logger.js'

function emptyStrategy(id: number): ArticleStrategy {
  const emptyStep = { input: '', suggestion: null, validated: '' }
  return {
    id,
    cible: { ...emptyStep },
    douleur: { ...emptyStep },
    aiguillage: { suggestedType: null, suggestedParent: null, suggestedChildren: [], validated: false },
    angle: { ...emptyStep },
    promesse: { ...emptyStep },
    cta: { type: 'service', target: '', suggestion: null },
    completedSteps: 0,
    updatedAt: new Date().toISOString(),
  }
}

export async function getStrategy(id: number): Promise<ArticleStrategy | null> {
  const res = await pool.query(
    `SELECT data, completed_steps FROM article_strategies WHERE article_id = $1`,
    [id]
  )
  if (res.rows.length === 0) return null
  try {
    return articleStrategySchema.parse(res.rows[0].data)
  } catch {
    return null
  }
}

export async function saveStrategy(id: number, strategy: Partial<ArticleStrategy>): Promise<ArticleStrategy> {
  const existing = await getStrategy(id) ?? emptyStrategy(id)
  const merged: ArticleStrategy = {
    ...existing,
    ...strategy,
    id,
    updatedAt: new Date().toISOString(),
  }
  articleStrategySchema.parse(merged)

  await pool.query(`
    INSERT INTO article_strategies (article_id, data, completed_steps)
    VALUES ($1, $2, $3)
    ON CONFLICT (article_id) DO UPDATE
    SET data = EXCLUDED.data, completed_steps = EXCLUDED.completed_steps
  `, [id, JSON.stringify(merged), merged.completedSteps ?? 0])

  log.info(`Strategy saved for article "${id}"`)
  return merged
}
