// @vitest-environment node
/**
 * Tests de coherence pour completed-checks data flow.
 * Verifie que les checks utilisent les constantes (pas de strings hardcodees)
 * et que les producteurs ecrivent avec les memes prefixes que les consommateurs lisent.
 *
 * Voir docs/data-flows/completed-checks.md pour la cartographie complete.
 */
import { describe, it, expect } from 'vitest'
import {
  MOTEUR_CHECKS,
  CERVEAU_CHECKS,
  REDACTION_CHECKS,
  ALL_WORKFLOW_CHECKS,
  MOTEUR_DISCOVERY_DONE,
  MOTEUR_RADAR_DONE,
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_LIEUTENANTS_LOCKED,
  MOTEUR_LEXIQUE_VALIDATED,
  CERVEAU_STRATEGY_DEFINED,
  CERVEAU_HIERARCHY_BUILT,
  CERVEAU_ARTICLES_PROPOSED,
  REDACTION_BRIEF_VALIDATED,
  REDACTION_OUTLINE_VALIDATED,
  REDACTION_CONTENT_WRITTEN,
  REDACTION_SEO_VALIDATED,
  REDACTION_PUBLISHED,
} from '../../../shared/constants/workflow-checks.constants.js'

// =====================================================
// FR-MOT-CHECKS — namespace par workflow
// =====================================================

describe('FR-MOT-CHECKS / FR-CER-CHECKS / FR-RED-CHECKS — namespace par workflow', () => {
  it('tous les checks Moteur ont le prefixe "moteur:"', () => {
    MOTEUR_CHECKS.forEach(check => {
      expect(check.startsWith('moteur:')).toBe(true)
    })
  })

  it('tous les checks Cerveau ont le prefixe "cerveau:"', () => {
    CERVEAU_CHECKS.forEach(check => {
      expect(check.startsWith('cerveau:')).toBe(true)
    })
  })

  it('tous les checks Redaction ont le prefixe "redaction:"', () => {
    REDACTION_CHECKS.forEach(check => {
      expect(check.startsWith('redaction:')).toBe(true)
    })
  })

  it('aucune collision de noms entre workflows (namespaces disjoints)', () => {
    const all = ALL_WORKFLOW_CHECKS
    const unique = new Set(all)
    expect(unique.size).toBe(all.length)
  })

  it('les 3 listes couvrent ALL_WORKFLOW_CHECKS', () => {
    const sum = MOTEUR_CHECKS.length + CERVEAU_CHECKS.length + REDACTION_CHECKS.length
    expect(ALL_WORKFLOW_CHECKS.length).toBe(sum)
  })
})

// =====================================================
// FR-MOT-CHECKS-CONSTANTS — constantes vs strings
// =====================================================

describe('FR-MOT-CHECKS-CONSTANTS — valeurs canoniques attendues', () => {
  it('MOTEUR_DISCOVERY_DONE = "moteur:discovery_done"', () => {
    expect(MOTEUR_DISCOVERY_DONE).toBe('moteur:discovery_done')
  })

  it('MOTEUR_RADAR_DONE = "moteur:radar_done"', () => {
    expect(MOTEUR_RADAR_DONE).toBe('moteur:radar_done')
  })

  it('MOTEUR_CAPITAINE_LOCKED = "moteur:capitaine_locked"', () => {
    expect(MOTEUR_CAPITAINE_LOCKED).toBe('moteur:capitaine_locked')
  })

  it('MOTEUR_LIEUTENANTS_LOCKED = "moteur:lieutenants_locked"', () => {
    expect(MOTEUR_LIEUTENANTS_LOCKED).toBe('moteur:lieutenants_locked')
  })

  it('MOTEUR_LEXIQUE_VALIDATED = "moteur:lexique_validated"', () => {
    expect(MOTEUR_LEXIQUE_VALIDATED).toBe('moteur:lexique_validated')
  })

  it('CERVEAU_STRATEGY_DEFINED = "cerveau:strategy_defined"', () => {
    expect(CERVEAU_STRATEGY_DEFINED).toBe('cerveau:strategy_defined')
  })

  it('CERVEAU_HIERARCHY_BUILT = "cerveau:hierarchy_built"', () => {
    expect(CERVEAU_HIERARCHY_BUILT).toBe('cerveau:hierarchy_built')
  })

  it('CERVEAU_ARTICLES_PROPOSED = "cerveau:articles_proposed"', () => {
    expect(CERVEAU_ARTICLES_PROPOSED).toBe('cerveau:articles_proposed')
  })

  it('REDACTION_BRIEF_VALIDATED = "redaction:brief_validated"', () => {
    expect(REDACTION_BRIEF_VALIDATED).toBe('redaction:brief_validated')
  })

  it('REDACTION_OUTLINE_VALIDATED = "redaction:outline_validated"', () => {
    expect(REDACTION_OUTLINE_VALIDATED).toBe('redaction:outline_validated')
  })

  it('REDACTION_CONTENT_WRITTEN = "redaction:content_written"', () => {
    expect(REDACTION_CONTENT_WRITTEN).toBe('redaction:content_written')
  })

  it('REDACTION_SEO_VALIDATED = "redaction:seo_validated"', () => {
    expect(REDACTION_SEO_VALIDATED).toBe('redaction:seo_validated')
  })

  it('REDACTION_PUBLISHED = "redaction:published"', () => {
    expect(REDACTION_PUBLISHED).toBe('redaction:published')
  })
})

// =====================================================
// NFR-INT-COMPLETED-CHECKS-SSOT — source unique de verite
// =====================================================

describe('NFR-INT-COMPLETED-CHECKS-SSOT — TEXT[] unique flat', () => {
  it('tous les workflows partagent la meme structure (string[])', () => {
    const all: readonly string[] = ALL_WORKFLOW_CHECKS
    all.forEach(check => {
      expect(typeof check).toBe('string')
      expect(check).toMatch(/^(moteur|cerveau|redaction):[a-z_]+$/)
    })
  })

  it('format snake_case apres le prefixe', () => {
    ALL_WORKFLOW_CHECKS.forEach(check => {
      const [, suffix] = check.split(':')
      expect(suffix).toMatch(/^[a-z]+(_[a-z]+)*$/)
    })
  })
})

// =====================================================
// Reload coherence (placeholder)
// =====================================================

describe('FR-MOT-CHECKS — reload coherence (placeholder)', () => {
  it.todo('store Pinia article-progress refleche exactement DB articles.completed_checks')
  it.todo('addCheck idempotent : ajouter 2x le meme check ne le duplique pas')
  it.todo('removeCheck idempotent : retirer un check absent ne genere pas erreur')
})
