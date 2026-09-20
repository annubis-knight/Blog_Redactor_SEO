/**
 * Filtrage des blocs de texte d'un stream Claude quand des outils serveur
 * (recherche web) sont actifs.
 *
 * Problème résolu (audit 2026-09-19) : avec `web_search`, la réponse arrive en
 * plusieurs blocs — une phrase d'annonce (« Je vais d'abord faire une
 * recherche… »), l'appel d'outil, son résultat, puis le vrai contenu. Le
 * stream d'origine recopiait TOUS les `text_delta`, donc le monologue partait
 * en production : 8 à 19 fuites par pilier sur les articles #454 à #461.
 *
 * Règle appliquée : **un bloc de texte immédiatement suivi d'un appel d'outil
 * est un préambule — on le jette.** Tous les autres sont conservés, y compris
 * plusieurs blocs consécutifs (les citations de sources découpent la réponse
 * finale en plusieurs blocs : garder « seulement le dernier » perdrait du texte).
 *
 * Conséquence assumée : le texte est émis bloc par bloc, pas token par token.
 * C'est pourquoi `streamChatCompletion` n'active ce filtre **que** lorsque des
 * outils sont passés — sans outil, le streaming reste fluide et inchangé.
 *
 * Module séparé, sans dépendance au SDK : testable avec des événements factices.
 */

/** Forme minimale d'un événement de stream Anthropic dont on a besoin ici. */
export interface StreamBlockEvent {
  type: string
  content_block?: { type?: string }
  delta?: { type?: string; text?: string; partial_json?: string }
}

/** Types de blocs qui signalent un appel d'outil (donc un préambule en amont). */
const TOOL_USE_BLOCKS = new Set(['server_tool_use', 'tool_use', 'mcp_tool_use'])

/**
 * Filtre un flux d'événements et n'émet que le texte destiné au lecteur.
 *
 * @param events flux d'événements du SDK (ou équivalent en test)
 */
export async function* filterToolPreambles(
  events: AsyncIterable<StreamBlockEvent>,
): AsyncGenerator<string> {
  let pending = ''
  let inTextBlock = false

  for await (const event of events) {
    if (event.type === 'content_block_start') {
      const blockType = event.content_block?.type

      if (blockType === 'text') {
        // Nouveau bloc de texte : le précédent n'était pas un préambule.
        if (pending) {
          yield pending
          pending = ''
        }
        inTextBlock = true
        continue
      }

      if (blockType && TOOL_USE_BLOCKS.has(blockType)) {
        pending = '' // le texte qui précède annonçait l'outil → jeté
      }
      inTextBlock = false
      continue
    }

    if (event.type === 'content_block_delta') {
      if (inTextBlock && event.delta?.type === 'text_delta' && event.delta.text) {
        pending += event.delta.text
      }
      continue
    }

    if (event.type === 'content_block_stop') {
      // On garde `pending` en attente : seul le bloc suivant dira s'il
      // s'agissait d'un préambule.
      inTextBlock = false
    }
  }

  if (pending) yield pending
}
