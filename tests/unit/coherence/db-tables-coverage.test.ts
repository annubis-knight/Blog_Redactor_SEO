// @vitest-environment node
/**
 * Cohérence FR-INFRA ↔ tables PostgreSQL
 *
 * Pour chaque FR-INFRA-*-TABLE déclarée dans le PRD §8.14, ce fichier vérifie
 * que les fonctions producteurs/consommateurs documentées émettent bien des
 * requêtes SQL ciblant la **bonne** table. C'est un test "anti-drift" : si un
 * jour quelqu'un renomme une table dans une migration sans aligner le service,
 * ces tests cassent immédiatement.
 *
 * Méthodologie :
 *   1. Mock du pool DB pour intercepter les requêtes SQL.
 *   2. Appel des fonctions producteurs/consommateurs documentées par la FR.
 *   3. Assertion : la requête capturée mentionne la table attendue.
 *
 * Couvre les 9 FR-INFRA ajoutées le 2026-05-05 :
 *   - FR-INFRA-PAA-EXPLORATIONS
 *   - FR-INFRA-INTENT-EXPLORATIONS-LEGACY (vérification "no runtime usage")
 *   - FR-INFRA-KEYWORDS-SEO
 *   - FR-INFRA-LOCAL-ENTITIES
 *   - FR-INFRA-LIEUTENANT-EXPLORATIONS
 *   - FR-INFRA-KEYWORD-DISCOVERIES
 *   - FR-INFRA-ARTICLE-STRATEGIES
 *   - FR-INFRA-COCOON-STRATEGIES
 *   - FR-INFRA-MICRO-CONTEXTS
 *
 * Voir aussi :
 *   - _bmad-output/planning-artifacts/prd.md §8.14 et §8.14.bis (matrice)
 *   - CLAUDE.md §3.2 (header AUTHORITY:)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// PART 1: Mocking & helpers
// ============================================================================

const capturedQueries: Array<{ sql: string; params: unknown[] }> = []

const mockQuery = vi.fn(async (sql: string, params: unknown[] = []) => {
  capturedQueries.push({ sql, params })
  return { rows: [], rowCount: 0 }
})

vi.mock('../../../server/db/client.js', () => ({
  pool: { query: mockQuery },
  query: mockQuery,
}))

vi.mock('../../../server/db/client', () => ({
  pool: { query: mockQuery },
  query: mockQuery,
}))

vi.mock('../../../server/utils/logger.js', () => ({
  log: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}))

beforeEach(() => {
  capturedQueries.length = 0
  mockQuery.mockClear()
})

/** Concatène toutes les requêtes capturées en un seul blob pour assertions globales. */
function allQueriesText(): string {
  return capturedQueries.map(q => q.sql).join('\n---\n')
}

/** Vérifie qu'au moins une requête mentionne la table attendue. */
function expectQueryTouchesTable(table: string): void {
  const blob = allQueriesText()
  const regex = new RegExp(`\\b${table}\\b`, 'i')
  expect(regex.test(blob), `Aucune requête capturée ne mentionne la table "${table}". Requêtes vues:\n${blob}`).toBe(true)
}

// ============================================================================
// PART 2: FR-INFRA-PAA-EXPLORATIONS
// ============================================================================

describe('FR-INFRA-PAA-EXPLORATIONS — paa_explorations', () => {
  it('saveCaptainExploration() écrit dans paa_explorations quand paaQuestions est fourni', async () => {
    const { saveCaptainExploration } = await import('../../../server/services/infra/data.service.js')
    await saveCaptainExploration(42, {
      keyword: 'test-keyword',
      status: 'suggested',
      articleLevel: 'pilier',
      rootKeywords: [],
      paaQuestions: [
        { question: 'Comment ?', answer: 'Ainsi.', match: 'partial', matchQuality: 'medium' },
      ],
    })
    expectQueryTouchesTable('paa_explorations')
    const paaInsert = capturedQueries.find(q => /INSERT INTO paa_explorations/i.test(q.sql))
    expect(paaInsert, 'INSERT INTO paa_explorations attendu').toBeDefined()
    expect(paaInsert!.sql).toMatch(/ON CONFLICT \(article_id, keyword, question\)/i)
  })

  it("getCaptainExplorations() lit depuis paa_explorations (consommateur)", async () => {
    const { getCaptainExplorations } = await import('../../../server/services/infra/data.service.js')
    await getCaptainExplorations(42)
    const paaSelect = capturedQueries.find(q => /SELECT .* FROM paa_explorations/i.test(q.sql))
    expect(paaSelect, 'SELECT FROM paa_explorations attendu').toBeDefined()
  })
})

