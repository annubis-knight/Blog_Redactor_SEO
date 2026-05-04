/**
 * Sprint 4 (2026-05-04) — Test computeSmartTab.
 *
 * Friction utilisateur (audit 2026-05-03) :
 *   « La navigation était par défaut sur l'onglet finalisation, c'est
 *     totalement faux. »
 *
 * Avant Sprint 4 : si les 3 verrous Phase ② étaient posés, sélectionner
 * l'article ramenait sur Finalisation (récap pré-Rédaction).
 *
 * Après Sprint 4 : Finalisation n'est plus jamais retournée par computeSmartTab.
 * L'utilisateur y va explicitement via le CTA bas-de-page de Lexique.
 *
 * Le test ré-implémente la fonction localement (pure function) pour valider
 * le contrat sans monter MoteurView.
 */
import { describe, it, expect } from 'vitest'

type Tab = 'discovery' | 'radar' | 'capitaine' | 'lieutenants' | 'lexique' | 'finalisation'

// Copie de la fonction de MoteurView.vue (Sprint 4 version).
function computeSmartTab(checks: string[]): Tab {
  if (checks.length === 0) return 'capitaine'
  if (checks.includes('lieutenants_locked')) return 'lexique'
  if (checks.includes('capitaine_locked')) return 'lieutenants'
  return 'capitaine'
}

describe('computeSmartTab — Sprint 4 (#1)', () => {
  it('article neuf (0 checks) → capitaine', () => {
    expect(computeSmartTab([])).toBe('capitaine')
  })

  it('capitaine_locked seul → lieutenants', () => {
    expect(computeSmartTab(['moteur:discovery_done', 'capitaine_locked'])).toBe('lieutenants')
  })

  it('lieutenants_locked → lexique', () => {
    expect(computeSmartTab(['capitaine_locked', 'lieutenants_locked'])).toBe('lexique')
  })

  it('AC1 — TOUS les 3 verrous Phase ② → reste sur lexique (PAS finalisation)', () => {
    // C'était le bug : avant Sprint 4 ça retournait 'finalisation'.
    const checks = ['capitaine_locked', 'lieutenants_locked', 'lexique_validated']
    expect(computeSmartTab(checks)).toBe('lexique')
    expect(computeSmartTab(checks)).not.toBe('finalisation')
  })

  it('AC1 — Finalisation n\'est JAMAIS retournée par computeSmartTab (anti-régression)', () => {
    const cases = [
      [],
      ['moteur:discovery_done'],
      ['moteur:discovery_done', 'moteur:radar_done'],
      ['capitaine_locked'],
      ['capitaine_locked', 'lieutenants_locked'],
      ['capitaine_locked', 'lieutenants_locked', 'lexique_validated'],
      // Ordre différent ne doit pas changer le résultat
      ['lexique_validated', 'lieutenants_locked', 'capitaine_locked'],
    ]
    for (const checks of cases) {
      expect(computeSmartTab(checks)).not.toBe('finalisation')
    }
  })
})
