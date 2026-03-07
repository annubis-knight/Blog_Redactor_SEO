import { describe, it, expect } from 'vitest'
import { rawArticlesDbSchema } from '../../../shared/schemas/article.schema.js'
import { rawKeywordsDbSchema } from '../../../shared/schemas/keyword.schema.js'

describe('article.schema — rawArticlesDbSchema', () => {
  it('validates valid articles DB structure', () => {
    const valid = {
      cocons_semantiques: [
        {
          nom: 'Test Cocoon',
          articles: [
            { titre: 'Article 1', type: 'Pilier', slug: 'https://example.com/pages/article-1', theme: null },
          ],
        },
      ],
    }
    expect(() => rawArticlesDbSchema.parse(valid)).not.toThrow()
  })

  it('rejects missing cocons_semantiques', () => {
    expect(() => rawArticlesDbSchema.parse({})).toThrow()
  })

  it('rejects empty cocons_semantiques', () => {
    expect(() => rawArticlesDbSchema.parse({ cocons_semantiques: [] })).toThrow()
  })

  it('rejects invalid article type', () => {
    const invalid = {
      cocons_semantiques: [
        {
          nom: 'Test',
          articles: [
            { titre: 'A', type: 'Invalid', slug: 'url', theme: null },
          ],
        },
      ],
    }
    expect(() => rawArticlesDbSchema.parse(invalid)).toThrow()
  })

  it('accepts all valid article types', () => {
    for (const type of ['Pilier', 'Intermédiaire', 'Spécialisé']) {
      const data = {
        cocons_semantiques: [
          { nom: 'C', articles: [{ titre: 'A', type, slug: 'url', theme: null }] },
        ],
      }
      expect(() => rawArticlesDbSchema.parse(data)).not.toThrow()
    }
  })

  it('validates the actual BDD_Articles_Blog.json file', async () => {
    const { readJson } = await import('../../../server/utils/json-storage.js')
    const { join } = await import('path')
    const data = await readJson(join(process.cwd(), 'data', 'BDD_Articles_Blog.json'))
    expect(() => rawArticlesDbSchema.parse(data)).not.toThrow()
  })
})

describe('keyword.schema — rawKeywordsDbSchema', () => {
  it('validates valid keywords DB structure', () => {
    const valid = {
      seo_data: [
        { mot_clef: 'test keyword', cocon_seo: 'Test Cocoon', type_mot_clef: 'Pilier' },
      ],
    }
    expect(() => rawKeywordsDbSchema.parse(valid)).not.toThrow()
  })

  it('rejects missing seo_data', () => {
    expect(() => rawKeywordsDbSchema.parse({})).toThrow()
  })

  it('rejects empty seo_data', () => {
    expect(() => rawKeywordsDbSchema.parse({ seo_data: [] })).toThrow()
  })

  it('rejects invalid keyword type', () => {
    const invalid = {
      seo_data: [{ mot_clef: 'kw', cocon_seo: 'c', type_mot_clef: 'Invalid' }],
    }
    expect(() => rawKeywordsDbSchema.parse(invalid)).toThrow()
  })

  it('accepts all valid keyword types', () => {
    for (const type of ['Pilier', 'Moyenne traine', 'Longue traine']) {
      const data = {
        seo_data: [{ mot_clef: 'kw', cocon_seo: 'c', type_mot_clef: type }],
      }
      expect(() => rawKeywordsDbSchema.parse(data)).not.toThrow()
    }
  })

  it('validates the actual BDD_Mots_Clefs_SEO.json file', async () => {
    const { readJson } = await import('../../../server/utils/json-storage.js')
    const { join } = await import('path')
    const data = await readJson(join(process.cwd(), 'data', 'BDD_Mots_Clefs_SEO.json'))
    expect(() => rawKeywordsDbSchema.parse(data)).not.toThrow()
  })
})
