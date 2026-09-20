import { describe, it, expect } from 'vitest'
import { filterToolPreambles, type StreamBlockEvent } from '../../../server/services/external/claude-stream'

// ---------------------------------------------------------------------------
// Fabrique d'événements : reproduit la forme des événements du SDK Anthropic.
// ---------------------------------------------------------------------------

const start = (type: string): StreamBlockEvent => ({ type: 'content_block_start', content_block: { type } })
const text = (t: string): StreamBlockEvent => ({ type: 'content_block_delta', delta: { type: 'text_delta', text: t } })
const json = (partial: string): StreamBlockEvent => ({
  type: 'content_block_delta',
  delta: { type: 'input_json_delta', partial_json: partial },
})
const stop = (): StreamBlockEvent => ({ type: 'content_block_stop' })

async function* feed(events: StreamBlockEvent[]): AsyncGenerator<StreamBlockEvent> {
  for (const e of events) yield e
}

async function collect(events: StreamBlockEvent[]): Promise<string> {
  let out = ''
  for await (const chunk of filterToolPreambles(feed(events))) out += chunk
  return out
}

// ---------------------------------------------------------------------------

describe('filterToolPreambles', () => {
  it('supprime le bloc de texte qui précède une recherche web', async () => {
    const result = await collect([
      start('text'),
      text("Je vais d'abord faire une recherche pour vérifier ces chiffres."),
      stop(),
      start('server_tool_use'),
      json('{"query":"google business profile"}'),
      stop(),
      start('web_search_tool_result'),
      stop(),
      start('text'),
      text('<h2>Le vrai titre</h2>'),
      text('<p>Le vrai contenu.</p>'),
      stop(),
    ])

    expect(result).toBe('<h2>Le vrai titre</h2><p>Le vrai contenu.</p>')
  })

  it('supprime aussi les transitions entre deux recherches', async () => {
    const result = await collect([
      start('text'),
      text('Je vais rechercher des données récentes.'),
      stop(),
      start('server_tool_use'),
      stop(),
      start('web_search_tool_result'),
      stop(),
      start('text'),
      text("Parfait. J'ai mes sources. Maintenant je vais vérifier un dernier point."),
      stop(),
      start('server_tool_use'),
      stop(),
      start('web_search_tool_result'),
      stop(),
      start('text'),
      text('<h2>Contenu final</h2>'),
      stop(),
    ])

    expect(result).toBe('<h2>Contenu final</h2>')
  })

  it('conserve plusieurs blocs de texte consécutifs (cas des citations)', async () => {
    const result = await collect([
      start('server_tool_use'),
      stop(),
      start('web_search_tool_result'),
      stop(),
      start('text'),
      text('<p>Première partie'),
      stop(),
      start('text'),
      text(' et sa suite citée.</p>'),
      stop(),
    ])

    expect(result).toBe('<p>Première partie et sa suite citée.</p>')
  })

  it('laisse passer un flux sans outil (aucun bloc perdu)', async () => {
    const result = await collect([start('text'), text('<p>Bonjour'), text(' monde.</p>'), stop()])
    expect(result).toBe('<p>Bonjour monde.</p>')
  })

  it('ignore les deltas JSON des appels d’outil', async () => {
    const result = await collect([
      start('server_tool_use'),
      json('{"query":"test"}'),
      stop(),
      start('text'),
      text('<p>Contenu.</p>'),
      stop(),
    ])

    expect(result).toBe('<p>Contenu.</p>')
  })

  it('ne produit rien quand le modèle ne renvoie aucun texte', async () => {
    expect(await collect([start('server_tool_use'), stop()])).toBe('')
  })

  it('flux vide → rien', async () => {
    expect(await collect([])).toBe('')
  })

  it('émet le dernier bloc même sans content_block_stop final', async () => {
    const result = await collect([start('text'), text('<p>Tronqué.</p>')])
    expect(result).toBe('<p>Tronqué.</p>')
  })
})
