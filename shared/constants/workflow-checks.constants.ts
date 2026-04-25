/**
 * Centralized catalog of workflow-scoped progression checks.
 *
 * Each check is prefixed by the workflow it belongs to (`moteur:*`, `cerveau:*`,
 * `redaction:*`) so the same flat `articles.completed_checks` TEXT[] column can
 * safely host checks from all three workflows without name collisions.
 *
 * Rules:
 * - Always write and read via these constants — never hardcode the raw string.
 * - Adding a new check: add the constant + update the corresponding workflow array.
 * - Removing a check requires a data migration if it was ever persisted.
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

// --- Cerveau workflow (stratégie de cocon) ---
export const CERVEAU_STRATEGY_DEFINED = 'cerveau:strategy_defined'
export const CERVEAU_HIERARCHY_BUILT = 'cerveau:hierarchy_built'
export const CERVEAU_ARTICLES_PROPOSED = 'cerveau:articles_proposed'

export const CERVEAU_CHECKS = [
  CERVEAU_STRATEGY_DEFINED,
  CERVEAU_HIERARCHY_BUILT,
  CERVEAU_ARTICLES_PROPOSED,
] as const

// --- Rédaction workflow (brief + éditeur + publication) ---
export const REDACTION_BRIEF_VALIDATED = 'redaction:brief_validated'
export const REDACTION_OUTLINE_VALIDATED = 'redaction:outline_validated'
export const REDACTION_CONTENT_WRITTEN = 'redaction:content_written'
export const REDACTION_SEO_VALIDATED = 'redaction:seo_validated'
export const REDACTION_PUBLISHED = 'redaction:published'

export const REDACTION_CHECKS = [
  REDACTION_BRIEF_VALIDATED,
  REDACTION_OUTLINE_VALIDATED,
  REDACTION_CONTENT_WRITTEN,
  REDACTION_SEO_VALIDATED,
  REDACTION_PUBLISHED,
] as const

// --- Aggregate ---
export const ALL_WORKFLOW_CHECKS = [
  ...MOTEUR_CHECKS,
  ...CERVEAU_CHECKS,
  ...REDACTION_CHECKS,
] as const

export type WorkflowCheck = typeof ALL_WORKFLOW_CHECKS[number]
