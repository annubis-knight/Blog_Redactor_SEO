/**
 * Registre des fixtures du fournisseur d'IA simulé (`AI_PROVIDER=mock`).
 *
 * Module séparé pour casser un cycle d'import : `mock.service` chargeait les
 * fixtures, et chaque fixture s'inscrivait… auprès de `mock.service`. Douze
 * dépendances circulaires en découlaient, qui bloquaient `npm run verify:full`
 * (2026-09-21). Désormais : fixtures → registre ← service. Aucun cycle.
 */

/**
 * Un builder de fixture prend (userPrompt, schema) et retourne un JSON conforme.
 * `userPrompt` est fourni pour que la fixture puisse extraire des données
 * contextuelles (ex: le keyword dans le prompt) et produire une réponse réaliste.
 */
export type FixtureBuilder = (ctx: {
  systemPrompt: string
  userPrompt: string
  schema: Record<string, unknown>
}) => unknown

export type StreamFixtureBuilder = (ctx: {
  systemPrompt: string
  userPrompt: string
}) => string | string[]

export interface StreamFixture {
  name: string
  matcher: (ctx: { systemPrompt: string; userPrompt: string }) => boolean
  builder: StreamFixtureBuilder
}

/** Fixtures de réponse structurée (classifyWithTool), par nom d'outil. */
export const toolFixtures = new Map<string, FixtureBuilder>()

/** Fixtures de texte libre (streamChatCompletion), essayées dans l'ordre. */
export const streamFixtures: StreamFixture[] = []

/** Enregistre une fixture pour un tool name donné. */
export function registerToolFixture(toolName: string, builder: FixtureBuilder): void {
  toolFixtures.set(toolName, builder)
}

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
