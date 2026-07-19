/**
 * Décision PURE de reprise : à partir de l'état persisté d'un article, quelles
 * phases sauter. Utilise la constante `MOTEUR_LEXIQUE_VALIDATED` (jamais la
 * string en dur) comme marqueur de complétion du Moteur.
 */

import { MOTEUR_LEXIQUE_VALIDATED } from '../../shared/constants/workflow-checks.constants.js'

export interface ResumeState {
  checks: string[]
  capitaine: string | null
  hasContent: boolean
  hasStrategy: boolean
}

export interface ResumeSkips {
  skipCerveau: boolean
  skipMoteur: boolean
  skipRedaction: boolean
}

export function planResume(s: ResumeState): ResumeSkips {
  return {
    skipCerveau: s.hasStrategy,
    skipMoteur: s.checks.includes(MOTEUR_LEXIQUE_VALIDATED) && !!s.capitaine,
    skipRedaction: s.hasContent,
  }
}
