/**
 * Helpers pour consommer un stream `streamChatCompletion` côté serveur en
 * préservant le `usage` (coût API) pour le remonter au frontend.
 *
 * Contexte : certaines routes (strategy/*, theme/parse, translate-pain,
 * lexique-suggest) consomment le stream côté serveur puis renvoient un JSON
 * simple au client — contrairement aux routes SSE qui passent directement
 * les chunks au navigateur.
 *
 * Sans ces helpers, le sentinel `__USAGE__{...json...}` était ignoré (`break`),
 * et la pile d'activité (cost log) ne recevait aucune info sur le coût de
 * la requête. Ce helper extrait l'usage pour qu'il puisse être joint à
 * `res.json({ data: { ..., usage } })`.
 */
import { streamChatCompletion, USAGE_SENTINEL } from '../services/external/ai-provider.service.js'
import type { ApiUsage } from '../services/external/claude.service.js'

/**
 * Consomme le stream complet et retourne { text, usage }.
 * Le texte exclut le sentinel final ; l'usage est parsé depuis le sentinel.
 */
export async function collectStreamWithUsage(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024,
): Promise<{ text: string; usage: ApiUsage | null }> {
  let text = ''
  let usage: ApiUsage | null = null
  for await (const chunk of streamChatCompletion(systemPrompt, userPrompt, maxTokens)) {
    if (chunk.startsWith(USAGE_SENTINEL)) {
      try {
        usage = JSON.parse(chunk.slice(USAGE_SENTINEL.length)) as ApiUsage
      } catch {
        // Sentinel malformé — on continue sans usage
      }
      break
    }
    text += chunk
  }
  return { text, usage }
}
