import { describe, it, expect } from 'vitest'
import { injectInternalLinks } from '../../../../scripts/auto-article/heuristics/inject-internal-links.js'

const T = (id: number, slug: string, anchor: string) => ({ targetId: id, slug, anchor })

describe('auto:inject-internal-links', () => {
  it('pose un lien à la première occurrence de l\'ancre', () => {
    const { html, applied } = injectInternalLinks(
      '<p>Le référencement local est essentiel pour une PME.</p>',
      [T(10, 'referencement-local', 'référencement local')],
    )
    expect(html).toContain('<a href="/referencement-local" data-slug="referencement-local">référencement local</a>')
    expect(applied).toHaveLength(1)
    expect(applied[0]).toMatchObject({ targetId: 10, anchorText: 'référencement local' })
    expect(applied[0].position).toMatch(/^char-\d+$/)
  })

  it('préserve la casse d\'origine de l\'ancre', () => {
    const { html } = injectInternalLinks('<p>Le Référencement Local ici.</p>', [T(1, 's', 'référencement local')])
    expect(html).toContain('>Référencement Local</a>')
  })

  it('n\'enregistre RIEN si l\'ancre est absente (parité manuel)', () => {
    const { html, applied } = injectInternalLinks('<p>Aucun rapport ici.</p>', [T(1, 's', 'introuvable')])
    expect(applied).toEqual([])
    expect(html).toBe('<p>Aucun rapport ici.</p>')
  })

  it('ne transforme jamais un titre en lien', () => {
    const { applied } = injectInternalLinks(
      '<h2>Le référencement local</h2><p>Texte sans le terme cible.</p>',
      [T(1, 's', 'référencement local')],
    )
    expect(applied).toEqual([])
  })

  it('préfère une occurrence en paragraphe à celle d\'un titre', () => {
    const { html } = injectInternalLinks(
      '<h2>Le référencement local</h2><p>On parle de référencement local ici.</p>',
      [T(1, 'ref', 'référencement local')],
    )
    // Le H2 reste intact, le lien va dans le <p>
    expect(html).toContain('<h2>Le référencement local</h2>')
    expect(html).toContain('<p>On parle de <a href="/ref"')
  })

  it('n\'imbrique jamais un lien dans un lien existant', () => {
    const { applied } = injectInternalLinks(
      '<p>Voir <a href="/autre">référencement local</a> déjà lié.</p>',
      [T(1, 's', 'référencement local')],
    )
    expect(applied).toEqual([])
  })

  it('ne réutilise pas une ancre déjà consommée par une autre cible', () => {
    const { html, applied } = injectInternalLinks(
      '<p>seo ici, puis seo là, puis seo encore.</p>',
      [T(1, 'a', 'seo'), T(2, 'b', 'seo')],
    )
    expect(applied).toHaveLength(2)
    expect(applied[0].targetId).toBe(1)
    expect(applied[1].targetId).toBe(2)
    expect(html.match(/<a /g)).toHaveLength(2)
    // positions distinctes
    expect(applied[0].position).not.toBe(applied[1].position)
  })

  it('plafonne le nombre de liens', () => {
    const text = '<p>' + Array.from({ length: 10 }, (_, i) => `mot${i}`).join(' ') + '</p>'
    const targets = Array.from({ length: 10 }, (_, i) => T(i + 1, `s${i}`, `mot${i}`))
    const { applied } = injectInternalLinks(text, targets, { max: 3 })
    expect(applied).toHaveLength(3)
  })

  it('ignore une cible sans slug', () => {
    const { applied } = injectInternalLinks('<p>référencement local</p>', [T(1, '', 'référencement local')])
    expect(applied).toEqual([])
  })

  it('gère plusieurs liens et rend un HTML cohérent', () => {
    const { html, applied } = injectInternalLinks(
      '<p>La stratégie digitale et le référencement local sont liés.</p>',
      [T(1, 'strat', 'stratégie digitale'), T(2, 'ref', 'référencement local')],
    )
    expect(applied).toHaveLength(2)
    expect(html).toContain('<a href="/strat"')
    expect(html).toContain('<a href="/ref"')
    // Le texte reste lisible, pas de balise cassée
    expect(html.startsWith('<p>La ')).toBe(true)
    expect(html.endsWith(' sont liés.</p>')).toBe(true)
  })

  it('retourne le html inchangé sans cible', () => {
    expect(injectInternalLinks('<p>x</p>', [])).toEqual({ html: '<p>x</p>', applied: [] })
  })
})
