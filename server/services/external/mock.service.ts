/**
 * Mock AI Provider (2026-04-22)
 *
 * Provider qui retourne des réponses prévisibles sans appel API réseau. Utilisé
 * en dev pour tester les workflows (parsing, persistance DB, hydratation, gates
 * UI) sans dépendre des quotas Claude/Gemini/OpenRouter.
 *
 * Activation : AI_PROVIDER=mock dans .env. Le dispatcher route alors tous les
 * appels ici. Fallback chain : si d'autres providers sont disponibles, le mock
 * n'entre en jeu que si AI_PROVIDER=mock (on ne bascule jamais vers mock en
 * fallback — c'est un provider explicite).
 *
 * Fixtures : mock-fixtures/*.ts. Chaque fichier exporte un registre keyed par
 * tool name (pour classifyWithTool) ou par "hint" (pour streamChatCompletion).
 */
import { log } from '../../utils/logger.js'
import type { ApiUsage } from './claude.service.js'

const MODEL = 'mock-provider-v1'
const USAGE_SENTINEL_LOCAL = '__USAGE__'

/** Latence simulée (ms) pour valider les états loading. Configurable via MOCK_LATENCY_MS. */
const SIMULATED_LATENCY_MS = Number(process.env.MOCK_LATENCY_MS ?? '200')

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function makeUsage(inputTokens = 100, outputTokens = 150): ApiUsage {
  return {
    model: MODEL,
    inputTokens,
    outputTokens,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    estimatedCost: 0,
  }
}

// ---------------------------------------------------------------------------
// Registry de fixtures pour classifyWithTool (JSON structuré)
// ---------------------------------------------------------------------------

/**
 * Un builder de fixture prend (userPrompt, schema) et retourne un JSON conforme.
 * `userPrompt` est fourni pour que la fixture puisse extraire des données
 * contextuelles (ex: le keyword dans le prompt) et produire une réponse réaliste.
 */
type FixtureBuilder = (ctx: {
  systemPrompt: string
  userPrompt: string
  schema: Record<string, unknown>
}) => unknown

const toolFixtures = new Map<string, FixtureBuilder>()

/** Enregistre une fixture pour un tool name donné. */
export function registerToolFixture(toolName: string, builder: FixtureBuilder): void {
  toolFixtures.set(toolName, builder)
}

// ---------------------------------------------------------------------------
// Fixture par défaut : génère une réponse à partir du JSON schema
// ---------------------------------------------------------------------------

/**
 * Génère un objet minimal conforme au schéma. Utilisé en fallback quand aucune
 * fixture spécifique n'est enregistrée pour ce tool name.
 */
function generateFromSchema(schema: Record<string, unknown>): unknown {
  const type = schema.type as string | undefined
  if (type === 'object') {
    const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>
    const required = (schema.required ?? []) as string[]
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(props)) {
      if (required.length > 0 && !required.includes(key)) continue
      out[key] = generateFromSchema(props[key])
    }
    return out
  }
  if (type === 'array') {
    const items = (schema.items ?? {}) as Record<string, unknown>
    return [generateFromSchema(items)]
  }
  if (type === 'string') {
    const enumVals = schema.enum as string[] | undefined
    if (enumVals && enumVals.length > 0) return enumVals[0]
    return 'mock value'
  }
  if (type === 'integer' || type === 'number') return 0
  if (type === 'boolean') return false
  return null
}

// ---------------------------------------------------------------------------
// API publique — compatible avec classifyJsonGemini / classifyJsonOpenRouter
// ---------------------------------------------------------------------------

export async function classifyJsonMock<T>(
  systemPrompt: string,
  userPrompt: string,
  _model?: string,
  _maxTokens?: number,
): Promise<{ data: T; usage: ApiUsage }> {
  await sleep(SIMULATED_LATENCY_MS)

  // Extrait le tool name depuis la description ajoutée par classifyWithTool
  // (format: "Description : <description>\nCommence ta réponse…")
  const descMatch = userPrompt.match(/Description\s*:\s*([^\n]+)/i)
  const schemaMatch = userPrompt.match(/FORMAT DE SORTIE OBLIGATOIRE[^\n]*\n([\s\S]*?)(?:\nDescription\s*:|$)/i)

  let parsedSchema: Record<string, unknown> = {}
  if (schemaMatch && schemaMatch[1]) {
    try {
      parsedSchema = JSON.parse(schemaMatch[1].trim()) as Record<string, unknown>
    } catch {
      // Schema pas parsable → on génère à partir de rien
    }
  }

  // 1. On essaie d'abord le tag explicite "Tool : <name>" (ajouté par ai-provider)
  const explicitToolMatch = userPrompt.match(/\bTool\s*:\s*([a-z0-9_-]+)/i)
  const explicitToolName = explicitToolMatch?.[1]?.trim() ?? ''

  // 2. Fallback heuristique via description
  const toolNameFromDesc = descMatch?.[1]?.trim() ?? ''
  const registeredName = (explicitToolName && toolFixtures.has(explicitToolName))
    ? explicitToolName
    : findMatchingFixture(toolNameFromDesc, userPrompt, parsedSchema)

  let data: unknown
  if (registeredName) {
    const builder = toolFixtures.get(registeredName)!
    data = builder({ systemPrompt, userPrompt, schema: parsedSchema })
    log.debug(`[mock] classifyJson via fixture "${registeredName}"`)
  } else {
    data = generateFromSchema(parsedSchema)
    log.debug(`[mock] classifyJson via auto-generated schema fallback`)
  }

  return { data: data as T, usage: makeUsage() }
}

