import { describe, it, expect } from 'vitest'
import { applyForcedCapitaine, planResume } from '../../../../scripts/auto-article/resume-plan.js'
import { fromCanonicalType, toCanonicalType } from '../../../../scripts/auto-article/canonical.js'
import { MOTEUR_LEXIQUE_VALIDATED, MOTEUR_CAPITAINE_LOCKED } from '../../../../shared/constants/workflow-checks.constants.js'

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

  it('Moteur complet (lexique validé + capitaine) → skip Moteur', () => {
    expect(planResume({ checks: [MOTEUR_LEXIQUE_VALIDATED], capitaine: 'kw', hasContent: false, hasStrategy: true }).skipMoteur).toBe(true)
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
