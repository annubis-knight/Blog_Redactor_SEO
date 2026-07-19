import { describe, it, expect } from 'vitest'
import { planResume } from '../../../../scripts/auto-article/resume-plan.js'
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
