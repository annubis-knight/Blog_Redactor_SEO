/**
 * FR-INFRA-SSE-EVENT-PERSISTANT — un message découpé en plusieurs paquets
 * garde son type d'événement.
 *
 * Un flux SSE se découpe librement : rien ne garantit que `event: done` et la
 * ligne `data:` qui le suit arrivent dans la même lecture. Au-delà de quelques
 * kilo-octets, ils sont même forcément séparés.
 *
 * Le type d'événement était déclaré à l'intérieur de la boucle de lecture : il
 * repartait à zéro à chaque paquet. La rédaction d'un article long ne se
 * terminait donc jamais côté écran — le texte s'affichait section après
 * section, puis plus rien : pas de méta, pas d'accès à l'éditeur, pas de
 * bouton de régénération.
 *
 * Constaté le 2026-09-24 sur un pilier réel : 11 sections, 65 631 caractères
 * produits et enregistrés côté serveur, et un écran resté bloqué 40 minutes.
 * Invisible en mode simulé, où une section tient en quelques centaines
 * d'octets et où tout arrive d'un bloc.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

/** Découpe un flux SSE en paquets de taille fixe, comme le ferait le réseau. */
function enPaquets(texte: string, taille: number): Uint8Array[] {
  const encodeur = new TextEncoder()
  const octets = encodeur.encode(texte)
  const paquets: Uint8Array[] = []
  for (let i = 0; i < octets.length; i += taille) {
    paquets.push(octets.slice(i, i + taille))
  }
  return paquets
}

function fluxDepuis(paquets: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i < paquets.length) controller.enqueue(paquets[i++])
      else controller.close()
    },
  })
}

const originalFetch = globalThis.fetch

function repondreAvec(sse: string, taillePaquet: number) {
  globalThis.fetch = vi.fn(async () => new Response(fluxDepuis(enPaquets(sse, taillePaquet)), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })) as never
}

describe('apiStream — le type d’événement traverse les paquets', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch
    vi.resetModules()
  })

  async function lire(sse: string, taillePaquet: number) {
    repondreAvec(sse, taillePaquet)
    const { apiStream } = await import('../../../src/services/api.service')
    const recus: { done: unknown; chunks: string[] } = { done: null, chunks: [] }
    const out = await apiStream<{ content: string }>('/generate/article', {}, {
      onChunkRaw: (p) => recus.chunks.push(p),
      onDone: (d) => { recus.done = d },
    })
    return { out, recus }
  }

  it('reçoit la fin quand tout arrive d’un bloc', async () => {
    const sse = 'event: chunk\ndata: {"content":"Bonjour"}\n\nevent: done\ndata: {"content":"Bonjour le monde"}\n\n'
    const { recus } = await lire(sse, 4096)

    expect(recus.done, 'la fin doit être reçue').toEqual({ content: 'Bonjour le monde' })
  })

  it('reçoit la fin même quand le message est coupé en petits paquets', async () => {
    const sse = 'event: chunk\ndata: {"content":"Bonjour"}\n\nevent: done\ndata: {"content":"Bonjour le monde"}\n\n'
    // 12 octets : « event: done » se retrouve seul dans son paquet.
    const { recus } = await lire(sse, 12)

    expect(recus.done, 'un type d’événement isolé ne doit pas être perdu')
      .toEqual({ content: 'Bonjour le monde' })
  })

  it('reçoit la fin sur un contenu volumineux, comme un article réel', async () => {
    const corps = 'Du texte rédigé. '.repeat(4000) // ~68 000 caractères
    const sse = `event: chunk\ndata: ${JSON.stringify({ content: 'début' })}\n\n`
      + `event: done\ndata: ${JSON.stringify({ content: corps })}\n\n`
    const { recus } = await lire(sse, 1024)

    expect((recus.done as { content: string } | null)?.content?.length, 'le contenu complet arrive')
      .toBe(corps.length)
  })

  it('n’attribue pas les données d’un événement au type du précédent', async () => {
    const sse = 'event: section-done\ndata: {"index":0}\n\nevent: done\ndata: {"content":"fini"}\n\n'
    repondreAvec(sse, 9)
    const { apiStream } = await import('../../../src/services/api.service')
    const sections: number[] = []
    let fin: unknown = null
    await apiStream<{ content: string }>('/generate/article', {}, {
      onSectionDone: (s) => sections.push(s.index),
      onDone: (d) => { fin = d },
    })

    expect(sections, 'la section est bien vue comme une section').toEqual([0])
    expect(fin, 'et la fin comme une fin').toEqual({ content: 'fini' })
  })
})
