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

import { getStrategy, saveStrategy } from '../../../server/services/strategy.service'
import type { ArticleStrategy } from '../../../shared/types/index'

const validStrategy: ArticleStrategy = {
  id: 1,
  cible: { input: 'PME du BTP', suggestion: 'Ciblez les artisans', validated: 'PME du BTP validé' },
  douleur: { input: 'Manque de visibilité', suggestion: null, validated: '' },
  aiguillage: { suggestedType: 'Pilier', suggestedParent: null, suggestedChildren: ['article-enfant'], validated: false },
  angle: { input: '', suggestion: null, validated: '' },
  promesse: { input: '', suggestion: null, validated: '' },
  cta: { type: 'service', target: '', suggestion: null },
  completedSteps: 1,
  updatedAt: '2026-03-13T10:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockWriteJson.mockResolvedValue(undefined)
})

describe('strategy.service', () => {
  describe('getStrategy', () => {
    it('returns null when file does not exist', async () => {
      mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

      const result = await getStrategy(99)

      expect(result).toBeNull()
    })

    it('returns parsed strategy when file exists', async () => {
      mockReadJson.mockResolvedValueOnce(validStrategy)

      const result = await getStrategy(1)

      expect(result).toEqual(validStrategy)
    })

    it('returns null when data fails Zod validation', async () => {
      mockReadJson.mockResolvedValueOnce({ id: 1, completedSteps: 99 })

      const result = await getStrategy(1)

      expect(result).toBeNull()
    })
  })

  describe('saveStrategy', () => {
    it('saves and returns merged strategy', async () => {
      mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

      const result = await saveStrategy(1, {
        cible: { input: 'Dirigeants PME', suggestion: null, validated: '' },
      })

      expect(result.id).toBe(1)
      expect(result.cible.input).toBe('Dirigeants PME')
      expect(result.completedSteps).toBe(0)
      expect(mockWriteJson).toHaveBeenCalledWith(
        expect.stringContaining('1.json'),
        expect.objectContaining({
          id: 1,
          cible: expect.objectContaining({ input: 'Dirigeants PME' }),
          updatedAt: expect.any(String),
        }),
      )
    })

    it('merges with existing data', async () => {
      mockReadJson.mockResolvedValueOnce(validStrategy)

      const result = await saveStrategy(1, {
        douleur: { input: 'Pas de clients en ligne', suggestion: 'Ciblez le SEO local', validated: 'OK' },
        completedSteps: 2,
      })

      expect(result.id).toBe(1)
      expect(result.cible).toEqual(validStrategy.cible)
      expect(result.douleur.input).toBe('Pas de clients en ligne')
      expect(result.completedSteps).toBe(2)
      expect(mockWriteJson).toHaveBeenCalled()
    })

    it('enforces id consistency', async () => {
      mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

      const result = await saveStrategy(1, { id: 2 } as any)

      expect(result.id).toBe(1)
    })

    it('rejects invalid merged strategy via Zod', async () => {
      mockReadJson.mockRejectedValueOnce(new Error('ENOENT'))

      await expect(
        saveStrategy(1, { completedSteps: 99 } as any),
      ).rejects.toThrow()
    })
  })
})
