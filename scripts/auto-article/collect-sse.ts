/**
 * Consomme une route SSE jusqu'à son événement `done` (ou `error`) : partagé par
 * les phases Moteur (structure) et Rédaction (sommaire, premier jet).
 */
import type { PhaseDeps } from './deps.js'
import type { SseEvent } from './types.js'

export async function collectSse(
  deps: PhaseDeps,
  path: string,
  body: unknown,
  onEvent?: (ev: SseEvent) => void,
): Promise<Record<string, unknown>> {
  let donePayload: Record<string, unknown> | null = null
  let errorMsg: string | null = null

  await deps.client.consumeSse(path, body, (ev) => {
    if (ev.event === 'done') donePayload = ev.data as Record<string, unknown>
    else if (ev.event === 'error') errorMsg = (ev.data as { message?: string })?.message ?? 'Erreur SSE'
    else onEvent?.(ev)
  })

  if (errorMsg) throw new Error(errorMsg)
  if (!donePayload) throw new Error(`SSE ${path} : aucun événement "done" reçu`)
  return donePayload
}
