/**
 * Machine à états du pipeline auto : Cerveau → (gate1) → Moteur → (gate2) → Rédaction.
 *
 * Volontairement découplé du réseau et de l'interactivité : les phases et le
 * gate sont **injectés**. Ça rend l'enchaînement (validate / rerun / abort)
 * entièrement testable sans serveur ni stdin — c'est la zone TDD strict de la
 * Story 1.
 */

import type { AutoRunContext, GateDecision, GateName, PhaseName } from './types.js'

export type PhaseFn = (ctx: AutoRunContext) => Promise<void>

export interface OrchestratorDeps {
  runCerveau: PhaseFn
  /**
   * Écritures du Cerveau (création cocon/article + stratégie), exécutées
   * UNIQUEMENT après validation du Gate 1 : on ne crée rien tant que
   * l'emplacement proposé n'est pas accepté.
   */
  commitCerveau?: PhaseFn
  runMoteur: PhaseFn
  runRedaction: PhaseFn
  /** Demande une décision à l'utilisateur (ou script) au gate donné. */
  gate: (gate: GateName, ctx: AutoRunContext) => Promise<GateDecision>
  /** Hook d'observabilité (log CLI), optionnel. */
  onPhaseStart?: (phase: PhaseName) => void
  /** Garde-fou anti-boucle infinie sur les relances (défaut 5). */
  maxReruns?: number
}

export type PipelineStatus = 'completed' | 'aborted'

export interface PipelineOutcome {
  status: PipelineStatus
  ctx: AutoRunContext
}

export async function runPipeline(
  ctx: AutoRunContext,
  deps: OrchestratorDeps,
): Promise<PipelineOutcome> {
  const maxReruns = deps.maxReruns ?? 5

  if (!(await runPhaseWithGate('cerveau', 'gate1', ctx, deps, maxReruns))) {
    return { status: 'aborted', ctx }
  }
  await deps.commitCerveau?.(ctx)
  if (!(await runPhaseWithGate('moteur', 'gate2', ctx, deps, maxReruns))) {
    return { status: 'aborted', ctx }
  }

  deps.onPhaseStart?.('redaction')
  await deps.runRedaction(ctx)

  return { status: 'completed', ctx }
}

/**
 * Exécute une phase, puis boucle sur son gate :
 *   validate → true (on avance) ; abort → false (on arrête) ;
 *   toute autre décision → on rejoue la phase (borné par maxReruns).
 */
async function runPhaseWithGate(
  phase: Extract<PhaseName, 'cerveau' | 'moteur'>,
  gateName: GateName,
  ctx: AutoRunContext,
  deps: OrchestratorDeps,
  maxReruns: number,
): Promise<boolean> {
  const phaseFn = phase === 'cerveau' ? deps.runCerveau : deps.runMoteur
  let reruns = 0

  for (;;) {
    deps.onPhaseStart?.(phase)
    await phaseFn(ctx)

    const decision = await deps.gate(gateName, ctx)
    if (decision === 'validate') return true
    if (decision === 'abort') return false

    reruns++
    if (reruns >= maxReruns) {
      throw new Error(`Gate ${gateName} : nombre maximum de relances (${maxReruns}) atteint`)
    }
  }
}
