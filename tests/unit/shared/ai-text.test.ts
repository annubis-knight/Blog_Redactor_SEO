import { describe, it, expect } from 'vitest'
import { detectAiMetaLeaks, stripAiPreamble, stripContentH1 } from '../../../shared/ai-text'

// ============================================================================
// detectAiMetaLeaks — le garde-fou anti-monologue
// Corpus de référence : extraits RÉELS des articles #454 à #461 (audit 2026-09-19).
// ============================================================================

describe('detectAiMetaLeaks', () => {
  describe('extraits réels des articles générés (doivent tous être détectés)', () => {
    const REAL_LEAKS = [
      "Je vais d'abord faire une recherche pour vérifier les critères d'éligibilité actuels de Google Business Profile",
      'Je vais rechercher des informations actualisées sur Google Business Profile et les statistiques récentes',
      "Je vais maintenant rédiger l'introduction de l'article en suivant les directives strictement.",
      'Parfait. J\'ai mes sources. Maintenant je vais rédiger les sections demandées.',
      'Je dispose à présent de données sourcées et à jour. Voici la section demandée :',
      'Je vais faire une recherche rapide pour valider les données chiffrées',
      "Je vais rédiger l'introduction de cet article pilier en respectant vos directives.",
      'Avant de commencer, je dois vérifier les données chiffrées.',
      "J'ai suffisamment de données chiffrées et vérifiées.",
      "Je vais d'abord effectuer des recherches pour vérifier les données chiffrées",
      // Run réel du 2026-09-21 (article #1012) : passées entre les mailles,
      // rattrapées par la détection structurelle du garde-fou.
      "Parfait. J'ai suffisamment d'informations pour rédiger une introduction puissante et sourcée.",
      'Parfait. J’ai maintenant des données solides et récentes pour rédiger cette section. Voici le contenu HTML :',
      'Excellent. J’ai maintenant les informations actualisées pour rédiger cette section. Je vais structurer le contenu.',
    ]

    for (const leak of REAL_LEAKS) {
      it(`détecte : « ${leak.slice(0, 45)}… »`, () => {
        expect(detectAiMetaLeaks(leak).length).toBeGreaterThan(0)
      })
    }
  })

  describe('texte éditorial légitime (aucune détection)', () => {
    const LEGIT = [
      "<p>Vous perdez des clients chaque semaine parce qu'un concurrent est mieux placé.</p>",
      '<h2>Combien coûte un site vitrine à Toulouse ?</h2><p>Entre 2 000 et 8 000 euros.</p>',
      '<p>Je vais vous montrer comment un artisan de Blagnac a structuré sa page.</p>',
      "<p>Avant de rédiger votre page de service, posez-vous cette question.</p>",
      '<p>Voici les trois leviers à activer en priorité.</p>',
      "<p>Nous allons voir ensemble comment remplir votre fiche Google.</p>",
    ]

    for (const text of LEGIT) {
      it(`laisse passer : « ${text.slice(0, 45)}… »`, () => {
        expect(detectAiMetaLeaks(text)).toEqual([])
      })
    }
  })

  it('renvoie un extrait exploitable autour de la fuite', () => {
    const html = `<p>Un paragraphe normal.</p>Je vais d'abord faire une recherche sur le sujet.<h2>Titre</h2>`
    const leaks = detectAiMetaLeaks(html)

    expect(leaks).toHaveLength(1)
    expect(leaks[0]!.excerpt).toContain('Je vais')
    expect(leaks[0]!.index).toBeGreaterThan(0)
  })

  it('plafonne le nombre de fuites remontées', () => {
    const many = Array(20).fill('Je vais faire une recherche.').join(' ')
    expect(detectAiMetaLeaks(many, { max: 3 })).toHaveLength(3)
  })

  it('ignore la casse et les apostrophes typographiques', () => {
    expect(detectAiMetaLeaks('JE VAIS D’ABORD FAIRE UNE RECHERCHE.').length).toBe(1)
  })

  it('texte vide → aucune fuite', () => {
    expect(detectAiMetaLeaks('')).toEqual([])
  })

  // Régression : `\b` en JS ignore les accents, donc un motif terminé par
  // « demandé » ne matchait jamais. Corrigé par une anticipation Unicode.
  it('détecte une fin de mot accentuée (piège du \\b JavaScript)', () => {
    expect(detectAiMetaLeaks('Voici le texte demandé.').length).toBe(1)
    expect(detectAiMetaLeaks('Voici la section demandée :').length).toBe(1)
  })
})