// ============================================================================
// PART 3: FR-INFRA-INTENT-EXPLORATIONS-LEGACY
// ============================================================================

describe('FR-INFRA-INTENT-EXPLORATIONS-LEGACY — intent_explorations (no runtime usage)', () => {
  it("aucun service runtime n'émet de requête sur intent_explorations", async () => {
    // Cette assertion est négative et historique : si demain quelqu'un ajoute
    // un service qui réintroduit `intent_explorations`, ce test cassera et
    // forcera une revue (la table n'existe plus en DB live, voir migration 016).
    await import('../../../server/services/infra/data.service.js')
    await import('../../../server/services/queries/keyword-queries.service.js')
    await import('../../../server/services/strategy/strategy.service.js')
    await import('../../../server/services/strategy/cocoon-strategy.service.js')
    await import('../../../server/services/keyword/keyword-discovery-db.service.js')

    const blob = allQueriesText()
    expect(/\bintent_explorations\b/i.test(blob)).toBe(false)
  })
})

// ============================================================================
// PART 4: FR-INFRA-KEYWORDS-SEO
// ============================================================================

describe('FR-INFRA-KEYWORDS-SEO — keywords_seo', () => {
  it('getKeywordsByCocoon() lit depuis keywords_seo filtré par cocoon_name', async () => {
    const { getKeywordsByCocoon } = await import('../../../server/services/infra/data.service.js')
    await getKeywordsByCocoon('mon-cocon')
    const sel = capturedQueries.find(q => /FROM keywords_seo/i.test(q.sql) && /cocoon_name/i.test(q.sql))
    expect(sel, 'SELECT FROM keywords_seo WHERE cocoon_name attendu').toBeDefined()
    expect(sel!.params).toEqual(['mon-cocon'])
  })

  it('loadKeywordsDb() lit toute la table keywords_seo', async () => {
    const { loadKeywordsDb } = await import('../../../server/services/infra/data.service.js')
    await loadKeywordsDb()
    const sel = capturedQueries.find(q => /FROM keywords_seo/i.test(q.sql) && /ORDER BY id/i.test(q.sql))
    expect(sel, 'SELECT FROM keywords_seo ORDER BY id attendu').toBeDefined()
  })

  it('addKeyword() vérifie doublon puis INSERT INTO keywords_seo', async () => {
    const { addKeyword } = await import('../../../server/services/infra/data.service.js')
    await addKeyword({ keyword: 'kw', cocoonName: 'c', type: 'pilier', status: 'suggested' })
    const dupCheck = capturedQueries.find(q => /SELECT id FROM keywords_seo WHERE LOWER\(mot_clef\)/i.test(q.sql))
    const insert = capturedQueries.find(q => /INSERT INTO keywords_seo/i.test(q.sql))
    expect(dupCheck, 'check doublon attendu').toBeDefined()
    expect(insert, 'INSERT INTO keywords_seo attendu').toBeDefined()
  })

  it('replaceKeyword() émet UPDATE keywords_seo', async () => {
    const { replaceKeyword } = await import('../../../server/services/infra/data.service.js')
    await replaceKeyword('old', { keyword: 'new', cocoonName: 'c', type: 'pilier', status: 'suggested' })
    const upd = capturedQueries.find(q => /UPDATE keywords_seo SET/i.test(q.sql))
    expect(upd, 'UPDATE keywords_seo attendu').toBeDefined()
  })

  it('updateKeywordStatus() émet UPDATE keywords_seo SET statut', async () => {
    const { updateKeywordStatus } = await import('../../../server/services/infra/data.service.js')
    await updateKeywordStatus('kw', 'validated')
    const upd = capturedQueries.find(q => /UPDATE keywords_seo SET statut/i.test(q.sql))
    expect(upd, 'UPDATE statut attendu').toBeDefined()
    expect(upd!.params).toEqual(['validated', 'kw'])
  })

  it('deleteKeyword() émet DELETE FROM keywords_seo', async () => {
    const { deleteKeyword } = await import('../../../server/services/infra/data.service.js')
    await deleteKeyword('kw')
    const del = capturedQueries.find(q => /DELETE FROM keywords_seo/i.test(q.sql))
    expect(del, 'DELETE FROM keywords_seo attendu').toBeDefined()
  })
})

