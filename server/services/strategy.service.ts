import { join } from 'path'
import { readJson, writeJson } from '../utils/json-storage.js'
import { articleStrategySchema } from '../../shared/schemas/strategy.schema.js'
import type { ArticleStrategy } from '../../shared/types/index.js'
import { log } from '../utils/logger.js'

const STRATEGIES_DIR = join(process.cwd(), 'data', 'strategies')

function emptyStrategy(slug: string): ArticleStrategy {
  const emptyStep = { input: '', suggestion: null, validated: '' }
  return {
    slug,
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

export async function getStrategy(slug: string): Promise<ArticleStrategy | null> {
  try {
    const data = await readJson<ArticleStrategy>(join(STRATEGIES_DIR, `${slug}.json`))
    return articleStrategySchema.parse(data)
  } catch {
    return null
  }
}

export async function saveStrategy(slug: string, strategy: Partial<ArticleStrategy>): Promise<ArticleStrategy> {
  const existing = await getStrategy(slug) ?? emptyStrategy(slug)
  const merged: ArticleStrategy = {
    ...existing,
    ...strategy,
    slug, // enforce slug consistency
    updatedAt: new Date().toISOString(),
  }
  articleStrategySchema.parse(merged)
  await writeJson(join(STRATEGIES_DIR, `${slug}.json`), merged)
  log.info(`Strategy saved for article "${slug}"`)
  return merged
}
