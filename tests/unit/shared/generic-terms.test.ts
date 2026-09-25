// @vitest-environment node
/**
 * FR-LEX-METIER-ONLY — ce qui n'est pas du vocabulaire métier.
 *
 * Le lexique du pilier 1013 contenait « être », « votre », « vos » : le
 * calcul comparait les mots AVEC leurs accents à une liste écrite SANS
 * (« etre »), et la liste était incomplète. Les pages concurrentes lui
 * apportaient aussi leurs menus et bandeaux cookies.
 */
import { describe, it, expect } from 'vitest'
import { isGenericTerm, normalizeTerm, splitGenericTerms } from '../../../shared/utils/generic-terms.js'

describe('isGenericTerm — mots vides et bruit de page, avec ou sans accent', () => {
  it.each(['être', 'Être', 'etre', 'même', 'très', 'vos', 'nos', 'votre', 'chaque', 'comment', 'voir', 'cela', 'permet', 'faut'])(
    '« %s » est un mot vide', (mot) => {
      expect(isGenericTerm(mot)).toBe(true)
    },
  )

  it.each(['cookies', 'Cookie', 'mentions', 'légales', 'newsletter', 'accueil', 'facebook', 'confidentialité'])(
    '« %s » vient du décor de la page, pas du métier', (mot) => {
      expect(isGenericTerm(mot)).toBe(true)
    },
  )

  it.each(['laine soufflée', 'pare-vapeur', 'résistance thermique', 'isolation', 'site internet', 'devis', 'combles'])(
    '« %s » est du vocabulaire métier', (terme) => {
      expect(isGenericTerm(terme)).toBe(false)
    },
  )

  it('un terme de plusieurs mots n’est générique que si TOUS ses mots le sont', () => {
    expect(isGenericTerm('vos cookies')).toBe(true)
    expect(isGenericTerm('vos combles')).toBe(false)
  })

  it('les nombres et les mots de moins de 3 lettres ne font pas un lexique', () => {
    expect(isGenericTerm('2026')).toBe(true)
    expect(isGenericTerm('m2')).toBe(true)
    expect(isGenericTerm('')).toBe(true)
  })

  it('normalizeTerm ignore la casse et les accents', () => {
    expect(normalizeTerm('  Être  ')).toBe('etre')
    expect(normalizeTerm('Soufflée')).toBe('soufflee')
  })
})

// M15 — un lexique qui entre sans passer par le Moteur (suggestion de l'IA,
// ajout depuis la Rédaction) est trié par la même source.
describe('splitGenericTerms', () => {
  it('sépare les termes du métier des mots génériques', () => {
    expect(splitGenericTerms(['garantie décennale', 'être', 'vos', 'isolation des combles', 'cookies']))
      .toEqual({ kept: ['garantie décennale', 'isolation des combles'], rejected: ['être', 'vos', 'cookies'] })
  })

  it('nettoie les espaces et dédoublonne sans tenir compte des accents ni de la casse', () => {
    expect(splitGenericTerms(['  Isolation   combles ', 'isolation combles', 'ÊTRE', 'etre', '']))
      .toEqual({ kept: ['Isolation combles'], rejected: ['ÊTRE'] })
  })
})
