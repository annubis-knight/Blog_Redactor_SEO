import { join } from 'path'
import { readJson, writeJson } from '../utils/json-storage.js'
import { articleStrategySchema } from '../../shared/schemas/strategy.schema.js'
import type { ArticleStrategy } from '../../shared/types/index.js'
import { log } from '../utils/logger.js'

const STRATEGIES_DIR = join(process.cwd(), 'data', 'strategies')

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
  try {
    const data = await readJson<ArticleStrategy>(join(STRATEGIES_DIR, `${id}.json`))
    return articleStrategySchema.parse(data)
  } catch {
    return null
  }
}

export async function saveStrategy(id: number, strategy: Partial<ArticleStrategy>): Promise<ArticleStrategy> {
  const existing = await getStrategy(id) ?? emptyStrategy(id)
  const merged: ArticleStrategy = {
    ...existing,
    ...strategy,
    id, // enforce id consistency
    updatedAt: new Date().toISOString(),
  }
  articleStrategySchema.parse(merged)
  await writeJson(join(STRATEGIES_DIR, `${id}.json`), merged)
  log.info(`Strategy saved for article "${id}"`)
  return merged
}
