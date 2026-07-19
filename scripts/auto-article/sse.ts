/**
 * Décodeur SSE pur (Server-Sent Events), sans réseau, testable.
 *
 * Les routes `generate/*` et les panels IA du backend streament des trames de la
 * forme :
 *
 *   event: chunk\n
 *   data: {"content":"..."}\n
 *   \n
 *
 * `parseSseBuffer` consomme un buffer accumulé, en extrait toutes les trames
 * complètes (délimitées par une ligne vide `\n\n`) et retourne le reliquat
 * incomplet à ré-concaténer au prochain morceau réseau.
 */

import type { SseEvent } from './types.js'

export interface SseParseResult {
  events: SseEvent[]
  /** Portion de buffer encore incomplète (pas de `\n\n` terminal). */
  rest: string
}

export function parseSseBuffer(buffer: string): SseParseResult {
  const events: SseEvent[] = []
  let working = buffer.replace(/\r\n/g, '\n')

  let idx = working.indexOf('\n\n')
  while (idx !== -1) {
    const frame = working.slice(0, idx)
    working = working.slice(idx + 2)
    const parsed = parseFrame(frame)
    if (parsed) events.push(parsed)
    idx = working.indexOf('\n\n')
  }

  return { events, rest: working }
}

function parseFrame(frame: string): SseEvent | null {
  const lines = frame.split('\n')
  let event = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith(':')) continue // commentaire SSE
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
    } else if (line.startsWith('data:')) {
      // La spec SSE retire un unique espace après les deux-points.
      dataLines.push(line.slice('data:'.length).replace(/^ /, ''))
    }
  }

  if (dataLines.length === 0) return null

  const raw = dataLines.join('\n')
  let data: unknown = raw
  try {
    data = JSON.parse(raw)
  } catch {
    // Donnée non-JSON : on conserve la string brute.
  }
  return { event, data }
}
