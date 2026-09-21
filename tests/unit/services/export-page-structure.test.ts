/**
 * Contrôle de la page HTML exportée — les deux défauts de l'audit 2026-09-19 :
 *   1. double H1 (le gabarit posait le sien, le contenu gardait le sien) ;
 *   2. sections « Où … » absentes des données structurées FAQ, à cause du `\b`
 *      de JavaScript qui ignore les lettres accentuées.
 */
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateExportHtml, generateJsonLd } from '../../../server/services/article/export.service'
import { validateExportedPage } from '../../../shared/content-validators'

const BASE = {
  title: 'Créer son site à Toulouse',
  metaTitle: 'Créer son site à Toulouse : le guide',
  metaDescription: 'Le guide pour les TPE toulousaines.',
  cocoonName: 'Création de site web',
}

describe('generateExportHtml — structure de la page', () => {
  it('ne produit qu’un seul H1, même si le contenu en porte un', async () => {
    const html = await generateExportHtml({
      ...BASE,
      content: '<h1>Créer son site à Toulouse</h1><h2>Combien ça coûte ?</h2><p>Entre 2 000 et 8 000 €.</p>',
    })

    expect([...html.matchAll(/<h1\b/gi)]).toHaveLength(1)
    expect(validateExportedPage(html)).toEqual([])
  })

  it('garde le contenu éditorial intact', async () => {
    const html = await generateExportHtml({
      ...BASE,
      content: '<h2>Un titre</h2><p>Un paragraphe qui doit survivre.</p>',
    })

    expect(html).toContain('Un paragraphe qui doit survivre.')
    expect(html).toContain('Un titre')
  })
})

describe('generateJsonLd — questions du FAQPage', () => {
  it('retient une section « Où … » sans point d’interrogation (régression du \\b)', () => {
    const jsonLd = generateJsonLd({
      ...BASE,
      slug: 'creer-son-site-a-toulouse',
      content:
        '<h2>Où trouver un prestataire web à Toulouse</h2><p>Trois pistes fiables pour chercher près de chez vous.</p>',
    })

    expect(jsonLd).toContain('FAQPage')
    expect(jsonLd).toContain('Où trouver un prestataire web à Toulouse')
  })

  it('retient aussi une section formulée avec un point d’interrogation', () => {
    const jsonLd = generateJsonLd({
      ...BASE,
      slug: 'creer-son-site-a-toulouse',
      content: '<h2>Combien coûte un site vitrine ?</h2><p>Entre 2 000 et 8 000 euros.</p>',
    })

    expect(jsonLd).toContain('Combien coûte un site vitrine ?')
  })
})
