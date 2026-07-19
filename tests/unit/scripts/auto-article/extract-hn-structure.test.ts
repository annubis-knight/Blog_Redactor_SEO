import { describe, it, expect } from 'vitest'
import {
  cleanHeading,
  extractHnStructure,
  formatHnStructure,
  headingSignature,
} from '../../../../scripts/auto-article/heuristics/extract-hn-structure.js'

describe('auto:extract-hn — cleanHeading (bruit du scraping réel)', () => {
  it('décode les entités HTML nommées et numériques', () => {
    expect(cleanHeading('Supprimer les liens brisés&nbsp;')).toBe('Supprimer les liens brisés')
    expect(cleanHeading('Qu&#39;est-ce que le SEO')).toBe("Qu'est-ce que le SEO")
    expect(cleanHeading('SEO &amp; contenu')).toBe('SEO & contenu')
  })

  it('retire la numérotation des listicles', () => {
    expect(cleanHeading('1. Trouver les bons mots-clés')).toBe('Trouver les bons mots-clés')
    expect(cleanHeading('17 - Supprimer les liens brisés')).toBe('Supprimer les liens brisés')
    expect(cleanHeading('2 — Analyser la concurrence')).toBe('Analyser la concurrence')
  })

  it('ne touche pas à un chiffre porteur de sens', () => {
    expect(cleanHeading('10 conseils pour le SEO')).toBe('10 conseils pour le SEO')
  })

  it('normalise les espaces', () => {
    expect(cleanHeading('  Trop   d espaces  ')).toBe('Trop d espaces')
  })
})

const h = (level: number, text: string): { level: number; text: string } => ({ level, text })

describe('auto:extract-hn — headingSignature', () => {
  it('regroupe les reformulations d\'un même chapitre', () => {
    expect(headingSignature("Qu'est-ce que le SEO local ?"))
      .toBe(headingSignature('Le SEO local, c\'est quoi ?'))
  })

  it('distingue des chapitres différents', () => {
    expect(headingSignature('Le prix du SEO')).not.toBe(headingSignature('Les outils du SEO'))
  })

  it('ignore l\'ordre des mots', () => {
    expect(headingSignature('SEO local')).toBe(headingSignature('local SEO'))
  })
})

describe('auto:extract-hn — extractHnStructure', () => {
  const competitors = [
    { headings: [h(2, 'Qu\'est-ce que le SEO local ?'), h(2, 'Combien ça coûte ?')] },
    { headings: [h(2, 'Le SEO local, c\'est quoi ?'), h(2, 'Combien ça coûte ?')] },
    { headings: [h(2, 'SEO local : définition'), h(2, 'Choisir son agence')] },
    { headings: [h(2, 'Combien ça coûte ?')] },
  ]

  it('mesure la récurrence sur le nombre de concurrents', () => {
    const out = extractHnStructure(competitors)
    const cout = out.find((i) => i.text.includes('coûte'))
    expect(cout?.competitorCount).toBe(3)
    expect(cout?.recurrence).toBeCloseTo(0.75, 2)
  })

  it('classe par récurrence décroissante', () => {
    const out = extractHnStructure(competitors)
    const rec = out.map((i) => i.recurrence)
    expect([...rec].sort((a, b) => b - a)).toEqual(rec)
  })

  it('écarte les chapitres sous le seuil de récurrence', () => {
    const out = extractHnStructure(competitors)
    // « Choisir son agence » n'apparaît que chez 1 concurrent sur 4 (25 % < 30 %)
    expect(out.some((i) => i.text.includes('agence'))).toBe(false)
  })

  it('ne compte qu\'une fois un chapitre répété chez le même concurrent', () => {
    const out = extractHnStructure([
      // 3 répétitions chez le même concurrent → doit compter pour 1
      { headings: [h(2, 'Le prix du SEO'), h(2, 'Le prix du SEO'), h(2, 'Le prix du SEO')] },
      { headings: [h(2, 'Le prix du SEO')] },
      { headings: [h(2, 'Autre sujet totalement different')] },
      { headings: [h(2, 'Encore un chapitre bien distinct')] },
    ])
    const prix = out.find((i) => i.text.includes('prix'))
    expect(prix?.competitorCount).toBe(2)
    expect(prix?.recurrence).toBeCloseTo(0.5, 2)
  })

  it('écarte un chapitre vu chez un seul concurrent (garde-fou)', () => {
    const out = extractHnStructure([
      { headings: [h(2, 'Chapitre unique et isole')] },
      { headings: [h(2, 'Tout autre chose ici')] },
      { headings: [h(2, 'Encore differente celle-ci')] },
    ])
    // 1/3 = 33 % ≥ seuil, mais un seul concurrent → écarté
    expect(out).toEqual([])
  })

  it('tolère un concurrent sans headings (scraping échoué)', () => {
    expect(() => extractHnStructure([{}, { headings: [h(2, 'Un titre quelconque ici')] }])).not.toThrow()
  })

  it('retourne une liste vide sans concurrent', () => {
    expect(extractHnStructure([])).toEqual([])
  })

  it('plafonne le nombre de chapitres', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ headings: [h(2, `Chapitre numero ${i}`)] }))
    // chacun n'apparaît qu'une fois → seuil non atteint
    expect(extractHnStructure(many, { minRecurrence: 0 }).length).toBeLessThanOrEqual(12)
  })
})

describe('auto:extract-hn — formatHnStructure', () => {
  it('rend un markdown lisible avec le pourcentage', () => {
    const out = formatHnStructure([
      { level: 2, text: 'Le prix du SEO', recurrence: 0.75, competitorCount: 3 },
    ])
    expect(out).toContain('H2')
    expect(out).toContain('Le prix du SEO')
    expect(out).toContain('75 %')
  })

  it('retourne une chaîne vide sans chapitre', () => {
    expect(formatHnStructure([])).toBe('')
  })

  it('omet le pourcentage quand la récurrence est inconnue (cas --resume)', () => {
    const out = formatHnStructure([
      { level: 2, text: 'Chapitre relu depuis la base', recurrence: 0, competitorCount: 0 },
    ])
    expect(out).toContain('Chapitre relu depuis la base')
    expect(out).not.toContain('%')
  })
})
