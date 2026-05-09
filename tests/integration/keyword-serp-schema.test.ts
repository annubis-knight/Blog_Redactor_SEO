// @vitest-environment node
/**
 * Sprint keyword-metrics-decomposition — Story A1 : validation DDL.
 *
 * Test d'intégration sur la DB locale (vitest unit avec environnement node + vraie connexion pg).
 * Vérifie : structure des 4 nouvelles tables (colonnes, PK, FK, index), violation FK,
 * cascade DELETE depuis `keyword_metrics`.
 *
 * Préreq : DDL appliqué via `npx tsx scripts/apply-keyword-serp-schema.ts`.
 *
 * Conservé après archivage des scripts jetables : sert de filet de régression schéma.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { pool, query } from '../../server/db/client.js'

const FIXTURE_KEYWORD = '__test_a1_serp_schema__'
const FIXTURE_LANG = 'fr'
const FIXTURE_COUNTRY = 'fr'

async function ensureKeywordMetricsFixture(): Promise<void> {
  await query(
    `INSERT INTO keyword_metrics (keyword, lang, country)
     VALUES ($1, $2, $3)
     ON CONFLICT (keyword, lang, country) DO NOTHING`,
    [FIXTURE_KEYWORD, FIXTURE_LANG, FIXTURE_COUNTRY],
  )
}

async function cleanupKeywordMetricsFixture(): Promise<void> {
  await query(
    `DELETE FROM keyword_metrics WHERE keyword = $1`,
    [FIXTURE_KEYWORD],
  )
}

beforeEach(async () => {
  await cleanupKeywordMetricsFixture()
  await ensureKeywordMetricsFixture()
})

afterAll(async () => {
  await cleanupKeywordMetricsFixture()
  await pool.end()
})

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: 'YES' | 'NO'
  column_default: string | null
}

async function describeColumns(table: string): Promise<ColumnInfo[]> {
  const res = await query<ColumnInfo>(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position`,
    [table],
  )
  return res.rows
}

async function getPrimaryKeyColumns(table: string): Promise<string[]> {
  const res = await query<{ attname: string }>(
    `SELECT a.attname
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
      ORDER BY array_position(i.indkey, a.attnum)`,
    [table],
  )
  return res.rows.map((r) => r.attname)
}

async function indexExists(indexName: string): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM pg_indexes WHERE indexname = $1`,
    [indexName],
  )
  return res.rowCount === 1
}

describe('A1 — keyword_serp_results', () => {
  it('AC.A1.1 has 8 expected columns', async () => {
    const cols = await describeColumns('keyword_serp_results')
    const names = cols.map((c) => c.column_name).sort()
    expect(names).toEqual([
      'country', 'domain', 'fetched_at', 'keyword', 'lang', 'position', 'title', 'url',
    ])
  })

  it('AC.A1.1 PK is composite (keyword, lang, country, position)', async () => {
    const pk = await getPrimaryKeyColumns('keyword_serp_results')
    expect(pk).toEqual(['keyword', 'lang', 'country', 'position'])
  })

  it('AC.A1.1 indexes idx_keyword_serp_results_domain + _fetched present', async () => {
    expect(await indexExists('idx_keyword_serp_results_domain')).toBe(true)
    expect(await indexExists('idx_keyword_serp_results_fetched')).toBe(true)
  })
})

describe('A1 — keyword_serp_scrapes', () => {
  it('AC.A1.2 has 9 expected columns', async () => {
    const cols = await describeColumns('keyword_serp_scrapes')
    const names = cols.map((c) => c.column_name).sort()
    expect(names).toEqual([
      'country', 'headings', 'is_blog', 'keyword', 'lang', 'position',
      'scraped_at', 'text_content', 'url',
    ])
  })

  it('AC.A1.2 PK is composite (keyword, lang, country, position)', async () => {
    const pk = await getPrimaryKeyColumns('keyword_serp_scrapes')
    expect(pk).toEqual(['keyword', 'lang', 'country', 'position'])
  })

  it('AC.A1.2 index idx_keyword_serp_scrapes_scraped present', async () => {
    expect(await indexExists('idx_keyword_serp_scrapes_scraped')).toBe(true)
  })

  it('AC.A1.5 INSERT without parent row in keyword_serp_results raises FK violation', async () => {
    // Parent (keyword_metrics) exists, but no row in keyword_serp_results yet.
    await expect(
      query(
        `INSERT INTO keyword_serp_scrapes (keyword, lang, country, position, url)
         VALUES ($1, $2, $3, 1, 'https://orphan.test/')`,
        [FIXTURE_KEYWORD, FIXTURE_LANG, FIXTURE_COUNTRY],
      ),
    ).rejects.toMatchObject({ code: '23503' }) // foreign_key_violation
  })
})

describe('A1 — keyword_paa_questions', () => {
  it('AC.A1.3 has expected columns + id BIGSERIAL', async () => {
    const cols = await describeColumns('keyword_paa_questions')
    const names = cols.map((c) => c.column_name).sort()
    expect(names).toEqual([
      'answer', 'country', 'depth', 'fetched_at', 'id', 'keyword',
      'lang', 'parent_question', 'question',
    ])
    const idCol = cols.find((c) => c.column_name === 'id')
    expect(idCol?.data_type).toBe('bigint')
    expect(idCol?.column_default).toContain('nextval')
  })

  it('AC.A1.3 UNIQUE (keyword, lang, country, question, depth) enforced', async () => {
    await query(
      `INSERT INTO keyword_paa_questions (keyword, lang, country, question, depth)
       VALUES ($1, $2, $3, 'What is unique?', 1)`,
      [FIXTURE_KEYWORD, FIXTURE_LANG, FIXTURE_COUNTRY],
    )
    await expect(
      query(
        `INSERT INTO keyword_paa_questions (keyword, lang, country, question, depth)
         VALUES ($1, $2, $3, 'What is unique?', 1)`,
        [FIXTURE_KEYWORD, FIXTURE_LANG, FIXTURE_COUNTRY],
      ),
    ).rejects.toMatchObject({ code: '23505' }) // unique_violation
  })

  it('AC.A1.3 index idx_keyword_paa_kw present', async () => {
    expect(await indexExists('idx_keyword_paa_kw')).toBe(true)
  })
})

describe('A1 — keyword_autocomplete', () => {
  it('AC.A1.4 PK is (keyword, lang, country, position)', async () => {
    const pk = await getPrimaryKeyColumns('keyword_autocomplete')
    expect(pk).toEqual(['keyword', 'lang', 'country', 'position'])
  })

  it('AC.A1.4 index idx_keyword_autocomplete_fetched present', async () => {
    expect(await indexExists('idx_keyword_autocomplete_fetched')).toBe(true)
  })
})

describe('A1 — cascade DELETE depuis keyword_metrics', () => {
  it('AC.A1.6 deleting keyword_metrics row cascades to children', async () => {
    await query(
      `INSERT INTO keyword_serp_results (keyword, lang, country, position, url, domain)
       VALUES ($1, $2, $3, 1, 'https://example.test/a', 'example.test')`,
      [FIXTURE_KEYWORD, FIXTURE_LANG, FIXTURE_COUNTRY],
    )
    await query(
      `INSERT INTO keyword_serp_scrapes (keyword, lang, country, position, url)
       VALUES ($1, $2, $3, 1, 'https://example.test/a')`,
      [FIXTURE_KEYWORD, FIXTURE_LANG, FIXTURE_COUNTRY],
    )
    await query(
      `INSERT INTO keyword_paa_questions (keyword, lang, country, question)
       VALUES ($1, $2, $3, 'How does cascade work?')`,
      [FIXTURE_KEYWORD, FIXTURE_LANG, FIXTURE_COUNTRY],
    )
    await query(
      `INSERT INTO keyword_autocomplete (keyword, lang, country, position, text)
       VALUES ($1, $2, $3, 1, 'autocomplete sample')`,
      [FIXTURE_KEYWORD, FIXTURE_LANG, FIXTURE_COUNTRY],
    )

    await query(
      `DELETE FROM keyword_metrics WHERE keyword = $1 AND lang = $2 AND country = $3`,
      [FIXTURE_KEYWORD, FIXTURE_LANG, FIXTURE_COUNTRY],
    )

    const results = await query(
      `SELECT 1 FROM keyword_serp_results WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    const scrapes = await query(
      `SELECT 1 FROM keyword_serp_scrapes WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    const paa = await query(
      `SELECT 1 FROM keyword_paa_questions WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    const auto = await query(
      `SELECT 1 FROM keyword_autocomplete WHERE keyword = $1`,
      [FIXTURE_KEYWORD],
    )
    expect(results.rowCount).toBe(0)
    expect(scrapes.rowCount).toBe(0)
    expect(paa.rowCount).toBe(0)
    expect(auto.rowCount).toBe(0)
  })
})