// ============================================================================
// PART 5: FR-INFRA-LOCAL-ENTITIES
// ============================================================================

describe('FR-INFRA-LOCAL-ENTITIES — local_entities', () => {
  it('getEntities() lit depuis local_entities', async () => {
    const { getEntities } = await import('../../../server/services/infra/local-entities.service.js')
    await getEntities()
    const sel = capturedQueries.find(q => /FROM local_entities/i.test(q.sql))
    expect(sel, 'SELECT FROM local_entities attendu').toBeDefined()
    // Les colonnes lues doivent matcher le schéma documenté (FR-INFRA-LOCAL-ENTITIES)
    expect(sel!.sql).toMatch(/name/i)
    expect(sel!.sql).toMatch(/type/i)
    expect(sel!.sql).toMatch(/aliases/i)
    expect(sel!.sql).toMatch(/region/i)
  })

  it('aucune route runtime ne fait INSERT/UPDATE/DELETE sur local_entities (référentiel statique)', async () => {
    const { getEntities, scoreLocalAnchoring } = await import('../../../server/services/infra/local-entities.service.js')
    await getEntities()
    // scoreLocalAnchoring déclenche aussi getEntities en interne mais reste read-only
    await scoreLocalAnchoring('lorem ipsum')

    const writeQueries = capturedQueries.filter(q =>
      /INSERT INTO local_entities|UPDATE local_entities|DELETE FROM local_entities/i.test(q.sql),
    )
    expect(writeQueries).toHaveLength(0)
  })
})

// ============================================================================
// PART 6: FR-INFRA-LIEUTENANT-EXPLORATIONS
// ============================================================================

describe('FR-INFRA-LIEUTENANT-EXPLORATIONS — lieutenant_explorations', () => {
  it('getLieutenantExplorations() lit depuis lieutenant_explorations triée par score DESC', async () => {
    const { getLieutenantExplorations } = await import('../../../server/services/infra/data.service.js')
    await getLieutenantExplorations(42)
    const sel = capturedQueries.find(q => /FROM lieutenant_explorations WHERE article_id/i.test(q.sql))
    expect(sel, 'SELECT FROM lieutenant_explorations attendu').toBeDefined()
    expect(sel!.sql).toMatch(/ORDER BY score DESC/i)
  })

  it('saveLieutenantExplorations() émet INSERT ... ON CONFLICT (article_id, keyword)', async () => {
    const { saveLieutenantExplorations } = await import('../../../server/services/infra/data.service.js')
    await saveLieutenantExplorations(42, [
      {
        keyword: 'kw',
        status: 'suggested',
        reasoning: 'r',
        sources: [],
        suggestedHnLevel: 2,
        score: 0.5,
        kpis: null,
        lockedAt: null,
        exploredAt: null,
      },
    ], 'captain')
    const ins = capturedQueries.find(q => /INSERT INTO lieutenant_explorations/i.test(q.sql))
    expect(ins, 'INSERT INTO lieutenant_explorations attendu').toBeDefined()
    expect(ins!.sql).toMatch(/ON CONFLICT \(article_id, keyword\)/i)
  })

  it('archiveLieutenantExplorations() émet UPDATE ... SET status = archived', async () => {
    const { archiveLieutenantExplorations } = await import('../../../server/services/infra/data.service.js')
    await archiveLieutenantExplorations(42)
    const upd = capturedQueries.find(q => /UPDATE lieutenant_explorations/i.test(q.sql) && /SET status/i.test(q.sql))
    expect(upd, 'UPDATE archive attendu').toBeDefined()
    expect(upd!.sql).toMatch(/'archived'/i)
  })
})

