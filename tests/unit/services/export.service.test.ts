import { describe, it, expect } from 'vitest'
import { generateExportHtml, generateJsonLd } from '../../../server/services/article/export.service'

describe('export.service', () => {
  describe('generateExportHtml', () => {
    it('generates valid HTML with meta title and description', async () => {
      const html = await generateExportHtml({
        title: 'Mon Article',
        metaTitle: 'Meta Title SEO',
        metaDescription: 'Description pour le SEO',
        cocoonName: 'Marketing Digital',
        content: '<p>Introduction.</p><h2>Section 1</h2><p>Contenu section 1.</p>',
      })

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<title>Meta Title SEO</title>')
      expect(html).toContain('content="Description pour le SEO"')
      expect(html).toContain('<h1>Mon Article</h1>')
    })

    it('builds a sommaire from H2 headings', async () => {
      const html = await generateExportHtml({
        title: 'Test',
        metaTitle: 'Test',
        metaDescription: 'Desc',
        cocoonName: 'Cocon',
        content: '<h2>Chapitre 1</h2><p>A</p><h2>Chapitre 2</h2><p>B</p>',
      })

      expect(html).toContain('Sommaire')
      expect(html).toContain('Chapitre 1')
      expect(html).toContain('Chapitre 2')
      expect(html).toContain('href="#chapitre-1"')
      expect(html).toContain('href="#chapitre-2"')
    })

    it('separates conclusion from chapters', async () => {
      const html = await generateExportHtml({
        title: 'Test',
        metaTitle: 'Test',
        metaDescription: 'Desc',
        cocoonName: 'Cocon',
        content: '<h2>Section</h2><p>A</p><h2>Conclusion</h2><p>Final.</p>',
      })

      expect(html).toContain('id="conclusion"')
      expect(html).toContain('Final.')
    })

    it('includes breadcrumb with cocoon name', async () => {
      const html = await generateExportHtml({
        title: 'Mon Article',
        metaTitle: 'Test',
        metaDescription: 'Desc',
        cocoonName: 'SEO Local',
        content: '<p>Intro</p>',
      })

      expect(html).toContain('Propulsite / Blog / SEO Local / Mon Article')
    })

    it('includes JSON-LD when provided', async () => {
      const jsonLd = '{"@type":"Article"}'
      const html = await generateExportHtml({
        title: 'Test',
        metaTitle: 'Test',
        metaDescription: 'Desc',
        cocoonName: 'Cocon',
        content: '<p>A</p>',
        jsonLd,
      })

      expect(html).toContain('application/ld+json')
      expect(html).toContain('"@type":"Article"')
    })

    it('includes Propulsite template structure', async () => {
      const html = await generateExportHtml({
        title: 'Test',
        metaTitle: 'Test',
        metaDescription: 'Desc',
        cocoonName: 'Cocon',
        content: '<p>A</p>',
      })

      expect(html).toContain('sectionHeroRealisation')
      expect(html).toContain('containerMax')
      expect(html).toContain('w3-include-html="/components/navbar.html"')
      expect(html).toContain('w3-include-html="/components/footer.html"')
      expect(html).toContain('DM+Serif+Text')
    })

    it('escapes HTML in meta values', async () => {
      const html = await generateExportHtml({
        title: 'Test "quotes"',
        metaTitle: 'Title <script>',
        metaDescription: 'Desc "with" <tags>',
        cocoonName: 'Cocon',
        content: '<p>A</p>',
      })

      expect(html).toContain('<title>Title &lt;script&gt;</title>')
      expect(html).toContain('content="Desc &quot;with&quot; &lt;tags&gt;"')
      expect(html).not.toContain('<title>Title <script></title>')
    })
  })

  describe('generateJsonLd', () => {
    it('generates Article schema', () => {
      const jsonLd = generateJsonLd({
        title: 'Mon Article',
        metaDescription: 'Description',
        cocoonName: 'Marketing',
        slug: 'mon-article',
        content: '<h2>Section</h2><p>Text</p>',
      })

      const schemas = JSON.parse(jsonLd)
      expect(schemas).toBeInstanceOf(Array)

      const articleSchema = schemas.find((s: any) => s['@type'] === 'Article')
      expect(articleSchema).toBeDefined()
      expect(articleSchema.headline).toBe('Mon Article')
      expect(articleSchema.author.name).toBe('PropulSite')
    })

    it('generates BreadcrumbList schema', () => {
      const jsonLd = generateJsonLd({
        title: 'Test',
        metaDescription: 'Desc',
        cocoonName: 'SEO',
        slug: 'test-article',
        content: '<p>A</p>',
      })

      const schemas = JSON.parse(jsonLd)
      const breadcrumb = schemas.find((s: any) => s['@type'] === 'BreadcrumbList')
      expect(breadcrumb).toBeDefined()
      expect(breadcrumb.itemListElement).toHaveLength(4)
      expect(breadcrumb.itemListElement[2].name).toBe('SEO')
      expect(breadcrumb.itemListElement[3].name).toBe('Test')
    })

    it('generates FAQPage schema for question headings', () => {
      const jsonLd = generateJsonLd({
        title: 'Test',
        metaDescription: 'Desc',
        cocoonName: 'SEO',
        slug: 'test',
        content: '<h2>Comment optimiser son SEO ?</h2><p>Il faut suivre les bonnes pratiques.</p><h2>Section normale</h2><p>Autre texte.</p>',
      })

      const schemas = JSON.parse(jsonLd)
      const faq = schemas.find((s: any) => s['@type'] === 'FAQPage')
      expect(faq).toBeDefined()
      expect(faq.mainEntity).toHaveLength(1)
      expect(faq.mainEntity[0].name).toBe('Comment optimiser son SEO ?')
      expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Il faut suivre les bonnes pratiques.')
    })

    it('does not include FAQPage when no questions', () => {
      const jsonLd = generateJsonLd({
        title: 'Test',
        metaDescription: 'Desc',
        cocoonName: 'SEO',
        slug: 'test',
        content: '<h2>Section normale</h2><p>Texte.</p>',
      })

      const schemas = JSON.parse(jsonLd)
      const faq = schemas.find((s: any) => s['@type'] === 'FAQPage')
      expect(faq).toBeUndefined()
    })

    it('detects French question words', () => {
      const jsonLd = generateJsonLd({
        title: 'Test',
        metaDescription: 'Desc',
        cocoonName: 'SEO',
        slug: 'test',
        content: '<h2>Pourquoi le SEO est important</h2><p>Parce que c\'est vital.</p><h2>Quels outils utiliser</h2><p>Google Search Console.</p>',
      })

      const schemas = JSON.parse(jsonLd)
      const faq = schemas.find((s: any) => s['@type'] === 'FAQPage')
      expect(faq).toBeDefined()
      expect(faq.mainEntity).toHaveLength(2)
    })
  })
})
