import { describe, it, expect } from 'vitest'
import { validateArticleSeo, keywordCoverage, type SeoInput } from '../../../shared/seo-validators'

const rules = (issues: { rule: string }[]): string[] => issues.map((i) => i.rule)

/** Paragraphe de remplissage réaliste pour atteindre les planchers de longueur. */
const filler = (words: number): string =>
  `<p>${Array.from({ length: words }, (_, i) => ['site', 'client', 'devis', 'page', 'projet'][i % 5]).join(' ')}.</p>`

const PILIER: SeoInput = {
  title: 'Création de site web à Toulouse : le guide complet pour les TPE',
  slug: 'creation-site-web-toulouse',
  level: 'pilier',
  metaTitle: 'Création de site web à Toulouse : le guide pour les TPE',
  metaDescription: 'Budget, délais, prestataire : tout savoir sur la création de site web à Toulouse.',
  capitaine: 'création de site web Toulouse',
  lieutenants: ['prix création site web', 'devis création site web'],
  localCity: 'Toulouse',
  content:
    '<p>La création de site web à Toulouse commence par une question simple.</p>' +
    '<h2>Le prix d’une création de site web</h2><p>Un devis de création de site web varie.</p>' +
    '<h2>Choisir</h2><p>Texte.</p><h2>Délais</h2><p>Texte.</p><h2>Préparer</h2><p>Texte.</p>' +
    '<h2>Réussir</h2><p>Un site à Toulouse, ville dynamique.</p>' +
    filler(1600),
}

describe('keywordCoverage', () => {
  it('ignore la casse, les accents et les mots vides', () => {
    expect(keywordCoverage('création de site web Toulouse', 'Creation site web a TOULOUSE')).toBe(1)
  })

  it('tolère les variations de fin de mot (pluriel, féminin)', () => {
    expect(keywordCoverage('site vitrine artisan', 'Les sites vitrines pour artisans')).toBe(1)
  })

  it('mesure une couverture partielle', () => {
    expect(keywordCoverage('prix site vitrine artisan', 'Le prix d’un site')).toBe(0.5)
  })
})

describe('validateArticleSeo', () => {
  it('ne signale rien sur un pilier bien construit', () => {
    expect(validateArticleSeo(PILIER)).toEqual([])
  })

  describe('le Capitaine, mot-clé sur l’enseigne', () => {
    it('exige un Capitaine', () => {
      expect(rules(validateArticleSeo({ ...PILIER, capitaine: '' }))).toContain('seo-capitaine-missing')
    })

    it('exige le Capitaine dans le titre', () => {
      const issues = validateArticleSeo({ ...PILIER, title: 'Le guide complet pour les TPE' })
      expect(rules(issues)).toContain('seo-capitaine-not-in-title')
    })

    it('signale le Capitaine absent du meta title (avertissement)', () => {
      const issues = validateArticleSeo({ ...PILIER, metaTitle: 'Le guide des TPE ambitieuses' })
      const issue = issues.find((i) => i.rule === 'seo-capitaine-not-in-meta-title')
      expect(issue?.severity).toBe('warning')
    })

    it('signale le Capitaine absent de l’introduction', () => {
      const issues = validateArticleSeo({
        ...PILIER,
        content: PILIER.content.replace('La création de site web à Toulouse commence', 'Tout commence'),
      })
      expect(rules(issues)).toContain('seo-capitaine-not-in-intro')
    })

    it('refuse un Capitaine hors de l’offre (cas réel : « site e-commerce » pour #1012)', () => {
      const issues = validateArticleSeo({ ...PILIER, capitaine: 'site e-commerce' })
      expect(rules(issues)).toContain('seo-off-offer')
    })
  })

  describe('longueur et structure', () => {
    it('refuse un contenu trop mince pour son niveau', () => {
      const issues = validateArticleSeo({ ...PILIER, content: '<h2>A</h2><p>Trop court.</p>' })
      expect(rules(issues)).toContain('seo-thin-content')
    })

    it('accepte une fiche spécialisée plus courte qu’un pilier', () => {
      const issues = validateArticleSeo({
        ...PILIER,
        level: 'specifique',
        content: PILIER.content.replace(filler(1600), filler(600)),
      })
      expect(rules(issues)).not.toContain('seo-thin-content')
    })

    it('signale un pilier avec trop peu de sections', () => {
      const issues = validateArticleSeo({
        ...PILIER,
        content: '<p>La création de site web à Toulouse.</p><h2>Seul chapitre</h2>' + filler(1600),
      })
      expect(rules(issues)).toContain('seo-too-few-sections')
    })

    it('signale deux H2 identiques', () => {
      const issues = validateArticleSeo({ ...PILIER, content: PILIER.content + '<h2>Délais</h2><p>x.</p>' })
      expect(rules(issues)).toContain('seo-duplicate-h2')
    })
  })

  describe('adresse (slug)', () => {
    it('refuse un slug mal formé', () => {
      expect(rules(validateArticleSeo({ ...PILIER, slug: 'Création Site Web!' }))).toContain('seo-slug-format')
    })

    it('refuse un slug trop long (les anciens slugs « mots-clés collés »)', () => {
      const slug = 'site-internet-pour-tpe-a-toulouse-guide-complet-du-budget-au-roi-et-bien-plus-encore'
      expect(rules(validateArticleSeo({ ...PILIER, slug }))).toContain('seo-slug-format')
    })
  })

  describe('ancrage local', () => {
    it('signale un article local qui ne cite jamais sa ville', () => {
      const issues = validateArticleSeo({
        ...PILIER,
        content: PILIER.content.replace(/Toulouse/g, 'la ville'),
      })
      expect(rules(issues)).toContain('seo-local-missing')
    })

    it('signale une ville répétée à outrance (cas réel #455 : 42 fois)', () => {
      const stuffed = PILIER.content + '<p>' + Array(40).fill('Toulouse').join(' ') + '.</p>'
      expect(rules(validateArticleSeo({ ...PILIER, content: stuffed }))).toContain('seo-local-overuse')
    })
  })

  it('signale un Lieutenant hors de l’offre (cas réel : « site e-commerce » dans #1012)', () => {
    const issues = validateArticleSeo({ ...PILIER, lieutenants: [...PILIER.lieutenants!, 'site e-commerce'] })
    expect(rules(issues)).toContain('seo-off-offer-lieutenant')
  })

  it('signale des Lieutenants absents du texte', () => {
    const issues = validateArticleSeo({
      ...PILIER,
      lieutenants: ['hébergement mutualisé', 'nom de domaine', 'certificat ssl'],
    })
    expect(rules(issues)).toContain('seo-lieutenants-coverage')
  })
})
