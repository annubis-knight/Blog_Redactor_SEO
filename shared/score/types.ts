/**
 * Module shared/score/ — types unifiés pour le scoring (S3.1).
 *
 * Le type `Score` est volontairement `number | null` pour rendre
 * **explicite** l'absence de valeur. Plus jamais de `?? 0` qui fausse les
 * agrégats et désynchronise affichage / tri (cf. CLAUDE.md §2.0).
 */

/**
 * Score nominal entre 0 et 100, ou null quand la valeur n'est pas calculable.
 *
 * @example
 *   const s: Score = 84
 *   const missing: Score = null  // l'utilisateur verra "—" et le tri placera l'item en bas
 */
export type Score = number | null

/**
 * Verdict tricolore associé à un score (palette commune Capitaine + Radar).
 */
export type ScoreVerdict = 'GO' | 'PROCEED_WITH_CAUTION' | 'NO_GO'

/**
 * Carte minimaliste portant un score (utilisée par formatScore / compareScores).
 * Permet d'écrire des helpers génériques qui marchent indifféremment sur
 * un score brut ou un objet l'enveloppant.
 */
export interface Scored {
  total: Score
}
