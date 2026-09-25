// @vitest-environment node
/**
 * FR-LEX-METIER-ONLY — porte « valider le lexique ».
 *
 * 🔴 un lexique vide demande une raison ; 🔴 un terme générique (mot vide ou
 * décor de page) demande une raison ; un lexique de métier passe.
 */
import { describe, it, expect } from 'vitest'
import { verifyLexique } from '../../../shared/verifiers/lexique.js'

describe('verifyLexique', () => {
  it('🔴 un lexique vide : assumable, pas un défaut technique', () => {
    const issues = verifyLexique({ terms: [] })
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ rule: 'lexique-empty', level: 'risque' })
  })

  it('🔴 chaque terme générique a sa propre alerte (une dérogation par terme)', () => {
    const issues = verifyLexique({ terms: ['votre', 'pare-vapeur', 'Cookies', 'Être'] })
    expect(issues.map(i => i.rule)).toEqual([
      'lexique-generic-term:votre',
      'lexique-generic-term:cookies',
      'lexique-generic-term:etre',
    ])
    expect(issues.every(i => i.level === 'risque')).toBe(true)
    expect(issues[0]!.message).toContain('« votre »')
  })

  it('un lexique de métier passe sans alerte', () => {
    expect(verifyLexique({ terms: ['laine soufflée', 'résistance thermique', 'pare-vapeur'] })).toEqual([])
  })
})
