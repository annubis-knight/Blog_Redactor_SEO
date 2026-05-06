/**
 * Sprint 17 — Tests de régression FR-CAP-LOCK-NO-DUPLICATE.
 *
 * Avant Sprint 17, addEntry/loadCards/restoreFromHistory ne dédoublonnaient
 * pas par originalCard.keyword, ce qui causait des duplications visibles à
 * l'utilisateur quand le watcher `keywords.capitaine` re-déclenchait
 * `addEntry` à chaque toggle lock/unlock.
 *
 * Ces tests verrouillent l'invariant : ces 3 fonctions dédoublonnent
 * désormais par keyword normalisé (trim + lowercase).
 */
import { describe, it, expect, vi } from 'vitest'
import { useExploredKeywords } from '../../../src/composables/keyword/useExploredKeywords'
import type { RadarCard } from '../../../shared/types/intent.types'
import type { CaptainScanEntry } from '../../../shared/types/keyword.types'

vi.mock('../../../src/services/api.service', () => ({
  apiPost: vi.fn().mockRejectedValue(new Error('mock — pas d\'appel réseau dans ces tests')),
}))

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function makeCard(keyword: string): RadarCard {
  return {
    keyword,
    combinedScore: 0,
    scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: 0 },
    kpis: { searchVolume: 0, difficulty: 0, cpc: 0, competition: 0, paaTotal: 0, paaMatchCount: 0, paaWeightedScore: 0, intentTypes: [], intentProbability: null, autocompleteMatchCount: 0, avgSemanticScore: null },
    paaItems: [],
    reasoning: '',
    cachedPaa: false,
  }
}

function makeHistoryEntry(keyword: string): CaptainScanEntry {
  return {
    keyword,
    kpis: [],
    articleLevel: 'pilier',
    rootKeywords: [],
  } as unknown as CaptainScanEntry
}

describe('Sprint 17 — useExploredKeywords déduplication (FR-CAP-LOCK-NO-DUPLICATE)', () => {
  describe('addEntry — dédup par originalCard.keyword', () => {
    it('AC.17.B.1 — addEntry("X") 3 fois ne produit qu\'une seule entry', async () => {
      const composable = useExploredKeywords()
      // Note : addEntry échoue à scanner (apiPost mocké rejected) mais l'entry
      // est créée avant l'appel API. On valide juste la dédup.
      await composable.addEntry('voiture electrique', 'pilier').catch(() => {})
      await composable.addEntry('voiture electrique', 'pilier').catch(() => {})
      await composable.addEntry('voiture electrique', 'pilier').catch(() => {})
      expect(composable.entries.value.length).toBe(1)
    })

    it('addEntry case-insensitive', async () => {
      const composable = useExploredKeywords()
      await composable.addEntry('Voiture Electrique', 'pilier').catch(() => {})
      await composable.addEntry('voiture electrique', 'pilier').catch(() => {})
      await composable.addEntry('VOITURE ELECTRIQUE', 'pilier').catch(() => {})
      expect(composable.entries.value.length).toBe(1)
    })

    it('addEntry normalise les espaces (trim)', async () => {
      const composable = useExploredKeywords()
      await composable.addEntry('voiture electrique', 'pilier').catch(() => {})
      await composable.addEntry('  voiture electrique  ', 'pilier').catch(() => {})
      expect(composable.entries.value.length).toBe(1)
    })
  })

  describe('loadCards — dédup des inputs', () => {
    it('AC.17.B.2 — loadCards([X, X, Y]) produit 2 entries', async () => {
      const composable = useExploredKeywords()
      const cards = [
        makeCard('voiture electrique'),
        makeCard('voiture electrique'),
        makeCard('voiture hybride'),
      ]
      await composable.loadCards(cards, 'pilier').catch(() => {})
      expect(composable.entries.value.length).toBe(2)
      expect(composable.entries.value.map(e => e.originalCard.keyword)).toEqual([
        'voiture electrique',
        'voiture hybride',
      ])
    })
  })

  describe('restoreFromHistory — dédup l\'historique', () => {
    it('AC.17.B.3 — restoreFromHistory([X, X]) produit 1 entry', () => {
      const composable = useExploredKeywords()
      const history = [
        makeHistoryEntry('voiture electrique'),
        makeHistoryEntry('voiture electrique'),
      ]
      composable.restoreFromHistory(history, 'pilier')
      expect(composable.entries.value.length).toBe(1)
    })

    it('restoreFromHistory préserve l\'ordre de la première occurrence', () => {
      const composable = useExploredKeywords()
      const history = [
        makeHistoryEntry('B keyword'),
        makeHistoryEntry('A keyword'),
        makeHistoryEntry('B keyword'), // doublon de B → ignoré
      ]
      composable.restoreFromHistory(history, 'pilier')
      expect(composable.entries.value.length).toBe(2)
      expect(composable.entries.value.map(e => e.originalCard.keyword)).toEqual([
        'B keyword',
        'A keyword',
      ])
    })
  })
})