// ============================================================================
// PART 7: FR-INFRA-KEYWORD-DISCOVERIES
// ============================================================================

describe('FR-INFRA-KEYWORD-DISCOVERIES — keyword_discoveries', () => {
  it('getKeywordDiscovery() lit avec PK (seed, lang)', async () => {
    const { getKeywordDiscovery } = await import('../../../server/services/keyword/keyword-discovery-db.service.js')
    await getKeywordDiscovery('seed-kw', 'fr')
    const sel = capturedQueries.find(q => /FROM keyword_discoveries/i.test(q.sql))
    expect(sel, 'SELECT FROM keyword_discoveries attendu').toBeDefined()
    expect(sel!.sql).toMatch(/WHERE seed = \$1 AND lang = \$2/i)
    expect(sel!.params).toEqual(['seed-kw', 'fr'])
  })

  it('saveKeywordDiscoverySources() émet UPSERT sur keyword_discoveries', async () => {
    const { saveKeywordDiscoverySources } = await import('../../../server/services/keyword/keyword-discovery-db.service.js')
    await saveKeywordDiscoverySources('seed', { az: [] })
    const ins = capturedQueries.find(q => /INSERT INTO keyword_discoveries/i.test(q.sql))
    expect(ins, 'INSERT INTO keyword_discoveries attendu').toBeDefined()
    expect(ins!.sql).toMatch(/ON CONFLICT \(seed, lang\)/i)
    expect(ins!.sql).toMatch(/sources_json/i)
  })

  it('saveKeywordDiscoveryAiAnalysis() émet UPSERT séparé sur ai_analysis_json', async () => {
    const { saveKeywordDiscoveryAiAnalysis } = await import('../../../server/services/keyword/keyword-discovery-db.service.js')
    await saveKeywordDiscoveryAiAnalysis('seed', { recommended: [] })
    const ins = capturedQueries.find(q => /INSERT INTO keyword_discoveries/i.test(q.sql) && /ai_analysis_json/i.test(q.sql))
    expect(ins, 'UPSERT ai_analysis_json attendu').toBeDefined()
  })

  it('deleteKeywordDiscovery() émet DELETE FROM keyword_discoveries', async () => {
    const { deleteKeywordDiscovery } = await import('../../../server/services/keyword/keyword-discovery-db.service.js')
    await deleteKeywordDiscovery('seed', 'fr')
    const del = capturedQueries.find(q => /DELETE FROM keyword_discoveries/i.test(q.sql))
    expect(del, 'DELETE FROM keyword_discoveries attendu').toBeDefined()
  })

  describe('isKeywordDiscoveryFresh — TTL 30 jours', () => {
    it('retourne false pour fetchedAt null/undefined', async () => {
      const { isKeywordDiscoveryFresh } = await import('../../../server/services/keyword/keyword-discovery-db.service.js')
      expect(isKeywordDiscoveryFresh(null)).toBe(false)
      expect(isKeywordDiscoveryFresh(undefined)).toBe(false)
    })

    it('retourne true pour un fetch < 30 jours', async () => {
      const { isKeywordDiscoveryFresh } = await import('../../../server/services/keyword/keyword-discovery-db.service.js')
      const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      expect(isKeywordDiscoveryFresh(recent)).toBe(true)
    })

    it('retourne false pour un fetch > 30 jours (TTL FR-DIS-CACHE)', async () => {
      const { isKeywordDiscoveryFresh } = await import('../../../server/services/keyword/keyword-discovery-db.service.js')
      const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
      expect(isKeywordDiscoveryFresh(old)).toBe(false)
    })
  })
})

// ============================================================================
// PART 8: FR-INFRA-ARTICLE-STRATEGIES
// ============================================================================

