// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('../../../server/db/client', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { getStrategy, saveStrategy } from '../../../server/services/strategy/strategy.service'
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
})

describe('strategy.service', () => {
  describe('getStrategy', () => {
    it('returns null when no row exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await getStrategy(99)

      expect(result).toBeNull()
    })

    it('returns parsed strategy when row exists', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ data: validStrategy, completed_steps: 1 }],
        rowCount: 1,
      })

      const result = await getStrategy(1)

      expect(result).toEqual(validStrategy)
    })

    it('returns null when data fails Zod validation', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ data: { id: 1, completedSteps: 99 }, completed_steps: 99 }],
        rowCount: 1,
      })

      const result = await getStrategy(1)

      expect(result).toBeNull()
    })
  })

  describe('saveStrategy', () => {
    it('saves and returns merged strategy', async () => {
      // getStrategy SELECT → no existing
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      // UPSERT
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await saveStrategy(1, {
        cible: { input: 'Dirigeants PME', suggestion: null, validated: '' },
      })

      expect(result.id).toBe(1)
      expect(result.cible.input).toBe('Dirigeants PME')
      expect(result.completedSteps).toBe(0)
      expect(mockQuery.mock.calls[1][0]).toContain('article_strategies')
    })

    it('merges with existing data', async () => {
      // getStrategy SELECT → existing
      mockQuery.mockResolvedValueOnce({
        rows: [{ data: validStrategy, completed_steps: 1 }],
        rowCount: 1,
      })
      // UPSERT
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await saveStrategy(1, {
        douleur: { input: 'Pas de clients en ligne', suggestion: 'Ciblez le SEO local', validated: 'OK' },
        completedSteps: 2,
      })

      expect(result.id).toBe(1)
      expect(result.cible).toEqual(validStrategy.cible)
      expect(result.douleur.input).toBe('Pas de clients en ligne')
      expect(result.completedSteps).toBe(2)
    })

    it('enforces id consistency', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      const result = await saveStrategy(1, { id: 2 } as any)

      expect(result.id).toBe(1)
    })

    it('rejects invalid merged strategy via Zod', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await expect(
        saveStrategy(1, { completedSteps: 99 } as any),
      ).rejects.toThrow()
    })
  })
})
