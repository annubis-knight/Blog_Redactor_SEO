/**
 * Anti-régression du nettoyage des fixtures de test.
 *
 * Contexte (audit 2026-09-19) : le nettoyage ne cherchait que le TITRE tagué
 * `[test:<runId>]`. Un test qui renomme un article (PATCH /articles/:id) lui
 * faisait perdre ce tag → l'article survivait. 28 articles « Renamed … »
 * s'étaient ainsi accumulés dans la base de développement.
 *
 * Le slug, lui, n'est jamais modifié : il sert désormais de seconde clé.
 */
import { describe, it, expect } from 'vitest'
import { parseTimestampFromSlug, testSlugPattern } from '../../helpers/db-fixtures'

describe('testSlugPattern', () => {
  it('cible tous les slugs du run, et eux seuls', () => {
    expect(testSlugPattern('1758300000000-ab12cd')).toBe('test-1758300000000-ab12cd-%')
  })
})

describe('parseTimestampFromSlug', () => {
  it('extrait l’horodatage d’un slug de test', () => {
    expect(parseTimestampFromSlug('test-1758300000000-ab12cd-article-1758300000001-x9')).toBe(
      1758300000000,
    )
  })

  it('reconnaît un slug de test même après renommage du titre', () => {
    // Cas réel : le titre devient « Renamed 1784496184893-4drnss », le slug reste
    expect(parseTimestampFromSlug('test-1784496184893-4drnss-patch-article-1784496184900-aa')).toBe(
      1784496184893,
    )
  })

  describe('garde-fou : ne jamais viser une row utilisateur', () => {
    const REAL_SLUGS = [
      'dominer-google-local-a-toulouse-le-guide-complet',
      'test-de-grossesse-prix', // commence par « test » mais n'est pas un slug de test
      'testeur-de-site-web',
      'creation-site-web-toulouse',
      '',
    ]

    for (const slug of REAL_SLUGS) {
      it(`ignore « ${slug || '(vide)'} »`, () => {
        expect(parseTimestampFromSlug(slug)).toBeNull()
      })
    }
  })

  it('exige un horodatage plausible (≥ 10 chiffres)', () => {
    expect(parseTimestampFromSlug('test-123-abc-article')).toBeNull()
  })
})
