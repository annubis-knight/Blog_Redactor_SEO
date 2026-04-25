import { describe, it, expect } from 'vitest'
import { rawArticlesDbSchema } from '../../../shared/schemas/article.schema.js'
import { rawKeywordsDbSchema } from '../../../shared/schemas/keyword.schema.js'

describe('article.schema — rawArticlesDbSchema', () => {
  it('validates valid articles DB structure', () => {
    const valid = {
      theme: { nom: 'Test Theme', description: 'Desc' },
      silos: [
        {
          nom: 'Test Silo',
          description: 'Silo description',
          cocons: [
            {
              nom: 'Test Cocoon',
              articles: [
                { id: 1, titre: 'Article 1', type: 'Pilier', slug: 'https://example.com/pages/article-1', topic: null },
              ],
            },
          ],
        },
      ],
    }
    expect(() => rawArticlesDbSchema.parse(valid)).not.toThrow()
  })

  it('rejects missing theme or silos', () => {
    expect(() => rawArticlesDbSchema.parse({})).toThrow()
  })

  it('rejects empty silos', () => {
    expect(() => rawArticlesDbSchema.parse({ theme: { nom: 'T', description: '' }, silos: [] })).toThrow()
  })

  it('rejects invalid article type', () => {
    const invalid = {
      theme: { nom: 'T', description: '' },
      silos: [
        {
          nom: 'S',
          description: '',
          cocons: [
            {
              nom: 'Test',
              articles: [
                { id: 1, titre: 'A', type: 'Invalid', slug: 'url', topic: null },
              ],
            },
          ],
        },
      ],
    }
    expect(() => rawArticlesDbSchema.parse(invalid)).toThrow()
  })

  it('accepts all valid article types', () => {
    for (const type of ['Pilier', 'Intermédiaire', 'Spécialisé']) {
      const data = {
        theme: { nom: 'T', description: '' },
        silos: [
          {
            nom: 'S',
            description: '',
            cocons: [
              { nom: 'C', articles: [{ id: 1, titre: 'A', type, slug: 'url', topic: null }] },
            ],
          },
        ],
      }
      expect(() => rawArticlesDbSchema.parse(data)).not.toThrow()
    }
  })

  it.skip('validates the actual BDD_Articles_Blog.json file (migrated to PostgreSQL)', async () => {
    // JSON files removed after PostgreSQL migration
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

  it.skip('validates the actual BDD_Mots_Clefs_SEO.json file (migrated to PostgreSQL)', async () => {
    // JSON files removed after PostgreSQL migration
  })
})

describe('strategy.schema — cocoonStrategySchema suggestedTopics', async () => {
  const { cocoonStrategySchema, cocoonSuggestRequestSchema } = await import('../../../shared/schemas/strategy.schema')

  const baseStrategy = {
    cocoonSlug: 'test',
    cible: { input: '', suggestion: null, validated: '' },
    douleur: { input: '', suggestion: null, validated: '' },
    angle: { input: '', suggestion: null, validated: '' },
    promesse: { input: '', suggestion: null, validated: '' },
    cta: { input: '', suggestion: null, validated: '' },
    proposedArticles: [],
    completedSteps: 0,
    updatedAt: '2026-04-04',
  }

  it('accepts strategy with suggestedTopics and topicsUserContext', () => {
    const data = {
      ...baseStrategy,
      suggestedTopics: [{ id: '1', topic: 'SEO locale', checked: true }],
      topicsUserContext: 'Mon contexte',
    }
    const result = cocoonStrategySchema.parse(data)
    expect(result.suggestedTopics).toHaveLength(1)
    expect(result.topicsUserContext).toBe('Mon contexte')
  })

  it('defaults suggestedTopics to [] and topicsUserContext to empty string when missing', () => {
    const result = cocoonStrategySchema.parse(baseStrategy)
    expect(result.suggestedTopics).toEqual([])
    expect(result.topicsUserContext).toBe('')
  })

  it('accepts articles-topics as a valid step in cocoonSuggestRequestSchema', () => {
    const data = {
      step: 'articles-topics',
      currentInput: 'Propose les sujets.',
      context: { cocoonName: 'Test', siloName: 'Silo' },
    }
    expect(() => cocoonSuggestRequestSchema.parse(data)).not.toThrow()
  })
})
