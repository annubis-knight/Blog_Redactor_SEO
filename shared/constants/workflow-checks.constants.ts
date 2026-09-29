/**
 * Centralized catalog of workflow-scoped progression checks.
 *
 * The Moteur workflow emits 6 checks. The Cerveau (3) and Rédaction (5)
 * families were removed on 2026-05-13 (cf. DRIFT-002) after the product
 * decision that progress in those two workflows is better surfaced directly
 * via business state (`article_strategies.completed_steps` INTEGER for
 * Cerveau ; article content presence / brief presence for Rédaction).
 *
 * C7 (épopée qualité SEO, FR-CER-PARENT-WRITTEN-GATE) brings back ONE
 * Rédaction check, `redaction:draft_accepted` : the first draft accepted by its
 * gate (`draft`). Content presence could not say it — an enriched article drifts
 * away from its target length, and an empty draft saved once counted as written.
 * It is what makes a parent « rédigé », able to give birth to its children.
 *
 * Rules:
 * - Always write and read via these constants — never hardcode the raw string.
 * - Adding a new Moteur check: add the constant + push it to `MOTEUR_CHECKS`.
 * - Legacy `cerveau:*` / `redaction:*` values that may still sit on old rows
 *   in `articles.completed_checks` are tolerated on read (silently ignored
 *   by consumers like `ProgressDots.vue`) but never emitted anymore.
 */

// --- Moteur workflow (6 checks) ---
export const MOTEUR_DISCOVERY_DONE = 'moteur:discovery_done'
export const MOTEUR_RADAR_DONE = 'moteur:radar_done'
export const MOTEUR_CAPITAINE_LOCKED = 'moteur:capitaine_locked'
export const MOTEUR_LIEUTENANTS_LOCKED = 'moteur:lieutenants_locked'
/** Structure H1/H2/H3 validée (onglet Structure, FR-HN-TAB, porte `hn-lock`). */
export const MOTEUR_HN_LOCKED = 'moteur:hn_locked'
export const MOTEUR_LEXIQUE_VALIDATED = 'moteur:lexique_validated'

export const MOTEUR_CHECKS = [
  MOTEUR_DISCOVERY_DONE,
  MOTEUR_RADAR_DONE,
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_LIEUTENANTS_LOCKED,
  MOTEUR_HN_LOCKED,
  MOTEUR_LEXIQUE_VALIDATED,
] as const

/**
 * Étapes bâties sur les données d'une autre : retirer celle-ci les retire
 * aussi. La structure est construite sur le capitaine et les lieutenants
 * retenus ; s'ils changent, elle est à revalider. Avant cela, l'étape
 * Structure restait accordée sur des données périmées, et seule la
 * publication le voyait (M19).
 */
const CHECK_DEPENDENTS: Readonly<Record<string, readonly string[]>> = {
  [MOTEUR_CAPITAINE_LOCKED]: [MOTEUR_HN_LOCKED],
  [MOTEUR_LIEUTENANTS_LOCKED]: [MOTEUR_HN_LOCKED],
}

/** L'étape retirée, suivie des étapes qui en dépendent. */
export function checksRemovedWith(check: string): string[] {
  return [check, ...(CHECK_DEPENDENTS[check] ?? [])]
}

// --- Rédaction (1 check, C7) ---
/** Premier jet accepté par sa porte (`draft`) : l'article compte comme rédigé. */
export const REDACTION_DRAFT_ACCEPTED = 'redaction:draft_accepted'

export const REDACTION_CHECKS = [REDACTION_DRAFT_ACCEPTED] as const

// --- Aggregate ---
export const ALL_WORKFLOW_CHECKS = [...MOTEUR_CHECKS, ...REDACTION_CHECKS] as const

export type WorkflowCheck = typeof ALL_WORKFLOW_CHECKS[number]
