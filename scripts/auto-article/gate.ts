/**
 * Gates de validation humaine.
 *
 * `parseGateInput` est **pure** (string → décision) et testée. `promptGate`
 * enrobe l'interactivité readline autour d'elle.
 */

import type { GateDecision, GateName } from './types.js'

const VALIDATE = new Set(['', 'v', 'valider', 'validate', 'o', 'oui', 'y', 'yes'])
const ABORT = new Set(['a', 'abandonner', 'abort', 'q', 'quit'])
const REGENERATE = new Set(['r', 'régénérer', 'regenerer', 'regen', 'regenerate'])
const EDIT = new Set(['e', 'éditer', 'editer', 'edit'])
const RERUN = new Set(['r', 'relancer', 'rerun', 'relance'])

/**
 * Traduit la saisie brute en décision. Retourne `null` si non reconnue
 * (l'appelant re-demandera). Entrée vide = validate (choix par défaut sûr :
 * l'utilisateur a lu le récap et appuie sur Entrée pour continuer).
 */
export function parseGateInput(raw: string, gate: GateName): GateDecision | null {
  const v = raw.trim().toLowerCase()

  if (VALIDATE.has(v)) return 'validate'
  if (ABORT.has(v)) return 'abort'

  if (gate === 'gate1') {
    if (REGENERATE.has(v)) return 'regenerate'
    if (EDIT.has(v)) return 'edit'
  } else {
    if (RERUN.has(v)) return 'rerun'
  }

  return null
}

/** Libellé des options proposées à chaque gate. */
export function gatePromptLabel(gate: GateName): string {
  return gate === 'gate1'
    ? '[Entrée] valider · [e] changer l\'emplacement · [r] régénérer · [a] abandonner'
    : '[Entrée] valider · [r] relancer le Moteur · [a] abandonner'
}
