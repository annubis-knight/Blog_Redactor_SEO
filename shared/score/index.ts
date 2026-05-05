/**
 * Module shared/score/ — API publique unifiée pour le scoring (S3.1).
 *
 * **Cette indirection est l'UNIQUE point d'entrée légitime** pour le code
 * qui consomme des scores (composables, composants, services). Elle fait
 * trois promesses :
 *
 * 1. Le type `Score = number | null` rend l'absence explicite.
 * 2. `formatScore` + `compareScores` partagent la même expression — plus
 *    de divergence affichage / tri (CLAUDE.md §2.0).
 * 3. Les agrégats (`averageScores`, etc.) ignorent les `null` au lieu de
 *    les remplacer silencieusement par 0.
 *
 * **Anti-règle ESLint** active : `?? 0` sur une variable `*Score*` est
 * interdit (cf. .oxlintrc.json). Utiliser `compareScores` ou laisser `null`.
 *
 * Migration progressive : les anciens fichiers `shared/scoring.ts`,
 * `shared/scoring-kpi.ts`, `shared/kpi-scoring.ts` continuent de
 * fonctionner et seront migrés au gré des touches.
 */

export type { Score, ScoreVerdict, Scored } from './types.js'
export {
  formatScore,
  formatVolume,
  formatCpc,
  formatKd,
  formatPercent,
  SCORE_PLACEHOLDER,
} from './format.js'
export { compareScores, compareScoresAsc } from './compare.js'
export { averageScores, maxScore, minScore, countValidScores } from './aggregate.js'
