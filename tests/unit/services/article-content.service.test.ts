// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('../../../server/db/client', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { getArticleContent, saveArticleContent } from '../../../server/services/article/article-content.service'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('article-content.service', () => {
  describe('getArticleContent', () => {
    it('returns stored content when row exists', async () => {
      // article_content SELECT
      mockQuery.mockResolvedValueOnce({
        rows: [{ outline: { sections: [] }, content: '<p>Hello</p>', updated_at: new Date('2026-03-06') }],
        rowCount: 1,
      })
      // articles SELECT (meta)
      mockQuery.mockResolvedValueOnce({
        rows: [{ meta_title: 'Title', meta_description: 'Desc', seo_score: 80, geo_score: 70 }],
        rowCount: 1,
      })

      const result = await getArticleContent(1)

      expect(result.outline).toEqual({ sections: [] })
      expect(result.content).toBe('<p>Hello</p>')
      expect(result.metaTitle).toBe('Title')
      expect(result.metaDescription).toBe('Desc')
      expect(result.seoScore).toBe(80)
      expect(result.geoScore).toBe(70)
    })

    it('normalizes outline from JSON string', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ outline: '{"sections":[]}', content: null, updated_at: null }],
        rowCount: 1,
      })
      mockQuery.mockResolvedValueOnce({ rows: [{}], rowCount: 1 })

      const result = await getArticleContent(1)

      expect(result.outline).toEqual({ sections: [] })
    })

    it('returns default content when no row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await getArticleContent(99)

      expect(result.outline).toBeNull()
      expect(result.content).toBeNull()
      expect(result.updatedAt).toBeNull()
    })
  })

  describe('saveArticleContent', () => {
    it('upserts outline and content into article_content', async () => {
      // UPSERT article_content
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      // getArticleContent: article_content SELECT
      mockQuery.mockResolvedValueOnce({
        rows: [{ outline: { sections: [] }, content: '<p>New</p>', updated_at: new Date() }],
        rowCount: 1,
      })
      // getArticleContent: articles SELECT
      mockQuery.mockResolvedValueOnce({ rows: [{}], rowCount: 1 })

      const result = await saveArticleContent(1, { content: '<p>New</p>' })

      expect(result.content).toBe('<p>New</p>')
      expect(mockQuery.mock.calls[0][0]).toContain('article_content')
    })

    it('updates meta fields in articles table', async () => {
      // UPDATE articles (no outline/content → skip article_content)
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      // getArticleContent: article_content SELECT
      mockQuery.mockResolvedValueOnce({
        rows: [{ outline: null, content: null, updated_at: new Date() }],
        rowCount: 1,
      })
      // getArticleContent: articles SELECT
      mockQuery.mockResolvedValueOnce({
        rows: [{ meta_title: 'New Title', meta_description: null, seo_score: 90, geo_score: null }],
        rowCount: 1,
      })

      const result = await saveArticleContent(1, { metaTitle: 'New Title', seoScore: 90 })

      expect(result.metaTitle).toBe('New Title')
      expect(result.seoScore).toBe(90)
      expect(mockQuery.mock.calls[0][0]).toContain('UPDATE articles')
    })

    it('returns updatedAt from getArticleContent after save', async () => {
      // UPSERT
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      // getArticleContent: article_content
      mockQuery.mockResolvedValueOnce({
        rows: [{ outline: null, content: null, updated_at: new Date('2026-04-19') }],
        rowCount: 1,
      })
      // getArticleContent: articles
      mockQuery.mockResolvedValueOnce({ rows: [{}], rowCount: 1 })

      const result = await saveArticleContent(1, { content: '<p>X</p>' })

      expect(result.updatedAt).not.toBeNull()
    })
  })
})
