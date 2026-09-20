import { describe, it, expect } from 'vitest'
import { startsWithQuestionWord, FRENCH_WORD_END } from '../../../shared/french-text'

describe('startsWithQuestionWord', () => {
  describe('vrais titres de question', () => {
    const QUESTIONS = [
      'Comment créer un site web pour son artisanat',
      'Pourquoi votre site ne génère aucun prospect',
      'Quand refaire son site internet',
      'Quel budget prévoir pour un site vitrine',
      'Quelles pages mettre sur un site de service',
      'Combien coûte un site internet à Toulouse',
      'Que faire quand son site ne convertit pas',
      'Qui contacter pour créer son site',
      'Quoi mettre sur sa page d’accueil',
      '  Comment bien choisir son prestataire', // espaces en tête
    ]

    for (const title of QUESTIONS) {
      it(`« ${title.trim().slice(0, 40)}… » → question`, () => {
        expect(startsWithQuestionWord(title)).toBe(true)
      })
    }
  })

  // Régression : `\b` en JavaScript ignore les lettres accentuées, donc
  // `où\b` ne matchait JAMAIS. Les titres en « Où … » étaient invisibles
  // pour le score GEO et absents des données structurées FAQ.
  describe('mots interrogatifs accentués (piège du \\b)', () => {
    it('« Où trouver un prestataire web à Toulouse » → question', () => {
      expect(startsWithQuestionWord('Où trouver un prestataire web à Toulouse')).toBe(true)
    })

    it('minuscule accentuée aussi', () => {
      expect(startsWithQuestionWord('où héberger son site')).toBe(true)
    })
  })

  describe('apostrophes', () => {
    it('accepte l’apostrophe droite', () => {
      expect(startsWithQuestionWord("Qu'est-ce qu'un cocon sémantique")).toBe(true)
    })

    it('accepte l’apostrophe typographique', () => {
      expect(startsWithQuestionWord('Qu’est-ce qu’un cocon sémantique')).toBe(true)
    })
  })

  describe('faux amis : un mot interrogatif ne doit pas matcher un préfixe', () => {
    const NOT_QUESTIONS = [
      'Commentaire client : ce qu’il faut en retenir', // « comment » + aire
      'Quelques conseils pour votre page d’accueil', //   « quel » + ques
      'Ouvrir une boutique en ligne',                 //   « ou » sans accent
      'Combinaison de leviers SEO',                   //   « combi » ≠ combien
      'Site web sur mesure à Toulouse',
      '',
      '   ',
    ]

    for (const title of NOT_QUESTIONS) {
      it(`« ${title.trim().slice(0, 40) || '(vide)'} » → pas une question`, () => {
        expect(startsWithQuestionWord(title)).toBe(false)
      })
    }
  })
})

describe('FRENCH_WORD_END', () => {
  it('s’utilise dans une RegExp Unicode et gère les accents', () => {
    const re = new RegExp(`^augmenté${FRENCH_WORD_END}`, 'iu')

    expect(re.test('augmenté de 40 %')).toBe(true)
    expect(re.test('augmentée de 40 %')).toBe(false)
  })

  it('le `\\b` natif échoue sur le même cas (raison d’être de cette constante)', () => {
    expect(/^augmenté\b/i.test('augmenté de 40 %')).toBe(false)
  })
})
