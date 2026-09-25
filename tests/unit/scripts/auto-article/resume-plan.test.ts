import { describe, it, expect } from 'vitest'
import { applyForcedCapitaine, planResume } from '../../../../scripts/auto-article/resume-plan.js'
import { fromCanonicalType, toCanonicalType } from '../../../../scripts/auto-article/canonical.js'
import {
  MOTEUR_LEXIQUE_VALIDATED,
  MOTEUR_CAPITAINE_LOCKED,
  MOTEUR_LIEUTENANTS_LOCKED,
  MOTEUR_HN_LOCKED,
} from '../../../../shared/constants/workflow-checks.constants.js'

describe('auto:canonical — fromCanonicalType', () => {
  it('inverse de toCanonicalType (round-trip)', () => {
    for (const t of ['Pilier', 'Intermédiaire', 'Spécialisé'] as const) {
      expect(fromCanonicalType(toCanonicalType(t))).toBe(t)
    }
  })

  it('défaut Intermédiaire sur valeur inconnue', () => {
    expect(fromCanonicalType('wat')).toBe('Intermédiaire')
  })
})

describe('auto:resume-plan — planResume', () => {
  it('article neuf : rien à sauter', () => {
    expect(planResume({ checks: [], capitaine: null, hasContent: false, hasStrategy: false }))
      .toEqual({ skipCerveau: false, skipMoteur: false, skipRedaction: false })
  })

  it('stratégie présente → skip Cerveau', () => {
    expect(planResume({ checks: [], capitaine: null, hasContent: false, hasStrategy: true }).skipCerveau).toBe(true)
  })

  // FR-HN-TAB : le Moteur n'est fini que si la structure Hn ET le lexique sont validés.
  it('Moteur complet (structure + lexique validés + capitaine) → skip Moteur', () => {
    expect(planResume({ checks: [MOTEUR_HN_LOCKED, MOTEUR_LEXIQUE_VALIDATED], capitaine: 'kw', hasContent: false, hasStrategy: true }).skipMoteur).toBe(true)
  })

  it('FR-HN-TAB — article d’avant C6 (lexique validé, structure non validée) → repasse par le Moteur', () => {
    expect(planResume({
      checks: [MOTEUR_CAPITAINE_LOCKED, MOTEUR_LIEUTENANTS_LOCKED, MOTEUR_LEXIQUE_VALIDATED],
      capitaine: 'kw', hasContent: false, hasStrategy: true,
    }).skipMoteur).toBe(false)
  })

  it('FR-HN-TAB — structure validée sans lexique → ne skip pas', () => {
    expect(planResume({ checks: [MOTEUR_HN_LOCKED], capitaine: 'kw', hasContent: false, hasStrategy: true }).skipMoteur).toBe(false)
  })

  it('structure + lexique validés mais sans capitaine → ne skip pas', () => {
    expect(planResume({ checks: [MOTEUR_HN_LOCKED, MOTEUR_LEXIQUE_VALIDATED], capitaine: null, hasContent: false, hasStrategy: true }).skipMoteur).toBe(false)
  })

  it('Moteur partiel (capitaine sans lexique) → ne skip pas', () => {
    expect(planResume({ checks: [MOTEUR_CAPITAINE_LOCKED], capitaine: 'kw', hasContent: false, hasStrategy: true }).skipMoteur).toBe(false)
  })

  it('contenu présent → skip Rédaction', () => {
    expect(planResume({ checks: [], capitaine: null, hasContent: true, hasStrategy: false }).skipRedaction).toBe(true)
  })
})

// Capitaine imposé (`--capitaine`) — né du run réel du 2026-09-21 : l'heuristique
// avait retenu « site e-commerce » pour une agence qui n'en fait pas.
describe('applyForcedCapitaine', () => {
  const ALL_SKIPPED = { skipCerveau: true, skipMoteur: true, skipRedaction: true }

  it('sans Capitaine imposé → plan inchangé', () => {
    expect(applyForcedCapitaine(ALL_SKIPPED, 'site e-commerce', null)).toEqual(ALL_SKIPPED)
  })

  it('Capitaine imposé différent → refait Moteur ET Rédaction, garde le Cerveau', () => {
    expect(applyForcedCapitaine(ALL_SKIPPED, 'site e-commerce', 'création de site web Toulouse')).toEqual({
      skipCerveau: true,
      skipMoteur: false,
      skipRedaction: false,
    })
  })

  it('Capitaine imposé identique (casse et espaces ignorés) → rien à refaire', () => {
    expect(applyForcedCapitaine(ALL_SKIPPED, 'Création de site web Toulouse ', 'création de site web toulouse')).toEqual(
      ALL_SKIPPED,
    )
  })
})
