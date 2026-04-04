import { describe, it, expect } from 'vitest'
import { checkKeywordComposition } from '../../../shared/composition-rules'
import type { ArticleLevel } from '../../../shared/types/keyword-validate.types'
import type { CompositionRuleName } from '../../../shared/types/composition.types'

// Helper: get a specific rule result
function getRule(keyword: string, level: ArticleLevel, rule: CompositionRuleName) {
  const result = checkKeywordComposition(keyword, level)
  return result.results.find(r => r.rule === rule)
}

// ============================================================================
// Règle 1 : word_count
// ============================================================================

describe('word_count rule', () => {
  describe('pilier (3-4 mots)', () => {
    it('1 mot = fail', () => {
      expect(getRule('seo', 'pilier', 'word_count')?.pass).toBe(false)
    })
    it('2 mots = fail', () => {
      expect(getRule('stratégie digitale', 'pilier', 'word_count')?.pass).toBe(false)
    })
    it('3 mots = pass', () => {
      expect(getRule('stratégie digitale entreprises', 'pilier', 'word_count')?.pass).toBe(true)
    })
    it('4 mots = pass', () => {
      expect(getRule('stratégie digitale entreprises Toulouse', 'pilier', 'word_count')?.pass).toBe(true)
    })
    it('5 mots = fail', () => {
      expect(getRule('stratégie digitale entreprises Toulouse Occitanie', 'pilier', 'word_count')?.pass).toBe(false)
    })
  })

  describe('intermediaire (3-4 mots)', () => {
    it('2 mots = fail', () => {
      expect(getRule('design site', 'intermediaire', 'word_count')?.pass).toBe(false)
    })
    it('3 mots = pass', () => {
      expect(getRule('design émotionnel site', 'intermediaire', 'word_count')?.pass).toBe(true)
    })
    it('4 mots = pass', () => {
      expect(getRule('design émotionnel site professionnel', 'intermediaire', 'word_count')?.pass).toBe(true)
    })
    it('5 mots = fail', () => {
      expect(getRule('design émotionnel site web professionnel', 'intermediaire', 'word_count')?.pass).toBe(false)
    })
  })

  describe('specifique (5+ mots)', () => {
    it('3 mots = fail', () => {
      expect(getRule('couleurs site web', 'specifique', 'word_count')?.pass).toBe(false)
    })
    it('4 mots = fail', () => {
      expect(getRule('choisir couleurs site web', 'specifique', 'word_count')?.pass).toBe(false)
    })
    it('5 mots = pass', () => {
      expect(getRule('comment choisir couleurs site web', 'specifique', 'word_count')?.pass).toBe(true)
    })
    it('7 mots = pass', () => {
      expect(getRule('comment choisir couleurs site web professionnel entreprise', 'specifique', 'word_count')?.pass).toBe(true)
    })
  })
})

// ============================================================================
// Règle 2 : localisation
// ============================================================================

