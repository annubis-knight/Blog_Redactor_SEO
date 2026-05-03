import { describe, it, expect } from 'vitest'
import {
  isFinalisationUnlocked,
  finalisationMissingChecks,
  finalisationButtonTitle,
} from '../../../src/composables/moteur/useFinalisationGating'

/**
 * Tests du gating "Continuer vers la Rédaction" (Bloc 2 du plan moteur).
 *
 * Verrouille les invariants :
 *   - Bouton actif UNIQUEMENT si les 3 checks Phase ② sont posés
 *   - Tooltip liste précisément ce qui manque pour guider l'utilisateur
 */

describe('isFinalisationUnlocked — Bloc 2', () => {
  it('returns false sur tout false', () => {
    expect(isFinalisationUnlocked({
      capitaineLocked: false,
      lieutenantsLocked: false,
      lexiqueValidated: false,
    })).toBe(false)
  })

  it('returns false si Capitaine seulement', () => {
    expect(isFinalisationUnlocked({
      capitaineLocked: true,
      lieutenantsLocked: false,
      lexiqueValidated: false,
    })).toBe(false)
  })

  it('returns false si Capitaine + Lieutenants mais pas Lexique', () => {
    expect(isFinalisationUnlocked({
      capitaineLocked: true,
      lieutenantsLocked: true,
      lexiqueValidated: false,
    })).toBe(false)
  })

  it('returns true uniquement quand les 3 sont true', () => {
    expect(isFinalisationUnlocked({
      capitaineLocked: true,
      lieutenantsLocked: true,
      lexiqueValidated: true,
    })).toBe(true)
  })
})

describe('finalisationMissingChecks — Bloc 2', () => {
  it('liste les 3 checks manquants si tout false', () => {
    const m = finalisationMissingChecks({
      capitaineLocked: false,
      lieutenantsLocked: false,
      lexiqueValidated: false,
    })
    expect(m).toEqual([
      'Capitaine à verrouiller',
      'Lieutenants à verrouiller',
      'Lexique à valider',
    ])
  })

  it('liste vide quand tout est verrouillé', () => {
    const m = finalisationMissingChecks({
      capitaineLocked: true,
      lieutenantsLocked: true,
      lexiqueValidated: true,
    })
    expect(m).toEqual([])
  })

  it('indique uniquement Lexique quand seul Lexique manque', () => {
    const m = finalisationMissingChecks({
      capitaineLocked: true,
      lieutenantsLocked: true,
      lexiqueValidated: false,
    })
    expect(m).toEqual(['Lexique à valider'])
  })
})

describe('finalisationButtonTitle — Bloc 2', () => {
  it('renvoie le titre simple quand tout est verrouillé', () => {
    const title = finalisationButtonTitle({
      capitaineLocked: true,
      lieutenantsLocked: true,
      lexiqueValidated: true,
    })
    expect(title).toBe('Continuer vers la Rédaction')
  })

  it('renvoie un tooltip listant les étapes manquantes', () => {
    const title = finalisationButtonTitle({
      capitaineLocked: false,
      lieutenantsLocked: true,
      lexiqueValidated: false,
    })
    expect(title).toContain('Étapes restantes')
    expect(title).toContain('Capitaine à verrouiller')
    expect(title).toContain('Lexique à valider')
    expect(title).not.toContain('Lieutenants')
  })
})
