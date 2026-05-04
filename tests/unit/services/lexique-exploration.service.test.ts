/**
 * FR-LEX-MULTI-KEYWORD — service lexique-exploration (Option B Vague).
 *
 * Couvre l'API publique du service :
 *   - getLexiqueExploration : SELECT par (article_id, source_keyword)
 *   - listLexiqueExplorations : ORDER BY explored_at DESC
 *   - saveLexiqueTfidf : INSERT ON CONFLICT UPDATE tfidf_terms
 *   - saveLexiqueAi : INSERT ON CONFLICT UPDATE ai_*
 *   - deleteLexiqueExploration : DELETE par clé composite
 *   - rowToExploration : null si tfidf_terms absent ou mal formé, conserve
 *     ai_recommendations/aiMissingTerms par défaut [] si null
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../server/db/client.js', () => ({
  query: vi.fn(),
}))
vi.mock('../../../server/utils/logger.js', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { query } from '../../../server/db/client.js'
import {
  getLexiqueExploration,
  listLexiqueExplorations,
  saveLexiqueTfidf,
  saveLexiqueAi,
  deleteLexiqueExploration,
} from '../../../server/services/keyword/lexique-exploration.service.js'

const mockedQuery = vi.mocked(query)

const FIXED_DATE = new Date('2026-05-04T10:00:00Z')

const FULL_ROW = {
  article_id: 7,
  source_keyword: 'seo local',
  tfidf_terms: { keyword: 'seo local', terms: [{ term: 'seo', tfidf: 0.8 }] },
  ai_recommendations: [{ term: 'référencement local', priority: 'high' }],
  ai_missing_terms: ['google maps'],
  ai_summary: 'Lexique cohérent avec le pilier SEO local.',
  explored_at: FIXED_DATE,
}

describe('lexique-exploration.service', () => {
  beforeEach(() => {
    mockedQuery.mockReset()
  })

  describe('getLexiqueExploration', () => {
    it('retourne null si la ligne n\'existe pas', async () => {
      mockedQuery.mockResolvedValue({ rows: [] } as never)
      const result = await getLexiqueExploration(7, 'seo local')
      expect(result).toBeNull()
    })

    it('mappe la row complète vers l\'objet LexiqueExploration', async () => {
      mockedQuery.mockResolvedValue({ rows: [FULL_ROW] } as never)
      const result = await getLexiqueExploration(7, 'seo local')
      expect(result).toEqual({
        articleId: 7,
        sourceKeyword: 'seo local',
        tfidfTerms: FULL_ROW.tfidf_terms,
        aiRecommendations: FULL_ROW.ai_recommendations,
        aiMissingTerms: FULL_ROW.ai_missing_terms,
        aiSummary: FULL_ROW.ai_summary,
        exploredAt: FIXED_DATE.toISOString(),
      })
    })

    it('met tfidfTerms à null si la valeur DB est mal formée (pas de keyword string)', async () => {
      mockedQuery.mockResolvedValue({
        rows: [{ ...FULL_ROW, tfidf_terms: { someOtherShape: true } as never }],
      } as never)
      const result = await getLexiqueExploration(7, 'seo local')
      expect(result?.tfidfTerms).toBeNull()
    })

    it('met aiRecommendations et aiMissingTerms à [] si null en DB', async () => {
      mockedQuery.mockResolvedValue({
        rows: [{ ...FULL_ROW, ai_recommendations: null as never, ai_missing_terms: null as never }],
      } as never)
      const result = await getLexiqueExploration(7, 'seo local')
      expect(result?.aiRecommendations).toEqual([])
      expect(result?.aiMissingTerms).toEqual([])
    })

    it('passe (articleId, sourceKeyword) en paramètres positionnels', async () => {
      mockedQuery.mockResolvedValue({ rows: [] } as never)
      await getLexiqueExploration(42, 'plombier paris')
      expect(mockedQuery).toHaveBeenCalledWith(expect.any(String), [42, 'plombier paris'])
    })
  })

  describe('listLexiqueExplorations', () => {
    it('retourne [] si aucune ligne pour cet article', async () => {
      mockedQuery.mockResolvedValue({ rows: [] } as never)
      const result = await listLexiqueExplorations(7)
      expect(result).toEqual([])
    })

    it('trie ORDER BY explored_at DESC dans la requête', async () => {
      mockedQuery.mockResolvedValue({ rows: [] } as never)
      await listLexiqueExplorations(7)
      const sql = mockedQuery.mock.calls[0]?.[0] as string
      expect(sql).toMatch(/ORDER BY explored_at DESC/i)
    })

    it('mappe toutes les rows vers des LexiqueExploration', async () => {
      const row2 = { ...FULL_ROW, source_keyword: 'plombier paris' }
      mockedQuery.mockResolvedValue({ rows: [FULL_ROW, row2] } as never)
      const result = await listLexiqueExplorations(7)
      expect(result).toHaveLength(2)
      expect(result[0]?.sourceKeyword).toBe('seo local')
      expect(result[1]?.sourceKeyword).toBe('plombier paris')
    })
  })

  describe('saveLexiqueTfidf', () => {
    it('exécute un INSERT ... ON CONFLICT DO UPDATE sur tfidf_terms', async () => {
      mockedQuery.mockResolvedValue({ rows: [] } as never)
      const tfidf = { keyword: 'seo local', terms: [] } as never
      await saveLexiqueTfidf(7, 'seo local', tfidf)
      const sql = mockedQuery.mock.calls[0]?.[0] as string
      expect(sql).toMatch(/INSERT INTO lexique_explorations/i)
      expect(sql).toMatch(/ON CONFLICT.*DO UPDATE/i)
      expect(sql).toMatch(/SET tfidf_terms = EXCLUDED\.tfidf_terms/i)
    })

    it('sérialise tfidf en JSON via JSON.stringify', async () => {
      mockedQuery.mockResolvedValue({ rows: [] } as never)
      const tfidf = { keyword: 'seo local', terms: [{ term: 'seo', tfidf: 0.8 }] } as never
      await saveLexiqueTfidf(7, 'seo local', tfidf)
      const params = mockedQuery.mock.calls[0]?.[1] as unknown[]
      expect(params[2]).toBe(JSON.stringify(tfidf))
    })
  })

  describe('saveLexiqueAi', () => {
    it('persiste recommendations + missingTerms + summary', async () => {
      mockedQuery.mockResolvedValue({ rows: [] } as never)
      await saveLexiqueAi(7, 'seo local', {
        recommendations: [{ term: 'référencement', priority: 'high' }],
        missingTerms: ['google maps'],
        summary: 'OK',
      } as never)
      const params = mockedQuery.mock.calls[0]?.[1] as unknown[]
      expect(params[0]).toBe(7)
      expect(params[1]).toBe('seo local')
      expect(params[2]).toBe(JSON.stringify([{ term: 'référencement', priority: 'high' }]))
      expect(params[3]).toBe(JSON.stringify(['google maps']))
      expect(params[4]).toBe('OK')
    })

    it('défaut [] si recommendations / missingTerms sont undefined', async () => {
      mockedQuery.mockResolvedValue({ rows: [] } as never)
      await saveLexiqueAi(7, 'seo local', { summary: null } as never)
      const params = mockedQuery.mock.calls[0]?.[1] as unknown[]
      expect(params[2]).toBe(JSON.stringify([]))
      expect(params[3]).toBe(JSON.stringify([]))
      expect(params[4]).toBeNull()
    })
  })

  describe('deleteLexiqueExploration', () => {
    it('exécute un DELETE par clé composite', async () => {
      mockedQuery.mockResolvedValue({ rows: [] } as never)
      await deleteLexiqueExploration(7, 'seo local')
      const sql = mockedQuery.mock.calls[0]?.[0] as string
      const params = mockedQuery.mock.calls[0]?.[1] as unknown[]
      expect(sql).toMatch(/DELETE FROM lexique_explorations/i)
      expect(params).toEqual([7, 'seo local'])
    })
  })
})