describe('location rules', () => {
  describe('pilier — location_present (obligatoire)', () => {
    it('détecte une ville : Toulouse', () => {
      expect(getRule('stratégie digitale entreprises Toulouse', 'pilier', 'location_present')?.pass).toBe(true)
    })
    it('détecte un adjectif : toulousain', () => {
      expect(getRule('croissance digitale entreprises toulousaines', 'pilier', 'location_present')?.pass).toBe(true)
    })
    it('détecte une région : Occitanie', () => {
      expect(getRule('marketing digital entreprises Occitanie', 'pilier', 'location_present')?.pass).toBe(true)
    })
    it('détecte un adjectif régional : provençal', () => {
      expect(getRule('gastronomie provençale entreprises locales', 'pilier', 'location_present')?.pass).toBe(true)
    })
    it('détecte une localisation multi-mots : ile de france', () => {
      expect(getRule('services entreprises ile de france', 'pilier', 'location_present')?.pass).toBe(true)
    })
    it('fail quand aucune localisation', () => {
      expect(getRule('stratégie digitale entreprises', 'pilier', 'location_present')?.pass).toBe(false)
    })
    it('gère les accents : Montpellier vs montpellierain', () => {
      expect(getRule('agence digitale entreprises montpelliérain', 'pilier', 'location_present')?.pass).toBe(true)
    })
  })

  describe('intermediaire — location_absent (interdit)', () => {
    it('pass quand aucune localisation', () => {
      expect(getRule('design émotionnel site professionnel', 'intermediaire', 'location_absent')?.pass).toBe(true)
    })
    it('fail quand ville présente', () => {
      expect(getRule('design site professionnel Toulouse', 'intermediaire', 'location_absent')?.pass).toBe(false)
    })
    it('fail quand adjectif présent', () => {
      expect(getRule('design parisien site professionnel', 'intermediaire', 'location_absent')?.pass).toBe(false)
    })
    it('fail quand région présente', () => {
      expect(getRule('marketing digital bretagne professionnel', 'intermediaire', 'location_absent')?.pass).toBe(false)
    })
  })

  describe('specifique — pas de règle localisation', () => {
    it('retourne null (pas de check location)', () => {
      const result = checkKeywordComposition('comment choisir couleurs site Toulouse', 'specifique')
      expect(result.results.find(r => r.rule === 'location_present')).toBeUndefined()
      expect(result.results.find(r => r.rule === 'location_absent')).toBeUndefined()
    })
  })
})

// ============================================================================
// Règle 3 : audience / cible
// ============================================================================

describe('audience_present rule', () => {
  describe('pilier', () => {
    it('détecte "entreprises"', () => {
      expect(getRule('stratégie digitale entreprises Toulouse', 'pilier', 'audience_present')?.pass).toBe(true)
    })
    it('détecte "professionnels"', () => {
      expect(getRule('marketing digital professionnels Lyon', 'pilier', 'audience_present')?.pass).toBe(true)
    })
    it('détecte "dirigeants"', () => {
      expect(getRule('stratégie web dirigeants Bordeaux', 'pilier', 'audience_present')?.pass).toBe(true)
    })
    it('détecte un synonyme : "artisans"', () => {
      expect(getRule('visibilité web artisans Toulouse', 'pilier', 'audience_present')?.pass).toBe(true)
    })
    it('fail quand aucune cible', () => {
      expect(getRule('stratégie digitale Toulouse web', 'pilier', 'audience_present')?.pass).toBe(false)
    })
    it('fail quand "pme" utilisé (déconseillé)', () => {
      const r = getRule('seo pme Toulouse local', 'pilier', 'audience_present')
      expect(r?.pass).toBe(false)
      expect(r?.message).toContain('PME/TPE')
    })
  })

  describe('intermediaire', () => {
    it('détecte "professionnel"', () => {
      expect(getRule('design émotionnel site professionnel', 'intermediaire', 'audience_present')?.pass).toBe(true)
    })
    it('détecte "équipe"', () => {
      expect(getRule('gestion projet équipe digitale', 'intermediaire', 'audience_present')?.pass).toBe(true)
    })
    it('fail quand aucune cible', () => {
      expect(getRule('design émotionnel site web', 'intermediaire', 'audience_present')?.pass).toBe(false)
    })
  })

  describe('specifique — pas de règle audience', () => {
    it('retourne null', () => {
      const result = checkKeywordComposition('comment choisir couleurs site web', 'specifique')
      expect(result.results.find(r => r.rule === 'audience_present')).toBeUndefined()
    })
  })
})

// ============================================================================
// Règle 4 : format question (spécifique uniquement)
// ============================================================================

