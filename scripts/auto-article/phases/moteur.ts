/**
 * Phase 2 — Moteur : orchestre Explorer (Story 3) puis Valider (Story 4).
 */

import type { PhaseFn } from '../orchestrator.js'
import type { PhaseDeps } from '../deps.js'
import { makeMoteurExplorer } from './moteur-explorer.js'
import { makeMoteurValider } from './moteur-valider.js'

export function makeMoteurPhase(deps: PhaseDeps): PhaseFn {
  const explorer = makeMoteurExplorer(deps)
  const valider = makeMoteurValider(deps)

  return async (ctx) => {
    deps.logger.phase('Phase 2 — Moteur')
    if (ctx.resume.skipMoteur) {
      deps.logger.dim('reprise : mots-clés déjà validés — Moteur ignoré')
      deps.report.addStep('Moteur (repris)')
      return
    }
    await explorer(ctx)
    await valider(ctx)
  }
}
