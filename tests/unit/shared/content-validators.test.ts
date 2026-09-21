import { describe, it, expect } from 'vitest'
import { validateArticleContent, validateArticleMeta, validateExportedPage } from '../../../shared/content-validators'

const codes = (issues: { rule: string }[]): string[] => issues.map((i) => i.rule)

// ============================================================================
// Contenu d'article — un valideur par défaut constaté dans l'audit
// ============================================================================

describe('validateArticleContent', () => {
  const CLEAN = '<h2>Un titre</h2><p>Un paragraphe complet.</p><h3>Sous-titre</h3><p>Suite.</p>'

  it('ne signale rien sur un contenu sain', () => {
    expect(validateArticleContent(CLEAN)).toEqual([])
  })

  describe('structure des titres', () => {
    it('tolère un H1 unique, que l’export retire (avertissement)', () => {
      const issues = validateArticleContent('<h1>Titre</h1><p>Texte.</p>')
      expect(issues).toHaveLength(1)
      expect(issues[0]!.rule).toBe('hn-h1-in-body')
      expect(issues[0]!.severity).toBe('warning')
    })

    it('refuse deux H1 dans le corps', () => {
      expect(codes(validateArticleContent('<h1>A</h1><p>x.</p><h1>B</h1>'))).toContain('hn-multiple-h1')
    })

    it('refuse un saut de niveau H2 → H4', () => {
      expect(codes(validateArticleContent('<h2>A</h2><h4>B</h4><p>Texte.</p>'))).toContain('hn-level-jump')
    })

    it('accepte une descente puis une remontée normale', () => {
      expect(codes(validateArticleContent('<h2>A</h2><h3>B</h3><h2>C</h2><p>x.</p>'))).toEqual([])
    })

    it('refuse un titre vide', () => {
      expect(codes(validateArticleContent('<h2></h2><p>Texte.</p>'))).toContain('hn-empty')
    })
  })

  it('refuse le monologue de l’IA', () => {
    expect(codes(validateArticleContent('<p>Je vais d’abord faire une recherche sur ce point.</p>'))).toContain(
      'ai-monologue',
    )
  })

  it('refuse le texte hors paragraphe', () => {
    expect(codes(validateArticleContent('<p>a.</p>Voici la rédaction demandée :<h2>T</h2>'))).toContain(
      'orphan-text',
    )
  })

  it('refuse un paragraphe tronqué', () => {
    expect(codes(validateArticleContent('<p>Phrase complète. Début coup</p>'))).toContain('truncated-block')
  })

  it('refuse le Markdown resté dans le HTML', () => {
    expect(codes(validateArticleContent('<p>Le **gras** Markdown.</p>'))).toContain('markdown-residue')
  })

  it('refuse une balise de mise en page avalée par le contenu', () => {
    // Cas réel #459 : `<nav>`, `<main>` écrits entre backticks ont été
    // interprétés comme de vraies balises, cassant l'imbrication de la page.
    expect(codes(validateArticleContent('<p>Les landmarks <nav></nav> et <main></main>.</p>'))).toContain(
      'forbidden-tag',
    )
  })

  it('signale une affirmation invérifiable, sans bloquer', () => {
    const issues = validateArticleContent('<p>Nous avons accompagné 150 entreprises toulousaines.</p>')
    const claim = issues.find((i) => i.rule === 'unverifiable-claim')
    expect(claim?.severity).toBe('warning')
  })

  it('tolère les balises éditoriales habituelles', () => {
    const html =
      '<h2>T</h2><p>Du <strong>gras</strong>, de l’<em>italique</em>, un <a href="/x">lien</a>.</p>' +
      '<ul><li>Point.</li></ul><blockquote>« Citation. »</blockquote><table><tr><td>Cellule</td></tr></table>'
    expect(validateArticleContent(html)).toEqual([])
  })
})

// ============================================================================
// Metas — les coupures constatées sur #456, #457, #459
// ============================================================================

describe('validateArticleMeta', () => {
  it('accepte des metas correctes', () => {
    expect(
      validateArticleMeta({
        metaTitle: 'Créer son site à Toulouse : le guide complet',
        metaDescription:
          'Combien coûte un site, combien de temps faut-il, et comment choisir son prestataire ? Le guide pour les TPE toulousaines qui veulent un site utile.',
      }),
    ).toEqual([])
  })

  it('refuse un titre trop long', () => {
    expect(codes(validateArticleMeta({ metaTitle: 'a'.repeat(61), metaDescription: 'Description correcte.' }))).toContain(
      'meta-title-length',
    )
  })

  it('refuse un titre coupé en plein vol (cas réel #459)', () => {
    const issues = validateArticleMeta({
      metaTitle: 'Design UX & accessibilité web : convertir 3x plus de',
      metaDescription: 'Description correcte.',
    })
    expect(codes(issues)).toContain('meta-title-truncated')
  })

  it('refuse une description qui se termine par des points de suspension (cas réel #456)', () => {
    const issues = validateArticleMeta({
      metaTitle: 'Un titre correct',
      metaDescription: 'Site optimisé, visibilité, automatisation : le guide complet...',
    })
    expect(codes(issues)).toContain('meta-description-truncated')
  })

  it('refuse une description trop longue', () => {
    expect(
      codes(validateArticleMeta({ metaTitle: 'Un titre', metaDescription: 'a'.repeat(161) })),
    ).toContain('meta-description-length')
  })

  it('refuse des metas absentes', () => {
    expect(codes(validateArticleMeta({ metaTitle: '', metaDescription: '' }))).toEqual([
      'meta-title-missing',
      'meta-description-missing',
    ])
  })
})

// ============================================================================
// Page exportée — le défaut du double H1 vu sur #455
// ============================================================================

describe('validateExportedPage', () => {
  it('exige exactement un H1', () => {
    expect(validateExportedPage('<html><body><h1>Titre</h1><h2>S</h2></body></html>')).toEqual([])
    expect(codes(validateExportedPage('<h1>A</h1><h1>A</h1>'))).toContain('page-multiple-h1')
    expect(codes(validateExportedPage('<h2>Sans titre principal</h2>'))).toContain('page-missing-h1')
  })

  it('signale un lien interne mort', () => {
    const issues = validateExportedPage('<h1>T</h1><a href="/page-inexistante">texte</a>', {
      publishedSlugs: ['page-publiee'],
    })
    expect(codes(issues)).toContain('dead-internal-link')
  })

  it('accepte un lien vers une page publiée et les liens externes', () => {
    const issues = validateExportedPage(
      '<h1>T</h1><a href="/page-publiee">a</a><a href="https://google.com">b</a><a href="#ancre">c</a>',
      { publishedSlugs: ['page-publiee'] },
    )
    expect(issues).toEqual([])
  })
})