describe('question_format rule', () => {
  describe('specifique', () => {
    it('détecte "comment" en début', () => {
      expect(getRule('comment choisir couleurs site web', 'specifique', 'question_format')?.pass).toBe(true)
    })
    it('détecte "pourquoi" en début', () => {
      expect(getRule('pourquoi investir dans le marketing digital entreprise', 'specifique', 'question_format')?.pass).toBe(true)
    })
    it('détecte "quel" en début', () => {
      expect(getRule('quel outil choisir pour créer site', 'specifique', 'question_format')?.pass).toBe(true)
    })
    it('détecte "faut-il" en début', () => {
      expect(getRule('faut-il investir dans le référencement naturel', 'specifique', 'question_format')?.pass).toBe(true)
    })
    it('détecte un point d\'interrogation', () => {
      expect(getRule('meilleur outil création site web professionnel ?', 'specifique', 'question_format')?.pass).toBe(true)
    })
    it('fail pour une affirmation', () => {
      expect(getRule('choisir couleurs site web professionnel entreprise', 'specifique', 'question_format')?.pass).toBe(false)
    })
  })

  describe('pilier — pas de règle question', () => {
    it('retourne null', () => {
      const result = checkKeywordComposition('stratégie digitale entreprises Toulouse', 'pilier')
      expect(result.results.find(r => r.rule === 'question_format')).toBeUndefined()
    })
  })

  describe('intermediaire — pas de règle question', () => {
    it('retourne null', () => {
      const result = checkKeywordComposition('design émotionnel site professionnel', 'intermediaire')
      expect(result.results.find(r => r.rule === 'question_format')).toBeUndefined()
    })
  })
})

// ============================================================================
// Vérification complète (intégration)
// ============================================================================

describe('checkKeywordComposition — full check', () => {
  it('pilier conforme : toutes les règles passent', () => {
    const result = checkKeywordComposition('stratégie digitale entreprises Toulouse', 'pilier')
    expect(result.allPass).toBe(true)
    expect(result.warningCount).toBe(0)
    expect(result.results).toHaveLength(3) // word_count + location_present + audience_present
  })

  it('intermediaire conforme : toutes les règles passent', () => {
    const result = checkKeywordComposition('design émotionnel site professionnel', 'intermediaire')
    expect(result.allPass).toBe(true)
    expect(result.warningCount).toBe(0)
    expect(result.results).toHaveLength(3) // word_count + location_absent + audience_present
  })

  it('specifique conforme : toutes les règles passent', () => {
    const result = checkKeywordComposition('comment choisir couleurs site web professionnel', 'specifique')
    expect(result.allPass).toBe(true)
    expect(result.warningCount).toBe(0)
    expect(result.results).toHaveLength(2) // word_count + question_format
  })

  it('pilier avec multiple violations', () => {
    const result = checkKeywordComposition('seo', 'pilier')
    expect(result.allPass).toBe(false)
    expect(result.warningCount).toBe(3) // word_count + location_present + audience_present
  })

  it('intermediaire avec ville = 1 warning', () => {
    const result = checkKeywordComposition('seo local professionnel Toulouse', 'intermediaire')
    expect(result.allPass).toBe(false)
    // word_count pass (4 mots), location_absent fail, audience_present pass
    expect(result.warningCount).toBe(1)
  })

  it('specifique trop court + pas de question = 2 warnings', () => {
    const result = checkKeywordComposition('couleurs site web', 'specifique')
    expect(result.allPass).toBe(false)
    expect(result.warningCount).toBe(2)
  })

  it('keyword vide = toujours en échec', () => {
    const result = checkKeywordComposition('', 'pilier')
    expect(result.allPass).toBe(false)
  })

  it('structure du résultat est correcte', () => {
    const result = checkKeywordComposition('test mot cle', 'pilier')
    expect(result.keyword).toBe('test mot cle')
    expect(result.level).toBe('pilier')
    expect(Array.isArray(result.results)).toBe(true)
    expect(typeof result.warningCount).toBe('number')
    expect(typeof result.allPass).toBe('boolean')
  })
})
