// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockReadJson, mockWriteJson } = vi.hoisted(() => ({
  mockReadJson: vi.fn(),
  mockWriteJson: vi.fn(),
}))

vi.mock('../../../server/utils/json-storage', () => ({
  readJson: mockReadJson,
  writeJson: mockWriteJson,
}))

import { getArticleContent, saveArticleContent } from '../../../server/services/article-content.service'

beforeEach(() => {
  vi.clearAllMocks()
  mockWriteJson.mockResolvedValue(undefined)
})

describe('article-content.service', () => {
  describe('getArticleContent', () => {
    it('returns stored content when file exists', async () => {
      const stored = {
        outline: '{"sections":[]}',
        content: '<p>Hello</p>',
        metaTitle: 'Title',
        metaDescription: 'Desc',
        seoScore: 80,
        geoScore: 70,
        updatedAt: '2026-03-06T00:00:00.000Z',
      }
      mockReadJson.mockResolvedValueOnce(stored)

      const result = await getArticleContent('test-slug')

      expect(result).toEqual(stored)
    })

    it('returns default content when file does not exist', async () => {
      mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

      const result = await getArticleContent('missing-slug')

      expect(result.outline).toBeNull()
      expect(result.content).toBeNull()
      expect(result.updatedAt).toBeNull()
    })
  })

  describe('saveArticleContent', () => {
    it('merges updates with existing content', async () => {
      mockReadJson.mockResolvedValueOnce({
        outline: '{"sections":[]}',
        content: null,
        metaTitle: null,
        metaDescription: null,
        seoScore: null,
        geoScore: null,
        updatedAt: '2026-03-05T00:00:00.000Z',
      })

      await saveArticleContent('test-slug', { content: '<p>New</p>' })

      expect(mockWriteJson).toHaveBeenCalledWith(
        expect.stringContaining('test-slug.json'),
        expect.objectContaining({
          outline: '{"sections":[]}',
          content: '<p>New</p>',
          updatedAt: expect.any(String),
        }),
      )
    })

    it('creates new file when none exists', async () => {
      mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

      await saveArticleContent('new-slug', { outline: '{"sections":[]}' })

      expect(mockWriteJson).toHaveBeenCalledWith(
        expect.stringContaining('new-slug.json'),
        expect.objectContaining({
          outline: '{"sections":[]}',
          content: null,
          updatedAt: expect.any(String),
        }),
      )
    })

    it('sets updatedAt timestamp', async () => {
      mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

      const result = await saveArticleContent('test-slug', {})

      expect(result.updatedAt).not.toBeNull()
      expect(new Date(result.updatedAt!).getTime()).toBeGreaterThan(0)
    })
  })
})
