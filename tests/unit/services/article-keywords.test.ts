import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock json-storage before importing the service
vi.mock('../../../server/utils/json-storage', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
}))

import { readJson, writeJson } from '../../../server/utils/json-storage'

const mockReadJson = vi.mocked(readJson)
const mockWriteJson = vi.mocked(writeJson)

const MOCK_ARTICLES_DB = {
  theme: { nom: 'Test Theme', description: 'desc' },
  silos: [
    {
      nom: 'Silo 1',
      description: 'desc',
      cocons: [
        {
          nom: 'Cocoon A',
          articles: [
            { titre: 'Article 1', type: 'Pilier', slug: 'https://example.com/pages/article-1', topic: 'topic1' },
            { titre: 'Article 2', type: 'Intermédiaire', slug: 'https://example.com/pages/article-2', topic: 'topic2' },
          ],
        },
      ],
    },
  ],
}

const MOCK_ARTICLE_KEYWORDS_DB = {
  keywords_par_article: [
    {
      articleSlug: 'article-1',
      capitaine: 'mot clef principal',
      lieutenants: ['lieutenant 1', 'lieutenant 2'],
      lexique: ['lsi 1', 'lsi 2', 'lsi 3'],
    },
  ],
}

// Reset module cache between tests so the service's caches are cleared
beforeEach(async () => {
  vi.resetModules()
  mockReadJson.mockReset()
  mockWriteJson.mockReset()
})

async function importService() {
  const mod = await import('../../../server/services/data.service')
  return mod
}

describe('data.service — getArticleKeywords', () => {
  it('returns null when article slug is not found', async () => {
    mockReadJson.mockResolvedValue(MOCK_ARTICLE_KEYWORDS_DB)
    const { getArticleKeywords } = await importService()

    const result = await getArticleKeywords('non-existent-slug')

    expect(result).toBeNull()
  })

  it('returns matching entry for existing slug', async () => {
    mockReadJson.mockResolvedValue(MOCK_ARTICLE_KEYWORDS_DB)
    const { getArticleKeywords } = await importService()

    const result = await getArticleKeywords('article-1')

    expect(result).not.toBeNull()
    expect(result!.articleSlug).toBe('article-1')
    expect(result!.capitaine).toBe('mot clef principal')
    expect(result!.lieutenants).toEqual(['lieutenant 1', 'lieutenant 2'])
    expect(result!.lexique).toEqual(['lsi 1', 'lsi 2', 'lsi 3'])
  })

  it('returns empty array gracefully when file cannot be read', async () => {
    mockReadJson.mockRejectedValue(new Error('file not found'))
    const { getArticleKeywords } = await importService()

    const result = await getArticleKeywords('article-1')

    expect(result).toBeNull()
  })
})

describe('data.service — saveArticleKeywords', () => {
  it('creates new entry when slug does not exist', async () => {
    mockReadJson.mockResolvedValue({ keywords_par_article: [] })
    mockWriteJson.mockResolvedValue(undefined)
    const { saveArticleKeywords } = await importService()

    const result = await saveArticleKeywords('new-article', {
      capitaine: 'main keyword',
      lieutenants: ['lt1'],
      lexique: ['lsi1', 'lsi2'],
    })

    expect(result.articleSlug).toBe('new-article')
    expect(result.capitaine).toBe('main keyword')
    expect(result.lieutenants).toEqual(['lt1'])
    expect(result.lexique).toEqual(['lsi1', 'lsi2'])
    expect(mockWriteJson).toHaveBeenCalledWith(
      expect.stringContaining('article-keywords.json'),
      {
        keywords_par_article: [
          { articleSlug: 'new-article', capitaine: 'main keyword', lieutenants: ['lt1'], lexique: ['lsi1', 'lsi2'] },
        ],
      },
    )
  })

  it('updates existing entry when slug already exists', async () => {
    mockReadJson.mockResolvedValue({
      keywords_par_article: [
        { articleSlug: 'existing-article', capitaine: 'old keyword', lieutenants: ['old lt'], lexique: ['old lsi'] },
      ],
    })
    mockWriteJson.mockResolvedValue(undefined)
    const { saveArticleKeywords } = await importService()

    const result = await saveArticleKeywords('existing-article', {
      capitaine: 'updated keyword',
      lieutenants: ['new lt1', 'new lt2'],
      lexique: ['new lsi1'],
    })

    expect(result.articleSlug).toBe('existing-article')
    expect(result.capitaine).toBe('updated keyword')
    expect(mockWriteJson).toHaveBeenCalledWith(
      expect.stringContaining('article-keywords.json'),
      {
        keywords_par_article: [
          { articleSlug: 'existing-article', capitaine: 'updated keyword', lieutenants: ['new lt1', 'new lt2'], lexique: ['new lsi1'] },
        ],
      },
    )
  })
})

describe('data.service — getArticleKeywordsByCocoon', () => {
  it('filters article keywords by cocoon articles', async () => {
    // First call reads articles DB, second reads statuses, third reads article keywords
    mockReadJson
      .mockResolvedValueOnce(MOCK_ARTICLES_DB) // loadDb → BDD_Articles_Blog.json
      .mockResolvedValueOnce({}) // loadStatuses → article-statuses.json
      .mockResolvedValueOnce({
        keywords_par_article: [
          { articleSlug: 'article-1', capitaine: 'kw1', lieutenants: [], lexique: [] },
          { articleSlug: 'article-2', capitaine: 'kw2', lieutenants: [], lexique: [] },
          { articleSlug: 'article-other', capitaine: 'kw3', lieutenants: [], lexique: [] },
        ],
      })
    const { getArticleKeywordsByCocoon } = await importService()

    const result = await getArticleKeywordsByCocoon('Cocoon A')

    expect(result).toHaveLength(2)
    expect(result.map(ak => ak.articleSlug)).toEqual(['article-1', 'article-2'])
  })

  it('returns empty array for non-existent cocoon', async () => {
    mockReadJson
      .mockResolvedValueOnce(MOCK_ARTICLES_DB)
      .mockResolvedValueOnce({})
    const { getArticleKeywordsByCocoon } = await importService()

    const result = await getArticleKeywordsByCocoon('Non-existent Cocoon')

    expect(result).toEqual([])
  })
})
