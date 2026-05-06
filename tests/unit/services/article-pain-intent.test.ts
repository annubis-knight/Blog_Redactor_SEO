/**
 * Tests pour le helper getArticlePainIntent — chantier pain-intent-expected-signal.
 *
 * FR concernés : FR-CAP-RELEVANCE-INTENT-SIGNAL.
 *
 * Couvre :
 *   1. articleId valide + valeur DB valide → la valeur typée
 *   2. articleId valide + colonne NULL → null (pas de fallback string)
 *   3. articleId valide + valeur DB invalide (CHECK contournée hypothétiquement) → null + log warn
 *   4. articleId invalide (null, undefined, NaN, 0) → null sans appel DB
 *   5. erreur DB → null + log warn (best-effort, pas de throw)
 *   6. article inexistant → null
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../server/db/client.js', () => ({
  query: vi.fn(),
}))

vi.mock('../../../server/utils/logger.js', () => ({
  log: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}))

import { getArticlePainIntent } from '../../../server/services/queries/article-pain-intent.service.js'
import { query } from '../../../server/db/client.js'

const mockedQuery = vi.mocked(query)

describe('getArticlePainIntent', () => {
  beforeEach(() => {
    mockedQuery.mockReset()
  })

  it('retourne la valeur typée pour les 4 valeurs autorisées', async () => {
    for (const value of ['informational', 'commercial', 'transactional', 'navigational'] as const) {
      mockedQuery.mockResolvedValueOnce({ rows: [{ pain_intent_expected: value }] } as never)
      const result = await getArticlePainIntent(42)
      expect(result).toBe(value)
    }
  })

  it('retourne null quand pain_intent_expected est NULL en DB', async () => {
    mockedQuery.mockResolvedValue({ rows: [{ pain_intent_expected: null }] } as never)
    const result = await getArticlePainIntent(42)
    expect(result).toBeNull()
  })

  it('retourne null quand l\'article n\'existe pas (rows vide)', async () => {
    mockedQuery.mockResolvedValue({ rows: [] } as never)
    const result = await getArticlePainIntent(999)
    expect(result).toBeNull()
  })

  it('retourne null pour articleId null/undefined/0/NaN sans interroger la DB', async () => {
    expect(await getArticlePainIntent(null)).toBeNull()
    expect(await getArticlePainIntent(undefined)).toBeNull()
    expect(await getArticlePainIntent(0)).toBeNull()
    expect(await getArticlePainIntent(Number.NaN)).toBeNull()
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('retourne null et ne throw pas si la DB lève une erreur', async () => {
    mockedQuery.mockRejectedValue(new Error('connection refused'))
    const result = await getArticlePainIntent(42)
    expect(result).toBeNull()
  })

  it('retourne null si la valeur DB est invalide (CHECK contournée)', async () => {
    // Cas paranoïaque : la contrainte CHECK ne devrait pas laisser passer ça,
    // mais si elle est désactivée ou contournée, on protège le scoring.
    mockedQuery.mockResolvedValue({ rows: [{ pain_intent_expected: 'unknown_value' }] } as never)
    const result = await getArticlePainIntent(42)
    expect(result).toBeNull()
  })
})
