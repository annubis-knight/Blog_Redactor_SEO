/**
 * Tests pour le helper getArticlePainPoint — Sprint S1.
 *
 * Couvre les 4 cas critiques :
 *   1. articleId valide + painPoint non vide → string trimée
 *   2. articleId valide + painPoint null/vide/whitespace → fallback
 *   3. articleId invalide (null, undefined, NaN, 0) → fallback
 *   4. erreur DB → fallback (best-effort, pas de throw)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock du module DB avant l'import du service.
vi.mock('../../../server/db/client.js', () => ({
  query: vi.fn(),
}))

// Mock du logger pour éviter les warns dans la sortie de test.
vi.mock('../../../server/utils/logger.js', () => ({
  log: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}))

import { getArticlePainPoint, PAIN_POINT_FALLBACK } from '../../../server/services/queries/article-pain-point.service.js'
import { query } from '../../../server/db/client.js'

const mockedQuery = vi.mocked(query)

describe('getArticlePainPoint', () => {
  beforeEach(() => {
    mockedQuery.mockReset()
  })

  it('retourne le painPoint trimmé quand articleId valide + valeur en DB', async () => {
    mockedQuery.mockResolvedValue({ rows: [{ pain_point: '  Mon article galère  ' }] } as never)
    const result = await getArticlePainPoint(42)
    expect(result).toBe('Mon article galère')
  })

  it('retourne PAIN_POINT_FALLBACK quand le painPoint en DB est null', async () => {
    mockedQuery.mockResolvedValue({ rows: [{ pain_point: null }] } as never)
    const result = await getArticlePainPoint(42)
    expect(result).toBe(PAIN_POINT_FALLBACK)
  })

  it('retourne PAIN_POINT_FALLBACK quand le painPoint est une string vide', async () => {
    mockedQuery.mockResolvedValue({ rows: [{ pain_point: '   ' }] } as never)
    const result = await getArticlePainPoint(42)
    expect(result).toBe(PAIN_POINT_FALLBACK)
  })

  it('retourne PAIN_POINT_FALLBACK quand l\'article n\'existe pas (rows vide)', async () => {
    mockedQuery.mockResolvedValue({ rows: [] } as never)
    const result = await getArticlePainPoint(999)
    expect(result).toBe(PAIN_POINT_FALLBACK)
  })

  it('retourne PAIN_POINT_FALLBACK pour articleId null/undefined/0/NaN sans interroger la DB', async () => {
    expect(await getArticlePainPoint(null)).toBe(PAIN_POINT_FALLBACK)
    expect(await getArticlePainPoint(undefined)).toBe(PAIN_POINT_FALLBACK)
    expect(await getArticlePainPoint(0)).toBe(PAIN_POINT_FALLBACK)
    expect(await getArticlePainPoint(Number.NaN)).toBe(PAIN_POINT_FALLBACK)
    // Aucun appel DB n'a été fait — court-circuit en amont.
    expect(mockedQuery).not.toHaveBeenCalled()
  })

  it('retourne PAIN_POINT_FALLBACK et ne throw pas si la DB lève une erreur', async () => {
    mockedQuery.mockRejectedValue(new Error('connection refused'))
    const result = await getArticlePainPoint(42)
    expect(result).toBe(PAIN_POINT_FALLBACK)
  })

  it('PAIN_POINT_FALLBACK vaut littéralement "(non défini)"', () => {
    expect(PAIN_POINT_FALLBACK).toBe('(non défini)')
  })
})