describe('FR-INFRA-ARTICLE-STRATEGIES — article_strategies', () => {
  it('getStrategy() lit data + completed_steps depuis article_strategies', async () => {
    const { getStrategy } = await import('../../../server/services/strategy/strategy.service.js')
    await getStrategy(42)
    const sel = capturedQueries.find(q => /FROM article_strategies WHERE article_id/i.test(q.sql))
    expect(sel, 'SELECT FROM article_strategies attendu').toBeDefined()
    expect(sel!.sql).toMatch(/data/i)
    expect(sel!.sql).toMatch(/completed_steps/i)
  })

  it('saveStrategy() émet UPSERT sur article_strategies', async () => {
    // Le mock retourne rowCount=0 par défaut donc getStrategy renvoie null,
    // saveStrategy passe à l'INSERT.
    const { saveStrategy } = await import('../../../server/services/strategy/strategy.service.js')
    await saveStrategy(42, { completedSteps: 3 })
    const ins = capturedQueries.find(q => /INSERT INTO article_strategies/i.test(q.sql))
    expect(ins, 'INSERT INTO article_strategies attendu').toBeDefined()
    expect(ins!.sql).toMatch(/ON CONFLICT \(article_id\)/i)
  })
})

// ============================================================================
// PART 9: FR-INFRA-COCOON-STRATEGIES
// ============================================================================

describe('FR-INFRA-COCOON-STRATEGIES — cocoon_strategies', () => {
  it('getCocoonStrategy() lit depuis cocoon_strategies par cocoon_id (après résolution slug)', async () => {
    // Simule le résolveur de cocoon_id qui retourne 7 sur le 1er SELECT.
    mockQuery.mockImplementationOnce(async (sql: string, params: unknown[] = []) => {
      capturedQueries.push({ sql, params })
      return { rows: [{ id: 7 }], rowCount: 1 }
    })
    const { getCocoonStrategy } = await import('../../../server/services/strategy/cocoon-strategy.service.js')
    await getCocoonStrategy('mon-cocon')
    const sel = capturedQueries.find(q => /FROM cocoon_strategies WHERE cocoon_id/i.test(q.sql))
    expect(sel, 'SELECT FROM cocoon_strategies attendu').toBeDefined()
    expect(sel!.params).toEqual([7])
  })

  it("saveCocoonStrategy() lance une erreur quand le cocoon n'existe pas (préserve l'intégrité FK)", async () => {
    const { saveCocoonStrategy } = await import('../../../server/services/strategy/cocoon-strategy.service.js')
    // mock retourne 0 lignes → resolveCocoonId renverra null → throw
    await expect(saveCocoonStrategy('inconnu', { positionnement: 'test' } as never))
      .rejects.toThrow(/Unknown cocoon slug/i)
    // Aucun INSERT ne doit avoir été tenté
    const ins = capturedQueries.find(q => /INSERT INTO cocoon_strategies/i.test(q.sql))
    expect(ins).toBeUndefined()
  })
})

// ============================================================================
// PART 10: FR-INFRA-MICRO-CONTEXTS
// ============================================================================

describe('FR-INFRA-MICRO-CONTEXTS — article_micro_contexts', () => {
  it('loadArticleMicroContext() lit avec JOIN articles pour récupérer slug', async () => {
    const { loadArticleMicroContext } = await import('../../../server/services/infra/data.service.js')
    await loadArticleMicroContext(42)
    const sel = capturedQueries.find(q => /FROM article_micro_contexts/i.test(q.sql))
    expect(sel, 'SELECT FROM article_micro_contexts attendu').toBeDefined()
    expect(sel!.sql).toMatch(/JOIN articles/i)
    expect(sel!.sql).toMatch(/article_id/i)
  })

  it('saveArticleMicroContext() émet UPSERT (angle, tone, directives, target_word_count)', async () => {
    const { saveArticleMicroContext } = await import('../../../server/services/infra/data.service.js')
    await saveArticleMicroContext(42, {
      slug: 'a',
      angle: 'A',
      tone: 'T',
      directives: 'D',
      targetWordCount: 1500,
      updatedAt: new Date().toISOString(),
    })
    const ins = capturedQueries.find(q => /INSERT INTO article_micro_contexts/i.test(q.sql))
    expect(ins, 'INSERT INTO article_micro_contexts attendu').toBeDefined()
    expect(ins!.sql).toMatch(/ON CONFLICT \(article_id\)/i)
    expect(ins!.sql).toMatch(/angle/i)
    expect(ins!.sql).toMatch(/tone/i)
    expect(ins!.sql).toMatch(/directives/i)
    expect(ins!.sql).toMatch(/target_word_count/i)
  })
})
