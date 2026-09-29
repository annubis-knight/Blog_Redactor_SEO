import { beforeEach, describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import type { ApiUsage, DbOp } from '@shared/types/index.js'

// 2026-09-25 (épopée qualité SEO, C2 · T2) : les tests d'une spec jamais livrée
// (entrées « non lues », onglets api/db/info/error, `setActiveTab`,
// `markAllRead`) sont retirés ; ceux qui visaient l'API réelle du store
// (ajout, suppression, vidage, repli du panneau) sont réécrits sans elle.

const USAGE: ApiUsage = {
  inputTokens: 100,
  outputTokens: 50,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  model: 'claude-haiku-4-5',
  estimatedCost: 0.0025,
}

const DB_OP: DbOp = {
  operation: 'update',
  table: 'articles',
  rowCount: 1,
  ms: 12,
}

describe('useCostLogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('addEntry / addDbEntry / addMessage', () => {
    it('ajoute chaque entrée en tête de liste, avec son niveau', () => {
      const s = useCostLogStore()
      s.addEntry('Validate', USAGE)
      s.addDbEntry('PUT articles', DB_OP)
      s.addMessage('error', 'Quota IA atteint', 'détail')
      expect(s.entries.map(e => [e.level, e.label])).toEqual([
        ['error', 'Quota IA atteint'],
        ['db', 'PUT articles'],
        ['api', 'Validate'],
      ])
      expect(s.entryCount).toBe(3)
      expect(new Set(s.entries.map(e => e.id)).size).toBe(3)
    })

    it('totalCost only sums api entries', () => {
      const s = useCostLogStore()
      s.addEntry('Call A', USAGE)
      s.addEntry('Call B', { ...USAGE, estimatedCost: 0.01 })
      s.addDbEntry('upsert', DB_OP)
      expect(s.totalCost).toBeCloseTo(0.0125, 4)
    })
  })

  describe('panneau replié', () => {
    it('toggleCollapsed alterne replié / déplié (replié par défaut)', () => {
      const s = useCostLogStore()
      expect(s.isCollapsed).toBe(true)
      s.toggleCollapsed()
      expect(s.isCollapsed).toBe(false)
      s.toggleCollapsed()
      expect(s.isCollapsed).toBe(true)
    })
  })

  describe('removal & cleanup', () => {
    it('removeEntry retire la seule entrée visée', () => {
      const s = useCostLogStore()
      s.addEntry('a', USAGE)
      s.addDbEntry('b', DB_OP)
      const id = s.entries[0].id
      s.removeEntry(id)
      expect(s.entries.map(e => e.label)).toEqual(['a'])
      expect(s.totalCost).toBeCloseTo(0.0025, 4)
    })

    it('clearAll empties everything', () => {
      const s = useCostLogStore()
      s.addEntry('a', USAGE)
      s.addDbEntry('b', DB_OP)
      s.clearAll()
      expect(s.entries).toHaveLength(0)
      expect(s.entryCount).toBe(0)
      expect(s.totalCost).toBe(0)
    })
  })
})
