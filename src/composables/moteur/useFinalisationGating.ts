/**
 * Bloc 2 (mai 2026) — Gating du bouton "Continuer vers la Rédaction".
 *
 * Le bouton est actif uniquement quand les 3 verrous Phase ② du Moteur
 * sont posés (Capitaine + Lieutenants + Lexique). Le tooltip natif HTML
 * liste les checks manquants pour que l'utilisateur sache quoi faire.
 *
 * Extrait dans un module pur pour rester testable sans monter MoteurView.
 */

export interface FinalisationChecks {
  capitaineLocked: boolean
  lieutenantsLocked: boolean
  lexiqueValidated: boolean
}

export function isFinalisationUnlocked(checks: FinalisationChecks): boolean {
  return checks.capitaineLocked && checks.lieutenantsLocked && checks.lexiqueValidated
}

export function finalisationMissingChecks(checks: FinalisationChecks): string[] {
  const missing: string[] = []
  if (!checks.capitaineLocked) missing.push('Capitaine à verrouiller')
  if (!checks.lieutenantsLocked) missing.push('Lieutenants à verrouiller')
  if (!checks.lexiqueValidated) missing.push('Lexique à valider')
  return missing
}

export function finalisationButtonTitle(checks: FinalisationChecks): string {
  return isFinalisationUnlocked(checks)
    ? 'Continuer vers la Rédaction'
    : `Étapes restantes : ${finalisationMissingChecks(checks).join(', ')}`
}
