// @vitest-environment node
/**
 * Story B1 — Tests unitaires pour keyword-serp.service.
 *
 * Couvre AC.B1.1 à B1.6 (B1.7 = présence du header AUTHORITY, vérifié par
 * inspection visuelle du fichier source).
 *
 * Stratégie : mock complet de `query` pour ne pas toucher la DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const mockPoolConnect = vi.fn()

vi.mock('../../../server/db/client', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  pool: {
    connect: () => mockPoolConnect(),
  },
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const {
  getSerpResults,
  upsertSerpResults,
  upsertSerpScrapes,
  upsertPaaQuestions,
  getSerpResultsFresh,
} = await import('../../../server/services/keyword/keyword-serp.service')

beforeEach(() => {
  mockQuery.mockReset()
  mockPoolConnect.mockReset()
})

function buildSerpRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    keyword: 'seo local',
    lang: 'fr',
    country: 'fr',
    position: i + 1,
    url: `https://example.test/${i + 1}`,
    title: `Result ${i + 1}`,
    domain: 'example.test',
    fetched_at: new Date('2026-05-09T00:00:00Z'),
  }))
}

describe('B1 — getSerpResults', () => {
  it('AC.B1.1 returns array of N SerpResults with ascending positions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: buildSerpRows(10), rowCount: 10 })
    const out = await getSerpResults('seo local')
    expect(out).toHaveLength(10)
    expect(out.map((r) => r.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('AC.B1.2 returns [] (not null) when DB has no rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const out = await getSerpResults('unknown keyword')
    expect(out).toEqual([])
  })
})

describe('B1 — upsertSerpResults', () => {
  it('AC.B1.3 a single batched INSERT (not N queries) for N rows', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 10 })
    await upsertSerpResults(
      'seo local',
      Array.from({ length: 10 }, (_, i) => ({
        position: i + 1,
        url: `https://example.test/${i + 1}`,
        title: `T${i}`,
        domain: 'example.test',
      })),
    )
    expect(mockQuery).toHaveBeenCalledTimes(1)
    const sql = mockQuery.mock.calls[0][0] as string
    // Une seule clause VALUES avec 10 tuples → 10 occurrences de "($"
    const tupleCount = (sql.match(/\(\$/g) ?? []).length
    expect(tupleCount).toBe(10)
    expect(sql).toMatch(/ON CONFLICT \(keyword, lang, country, position\) DO UPDATE/)
  })

  it('no-op (no query) on empty array', async () => {
    await upsertSerpResults('seo local', [])
    expect(mockQuery).not.toHaveBeenCalled()
  })
})

describe('B1 — getSerpResultsFresh', () => {
  it('AC.B1.4 returns rows when fetched_at < 7d', async () => {
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 jour
    const rows = [
      { ...buildSerpRows(1)[0], fetched_at: recent },
    ]
    mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 })

    const out = await getSerpResultsFresh('seo local')
    expect(out).not.toBeNull()
    expect(out).toHaveLength(1)
  })

  it('AC.B1.4 returns null when fetched_at >= 7d', async () => {
    const stale = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 jours
    const rows = [
      { ...buildSerpRows(1)[0], fetched_at: stale },
    ]
    mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 })

    const out = await getSerpResultsFresh('seo local')
    expect(out).toBeNull()
  })

  it('returns null on empty result set', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const out = await getSerpResultsFresh('unknown')
    expect(out).toBeNull()
  })
})

describe('B1 — upsertPaaQuestions', () => {
  it('AC.B1.5 uses ON CONFLICT DO NOTHING (idempotent)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 })
    await upsertPaaQuestions('seo local', [{ question: 'How?', depth: 1 }])
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/ON CONFLICT \(keyword, lang, country, question, depth\) DO NOTHING/)
  })
})

describe('B1 — upsertSerpScrapes FK violation', () => {
  it('AC.B1.6 logs explicit warn and re-throws on FK violation', async () => {
    const fkError = Object.assign(new Error('foreign key violation'), { code: '23503' })
    mockQuery.mockRejectedValueOnce(fkError)

    await expect(
      upsertSerpScrapes('orphan kw', [
        { position: 1, url: 'https://example.test/x', headings: [] },
      ]),
    ).rejects.toMatchObject({ code: '23503' })

    const { log } = await import('../../../server/utils/logger')
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('upsertSerpScrapes FK violation'),
    )
  })
})
