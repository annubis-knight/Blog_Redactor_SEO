/**
 * Décision PURE de reprise : à partir de l'état persisté d'un article, quelles
 * phases sauter. Utilise la constante `MOTEUR_LEXIQUE_VALIDATED` (jamais la
 * string en dur) comme marqueur de complétion du Moteur.
 */

import { MOTEUR_HN_LOCKED, MOTEUR_LEXIQUE_VALIDATED } from '../../shared/constants/workflow-checks.constants.js'

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
    // Le Moteur est fini quand la structure ET le lexique sont validés (FR-HN-TAB) :
    // un article d'avant C6, sans structure validée, repasse par le Moteur.
    skipMoteur: s.checks.includes(MOTEUR_HN_LOCKED) && s.checks.includes(MOTEUR_LEXIQUE_VALIDATED) && !!s.capitaine,
    skipRedaction: s.hasContent,
  }
}

/**
 * Un Capitaine imposé qui diffère du Capitaine en base invalide tout ce qui en
 * découle : Lieutenants, Lexique et structure viennent de SA page de résultats,
 * et le texte a été écrit pour lui. On refait donc Moteur ET Rédaction.
 * Imposer le Capitaine déjà en place ne change rien.
 */
export function applyForcedCapitaine(
  skips: ResumeSkips,
  stored: string | null,
  forced: string | null,
): ResumeSkips {
  if (!forced) return skips
  const same = (stored ?? '').trim().toLowerCase() === forced.trim().toLowerCase()
  if (same) return skips
  return { ...skips, skipMoteur: false, skipRedaction: false }
}