// ============================================================================
// stripAiPreamble — nettoie la phrase d'annonce en tête de section
// ============================================================================

describe('stripAiPreamble', () => {
  it('retire le préambule avant la première balise', () => {
    const input = "Parfait. J'ai mes sources. Voici la section demandée :\n\n<h2>Le titre</h2><p>Texte.</p>"
    expect(stripAiPreamble(input)).toBe('<h2>Le titre</h2><p>Texte.</p>')
  })

  it('retire un préambule court sans ponctuation finale', () => {
    const input = '<h2>Titre</h2>'
    expect(stripAiPreamble(`Je vais rédiger cette section\n${input}`)).toBe(input)
  })

  it('retire une amorce réelle du 2026-09-21 (#1012)', () => {
    const input =
      'Parfait. J’ai maintenant des données solides et récentes pour rédiger cette section. Voici le contenu HTML :\n\n<h2>Titre</h2><p>Texte.</p>'
    expect(stripAiPreamble(input)).toBe('<h2>Titre</h2><p>Texte.</p>')
  })

  it('retire une amorce qui commence par une formule de politesse de l’IA', () => {
    const input = 'Excellent, c’est noté pour la suite.\n<h2>Titre</h2>'
    expect(stripAiPreamble(input)).toBe('<h2>Titre</h2>')
  })

  it('ne touche pas un contenu qui commence déjà par une balise', () => {
    const input = '<h2>Titre</h2><p>Texte.</p>'
    expect(stripAiPreamble(input)).toBe(input)
  })

  it('ne retire PAS un texte éditorial placé avant une balise', () => {
    const input = 'Un chiffre à retenir : 70 % des recherches sont locales.<p>Suite.</p>'
    expect(stripAiPreamble(input)).toBe(input)
  })

  it('ne retire rien si le contenu ne contient aucune balise', () => {
    const input = 'Je vais rédiger cette section.'
    expect(stripAiPreamble(input)).toBe(input)
  })

  it('gère le texte vide', () => {
    expect(stripAiPreamble('')).toBe('')
  })
})

// ============================================================================
// stripContentH1 — évite le double H1 (le gabarit d'export pose déjà le sien)
// ============================================================================

describe('stripContentH1', () => {
  it('retire un H1 simple', () => {
    expect(stripContentH1('<h1>Titre</h1><p>Texte.</p>')).toBe('<p>Texte.</p>')
  })

  it('retire un H1 avec attributs et retours à la ligne', () => {
    const input = '<p>Avant.</p>\n<h1 class="titre">\n  Mon titre\n</h1>\n<p>Après.</p>'
    expect(stripContentH1(input)).toBe('<p>Avant.</p>\n\n<p>Après.</p>')
  })

  it('retire plusieurs H1', () => {
    expect(stripContentH1('<h1>A</h1><p>x</p><h1>B</h1>')).toBe('<p>x</p>')
  })

  it('ne touche ni aux H2 ni aux H3', () => {
    const input = '<h2>A</h2><h3>B</h3>'
    expect(stripContentH1(input)).toBe(input)
  })

  it('laisse le contenu intact quand il n’y a pas de H1', () => {
    const input = '<p>Texte.</p>'
    expect(stripContentH1(input)).toBe(input)
  })

  it('gère le texte vide', () => {
    expect(stripContentH1('')).toBe('')
  })
})
