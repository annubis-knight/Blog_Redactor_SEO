import { query } from '../../db/client.js'
import { cocoonStrategySchema } from '../../../shared/schemas/strategy.schema.js'
import type { CocoonStrategy, StrategyStepData } from '../../../shared/types/index.js'
import { log } from '../../utils/logger.js'

// Sprint 15.7 — Storage moved from api_cache[cocoon-strategy] to the dedicated
// `cocoon_strategies` table. The getters/setters preserve the same public
// interface so callers are unchanged.

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function resolveCocoonId(cocoonSlug: string): Promise<number | null> {
  const res = await query<{ id: number }>(
    `SELECT id FROM cocoons WHERE LOWER(nom) = LOWER($1) OR LOWER(nom) = LOWER($2) LIMIT 1`,
    [cocoonSlug, cocoonSlug.replace(/-/g, ' ')],
  )
  if (res.rows[0]?.id) return res.rows[0].id
  // Fallback by slug match on every cocoon
  const all = await query<{ id: number; nom: string }>(`SELECT id, nom FROM cocoons`)
  const target = slugify(cocoonSlug)
  return all.rows.find(r => slugify(r.nom) === target)?.id ?? null
}

export async function getCocoonStrategy(cocoonSlug: string): Promise<CocoonStrategy | null> {
  const cocoonId = await resolveCocoonId(cocoonSlug)
  if (!cocoonId) return null
  const res = await query<{ data: CocoonStrategy }>(
    `SELECT data FROM cocoon_strategies WHERE cocoon_id = $1`,
    [cocoonId],
  )
  const raw = res.rows[0]?.data
  if (!raw) return null
  try {
    return cocoonStrategySchema.parse(raw)
  } catch {
    return null
  }
}

export async function saveCocoonStrategy(
  cocoonSlug: string,
  strategy: Partial<CocoonStrategy>,
): Promise<CocoonStrategy> {
  const cocoonId = await resolveCocoonId(cocoonSlug)
  if (!cocoonId) {
    throw new Error(`Unknown cocoon slug: ${cocoonSlug}`)
  }
  const existing = (await getCocoonStrategy(cocoonSlug)) ?? emptyCocoonStrategy(cocoonSlug)
  const merged: CocoonStrategy = {
    ...existing,
    ...strategy,
    cocoonSlug,
    updatedAt: new Date().toISOString(),
  }
  cocoonStrategySchema.parse(merged)
  await query(
    `INSERT INTO cocoon_strategies (cocoon_id, data, generated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (cocoon_id) DO UPDATE
       SET data = EXCLUDED.data, generated_at = NOW()`,
    [cocoonId, JSON.stringify(merged)],
  )
  log.info(`Cocoon strategy saved for "${cocoonSlug}" (id=${cocoonId})`)
  return merged
}
