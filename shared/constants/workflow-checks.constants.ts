/**
 * Centralized catalog of workflow-scoped progression checks.
 *
 * Only the Moteur workflow emits checks (5 constants). The Cerveau (3) and
 * Rédaction (5) families were removed on 2026-05-13 (cf. DRIFT-002) after the
 * product decision that progress in those two workflows is better surfaced
 * directly via business state (`article_strategies.completed_steps` INTEGER
 * for Cerveau ; article content presence / brief presence for Rédaction)
 * rather than via opaque workflow checks.
 *
 * Rules:
 * - Always write and read via these constants — never hardcode the raw string.
 * - Adding a new Moteur check: add the constant + push it to `MOTEUR_CHECKS`.
 * - Legacy `cerveau:*` / `redaction:*` values that may still sit on old rows
 *   in `articles.completed_checks` are tolerated on read (silently ignored
 *   by consumers like `ProgressDots.vue`) but never emitted anymore.
 */

// --- Moteur workflow (5 checks) ---
export const MOTEUR_DISCOVERY_DONE = 'moteur:discovery_done'
export const MOTEUR_RADAR_DONE = 'moteur:radar_done'
export const MOTEUR_CAPITAINE_LOCKED = 'moteur:capitaine_locked'
export const MOTEUR_LIEUTENANTS_LOCKED = 'moteur:lieutenants_locked'
export const MOTEUR_LEXIQUE_VALIDATED = 'moteur:lexique_validated'

export const MOTEUR_CHECKS = [
  MOTEUR_DISCOVERY_DONE,
  MOTEUR_RADAR_DONE,
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_LIEUTENANTS_LOCKED,
  MOTEUR_LEXIQUE_VALIDATED,
] as const

// --- Aggregate ---
export const ALL_WORKFLOW_CHECKS = [...MOTEUR_CHECKS] as const

export type WorkflowCheck = typeof ALL_WORKFLOW_CHECKS[number]
