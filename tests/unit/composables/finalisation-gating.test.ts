import { describe, it, expect } from 'vitest'
import {
  isFinalisationUnlocked,
  finalisationMissingChecks,
  finalisationButtonTitle,
  type FinalisationChecks,
} from '../../../src/composables/moteur/useFinalisationGating'

/**
 * Tests du gating "Continuer vers la Rédaction" (Bloc 2 du plan moteur,
 * FR-HN-TAB : la Structure Hn devient le 4ᵉ verrou de la phase ②).
 *
 * Verrouille les invariants :
 *   - Bouton actif UNIQUEMENT si les 4 verrous Phase ② sont posés
 *     (Capitaine + Lieutenants + Structure + Lexique)
 *   - Tooltip liste précisément ce qui manque pour guider l'utilisateur
 */

const ALL_LOCKED: FinalisationChecks = {
  capitaineLocked: true,
  lieutenantsLocked: true,
  structureLocked: true,
  lexiqueValidated: true,
}

const NONE_LOCKED: FinalisationChecks = {
  capitaineLocked: false,
  lieutenantsLocked: false,
  structureLocked: false,
  lexiqueValidated: false,
}

describe('isFinalisationUnlocked — Bloc 2', () => {
  it('returns false sur tout false', () => {
    expect(isFinalisationUnlocked(NONE_LOCKED)).toBe(false)
  })

  it('returns false si Capitaine seulement', () => {
    expect(isFinalisationUnlocked({ ...NONE_LOCKED, capitaineLocked: true })).toBe(false)
  })

  it('returns false si Capitaine + Lieutenants + Structure mais pas Lexique', () => {
    expect(isFinalisationUnlocked({ ...ALL_LOCKED, lexiqueValidated: false })).toBe(false)
  })

  it('FR-HN-TAB — returns false si tout est posé sauf la Structure', () => {
    expect(isFinalisationUnlocked({ ...ALL_LOCKED, structureLocked: false })).toBe(false)
  })

  it('returns true uniquement quand les 4 sont true', () => {
    expect(isFinalisationUnlocked(ALL_LOCKED)).toBe(true)
  })
})

describe('finalisationMissingChecks — Bloc 2', () => {
  it('liste les 4 checks manquants si tout false, dans l’ordre des onglets', () => {
    expect(finalisationMissingChecks(NONE_LOCKED)).toEqual([
      'Capitaine à verrouiller',
      'Lieutenants à verrouiller',
      'Structure à valider',
      'Lexique à valider',
    ])
  })

  it('liste vide quand tout est verrouillé', () => {
    expect(finalisationMissingChecks(ALL_LOCKED)).toEqual([])
  })

  it('indique uniquement Lexique quand seul Lexique manque', () => {
    expect(finalisationMissingChecks({ ...ALL_LOCKED, lexiqueValidated: false })).toEqual(['Lexique à valider'])
  })

  it('FR-HN-TAB — indique uniquement Structure quand seule la Structure manque', () => {
    expect(finalisationMissingChecks({ ...ALL_LOCKED, structureLocked: false })).toEqual(['Structure à valider'])
  })
})

describe('finalisationButtonTitle — Bloc 2', () => {
  it('renvoie le titre simple quand tout est verrouillé', () => {
    expect(finalisationButtonTitle(ALL_LOCKED)).toBe('Continuer vers la Rédaction')
  })

  it('renvoie un tooltip listant les étapes manquantes', () => {
    const title = finalisationButtonTitle({
      capitaineLocked: false,
      lieutenantsLocked: true,
      structureLocked: false,
      lexiqueValidated: false,
    })
    expect(title).toContain('Étapes restantes')
    expect(title).toContain('Capitaine à verrouiller')
    expect(title).toContain('Structure à valider')
    expect(title).toContain('Lexique à valider')
    expect(title).not.toContain('Lieutenants')
  })
})