/**
 * Trouve une fixture correspondant au contexte. On essaie :
 * 1. Match exact sur le tool name dans la description
 * 2. Match sur une signature keyword (ex: tool "generate_radar_keywords" → mention de "radar" dans userPrompt)
 */
function findMatchingFixture(
  toolDesc: string,
  userPrompt: string,
  schema: Record<string, unknown>,
): string | null {
  // Parcours des fixtures pour trouver un match par nom partiel
  for (const name of toolFixtures.keys()) {
    const nameWords = name.toLowerCase().split(/[_\s-]+/)
    // Heuristic: la plupart des mots du tool name apparaissent dans la description ou le prompt
    const searchText = (toolDesc + ' ' + userPrompt.slice(0, 500)).toLowerCase()
    const matchCount = nameWords.filter(w => w.length > 3 && searchText.includes(w)).length
    if (matchCount >= Math.max(1, Math.floor(nameWords.length / 2))) {
      return name
    }
  }
  // Schema-based heuristic : propriétés clés du schéma
  const props = Object.keys(((schema.properties ?? {}) as Record<string, unknown>))
  for (const name of toolFixtures.keys()) {
    const nameWords = name.toLowerCase().split(/[_\s-]+/)
    if (nameWords.some(w => props.includes(w))) return name
  }
  return null
}

// ---------------------------------------------------------------------------
// Registry de fixtures pour streamChatCompletion (texte libre)
// ---------------------------------------------------------------------------

type StreamFixtureBuilder = (ctx: {
  systemPrompt: string
  userPrompt: string
}) => string | string[]

const streamFixtures: { matcher: (ctx: { systemPrompt: string; userPrompt: string }) => boolean; builder: StreamFixtureBuilder; name: string }[] = []

/**
 * Enregistre une fixture stream. Le matcher décide si elle s'applique au
 * contexte actuel (prompts). Builder retourne soit une string (chunked
 * auto), soit un array de chunks explicites.
 */
export function registerStreamFixture(
  name: string,
  matcher: (ctx: { systemPrompt: string; userPrompt: string }) => boolean,
  builder: StreamFixtureBuilder,
): void {
  streamFixtures.push({ name, matcher, builder })
}

export async function* streamChatCompletionMock(
  systemPrompt: string,
  userPrompt: string,
  _maxTokens?: number,
): AsyncGenerator<string> {
  await sleep(Math.min(SIMULATED_LATENCY_MS, 100))

  const matched = streamFixtures.find(f => f.matcher({ systemPrompt, userPrompt }))
  let text: string
  let chunks: string[] | null = null
  if (matched) {
    const output = matched.builder({ systemPrompt, userPrompt })
    if (Array.isArray(output)) {
      chunks = output
      text = output.join('')
    } else {
      text = output
    }
    log.debug(`[mock] streamChatCompletion via fixture "${matched.name}"`)
  } else {
    text = `[Mock provider] Réponse simulée.\n\nContexte système : ${systemPrompt.slice(0, 80)}...\n\nCommence : ${userPrompt.slice(0, 80)}...\n\nFin de la réponse simulée.`
    log.debug(`[mock] streamChatCompletion via default response`)
  }

  // Stream en chunks pour simuler un vrai SSE
  if (!chunks) {
    chunks = []
    const words = text.split(/(\s+)/)
    let buffer = ''
    for (const w of words) {
      buffer += w
      if (buffer.length >= 15) {
        chunks.push(buffer)
        buffer = ''
      }
    }
    if (buffer) chunks.push(buffer)
  }

  for (const chunk of chunks) {
    yield chunk
    await sleep(10) // micro-délai pour un vrai effet streaming
  }

  // Sentinel final (même format que Claude/Gemini/OpenRouter)
  const usage = makeUsage(Math.floor(text.length / 4), Math.floor(text.length / 4))
  yield `${USAGE_SENTINEL_LOCAL}${JSON.stringify(usage)}`
}

// ---------------------------------------------------------------------------
// Pricing (toujours 0)
// ---------------------------------------------------------------------------

export function calculateMockCost(_usage: ApiUsage): number {
  return 0
}

// ---------------------------------------------------------------------------
// Chargement des fixtures au boot
// ---------------------------------------------------------------------------

// Auto-import des fixtures au premier usage. On n'enregistre qu'une fois.
let fixturesLoaded = false
export async function ensureFixturesLoaded(): Promise<void> {
  if (fixturesLoaded) return
  fixturesLoaded = true
  await import('./mock-fixtures/index.js')
  log.info(`[mock] Fixtures loaded: ${toolFixtures.size} tool fixtures, ${streamFixtures.length} stream fixtures`)
}
