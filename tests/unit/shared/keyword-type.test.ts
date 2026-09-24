// @vitest-environment node
/**
 * FR-INFRA-KEYWORDS-SEO — le type d'un mot-clé du pool se lit quel que soit
 * le format sous lequel il a été écrit.
 *
 * Le Cerveau écrivait dans `keywords_seo.type_mot_clef` le niveau d'article
 * canonique (`'pilier'`, `'intermediaire'`, `'specifique'`), alors que tous les
 * lecteurs attendent le `KeywordType` (`'Pilier'`, `'Intermédiaire'`…). Le
 * mot-clé pilier n'était donc jamais trouvé, et la rédaction retombait sur le
 * titre de l'article (épopée qualité SEO, checklist K2).
 */
import { describe, it, expect } from 'vitest'
import { parseKeywordType } from '../../../shared/utils/keyword-type.js'

describe('parseKeywordType — tolérant en lecture', () => {
  it('laisse passer les valeurs attendues', () => {
    for (const t of ['Pilier', 'Intermédiaire', 'Spécialisé', 'Moyenne traine', 'Longue traine'] as const) {
      expect(parseKeywordType(t)).toBe(t)
    }
  })

  it('traduit les niveaux d’article écrits en minuscules par le Cerveau', () => {
    expect(parseKeywordType('pilier')).toBe('Pilier')
    expect(parseKeywordType('intermediaire')).toBe('Intermédiaire')
    expect(parseKeywordType('specifique')).toBe('Spécialisé')
  })

  it('ignore la casse, les accents et les espaces autour', () => {
    expect(parseKeywordType('  INTERMEDIAIRE ')).toBe('Intermédiaire')
    expect(parseKeywordType('spécialisé')).toBe('Spécialisé')
    expect(parseKeywordType('longue traîne')).toBe('Longue traine')
    expect(parseKeywordType('Moyenne Traine')).toBe('Moyenne traine')
  })

  it('renvoie null pour une valeur inconnue, sans inventer de repli', () => {
    expect(parseKeywordType('chapitre')).toBeNull()
    expect(parseKeywordType('')).toBeNull()
    expect(parseKeywordType(null)).toBeNull()
    expect(parseKeywordType(42)).toBeNull()
  })
})
