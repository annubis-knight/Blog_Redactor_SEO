import { describe, it, expect } from 'vitest'
import { rewriteInternalLinks } from '../../../shared/internal-links'
import { blogPath, blogUrl, SITE_ORIGIN } from '../../../shared/constants/site.constants'

describe('site.constants', () => {
  it('construit le chemin et l’URL canonique d’un article', () => {
    expect(blogPath('creation-site-internet-toulouse')).toBe('/blog/creation-site-internet-toulouse')
    expect(blogUrl('creation-site-internet-toulouse')).toBe(
      'https://www.propulsitetoulouse.website/blog/creation-site-internet-toulouse',
    )
  })

  it('accepte une origine de remplacement (pré-production)', () => {
    expect(blogUrl('x', 'https://preprod.exemple.fr/')).toBe('https://preprod.exemple.fr/blog/x')
  })

  it('pointe le domaine validé', () => {
    expect(SITE_ORIGIN).toBe('https://www.propulsitetoulouse.website')
  })
})

describe('rewriteInternalLinks', () => {
  const KNOWN = { slugById: { 42: 'prix-site-internet-tpe' }, knownSlugs: ['prix-site-internet-tpe'] }

  it('convertit un lien posé par l’éditeur (#article-<id>)', () => {
    const { html, rewritten } = rewriteInternalLinks(
      '<p>Voir <a href="#article-42">nos tarifs</a>.</p>',
      KNOWN,
    )

    expect(html).toBe('<p>Voir <a href="/blog/prix-site-internet-tpe">nos tarifs</a>.</p>')
    expect(rewritten).toEqual(['prix-site-internet-tpe'])
  })

  it('convertit un lien posé par le robot (/slug + data-slug)', () => {
    const { html } = rewriteInternalLinks(
      '<p><a href="/prix-site-internet-tpe" data-slug="prix-site-internet-tpe">prix</a></p>',
      KNOWN,
    )

    expect(html).toContain('href="/blog/prix-site-internet-tpe"')
    expect(html).toContain('data-slug="prix-site-internet-tpe"')
  })

  it('déballe un lien dont la cible n’est pas publiée', () => {
    const { html, unwrapped } = rewriteInternalLinks(
      '<p>Voir <a href="/article-fantome">cette page</a>.</p>',
      KNOWN,
    )

    expect(html).toBe('<p>Voir cette page.</p>')
    expect(unwrapped).toEqual(['cette page'])
  })

  it('déballe aussi un identifiant inconnu', () => {
    const { html } = rewriteInternalLinks('<a href="#article-999">texte</a>', KNOWN)
    expect(html).toBe('texte')
  })

  describe('liens à ne pas toucher', () => {
    const UNTOUCHED = [
      '<a href="https://www.google.com/business">Google</a>',
      '<a href="mailto:contact@exemple.fr">nous écrire</a>',
      '<a href="tel:+33500000000">appeler</a>',
      '<a href="#sommaire-section-2">aller à la section</a>',
      '<a href="/blog/prix-site-internet-tpe">déjà canonique</a>',
    ]

    for (const html of UNTOUCHED) {
      it(`« ${html.slice(0, 45)}… »`, () => {
        expect(rewriteInternalLinks(html, KNOWN).html).toBe(html)
      })
    }
  })

  it('accepte tout slug quand aucune liste de publiés n’est fournie', () => {
    const { html } = rewriteInternalLinks('<a href="/un-slug">x</a>', {})
    expect(html).toBe('<a href="/blog/un-slug">x</a>')
  })

  it('gère un contenu vide', () => {
    expect(rewriteInternalLinks('', KNOWN).html).toBe('')
  })
})
