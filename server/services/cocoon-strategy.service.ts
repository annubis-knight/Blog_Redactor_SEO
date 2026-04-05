import { join } from 'path'
import { readJson, writeJson } from '../utils/json-storage.js'
import { cocoonStrategySchema } from '../../shared/schemas/strategy.schema.js'
import type { CocoonStrategy, StrategyStepData } from '../../shared/types/index.js'
import { log } from '../utils/logger.js'

const STRATEGIES_DIR = join(process.cwd(), 'data', 'strategies')

function emptyCocoonStrategy(cocoonSlug: string): CocoonStrategy {
  const emptyStep: StrategyStepData = { input: '', suggestion: null, validated: '' }
  return {
    cocoonSlug,
    cible: { ...emptyStep },
    douleur: { ...emptyStep },
    angle: { ...emptyStep },
    promesse: { ...emptyStep },
    cta: { ...emptyStep },
    proposedArticles: [],
    suggestedTopics: [],
    topicsUserContext: '',
    completedSteps: 0,
    updatedAt: new Date().toISOString(),
  }
}

export async function getCocoonStrategy(cocoonSlug: string): Promise<CocoonStrategy | null> {
  try {
    const data = await readJson<CocoonStrategy>(join(STRATEGIES_DIR, `cocoon-${cocoonSlug}.json`))
    return cocoonStrategySchema.parse(data)
  } catch {
    return null
  }
}

export async function saveCocoonStrategy(cocoonSlug: string, strategy: Partial<CocoonStrategy>): Promise<CocoonStrategy> {
  const existing = await getCocoonStrategy(cocoonSlug) ?? emptyCocoonStrategy(cocoonSlug)
  const merged: CocoonStrategy = {
    ...existing,
    ...strategy,
    cocoonSlug,
    updatedAt: new Date().toISOString(),
  }
  cocoonStrategySchema.parse(merged)
  await writeJson(join(STRATEGIES_DIR, `cocoon-${cocoonSlug}.json`), merged)
  log.info(`Cocoon strategy saved for "${cocoonSlug}"`)
  return merged
}
