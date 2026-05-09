// @vitest-environment node
/**
 * Story C2 — tests d'intégration cache check /serp/analyze.
 *
 * Vérifie sur DB locale :
 *   - AC.C2.4 : reconstruction snapshot — competitors.length, paaQuestions.length,
 *     domain match l'ancien serp_raw_json.
 *   - AC.C2.5 : cas mixte 10 results / 5 scrapes → 10 competitors avec
 *     headings:[], textContent:'' pour les positions sans scrape (pas de crash).
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { pool, query } from '../../server/db/client.js'
import {
  reconstructSerpAnalysisResult,
  upsertSerpResults,
  upsertSerpScrapes,
  upsertPaaQuestions,
} from '../../server/services/keyword/keyword-serp.service.js'

const FIXTURE_KEYWORD = '__test_c2_cache_reconstruct__'

async function clean(): Promise<void> {
  await query(`DELETE FROM keyword_metrics WHERE keyword = $1`, [FIXTURE_KEYWORD])
}

async function ensureKm(): Promise<void> {
  await query(
    `INSERT INTO keyword_metrics (keyword, lang, country) VALUES ($1, 'fr', 'fr')
     ON CONFLICT (keyword, lang, country) DO NOTHING`,
    [FIXTURE_KEYWORD],
  )
}

beforeEach(async () => {
  await clean()
  await ensureKm()
})

afterAll(async () => {
  await clean()
  await pool.end()
})

describe('C2 — reconstructSerpAnalysisResult', () => {
  it('AC.C2.4 : reconstruction = mêmes counts/domains que payload original', async () => {
    await upsertSerpResults(
      FIXTURE_KEYWORD,
      Array.from({ length: 10 }, (_, i) => ({
        position: i + 1,
        url: `https://c2.example/${i + 1}`,
        title: `Title ${i + 1}`,
        domain: 'c2.example',
      })),
    )
    await upsertSerpScrapes(
      FIXTURE_KEYWORD,
      Array.from({ length: 10 }, (_, i) => ({
        position: i + 1,
        url: `https://c2.example/${i + 1}`,
        headings: [{ level: 1, text: `H1 #${i + 1}` }],
        textContent: `Content for #${i + 1}`,
        isBlog: false,
      })),
    )
    await upsertPaaQuestions(FIXTURE_KEYWORD, [
      { question: 'Q1' },
      { question: 'Q2' },
      { question: 'Q3' },
    ])

    const r = await reconstructSerpAnalysisResult(FIXTURE_KEYWORD)
    expect(r).not.toBeNull()
    expect(r!.competitors).toHaveLength(10)
    expect(r!.paaQuestions).toHaveLength(3)
    expect(new Set(r!.competitors.map((c) => c.domain))).toEqual(new Set(['c2.example']))
    expect(r!.fromCache).toBe(true)
  })

  it('AC.C2.5 : cas mixte 10 results / 5 scrapes → 10 competitors, scrapes manquants → headings:[] / textContent:""', async () => {
    await upsertSerpResults(
      FIXTURE_KEYWORD,
      Array.from({ length: 10 }, (_, i) => ({
        position: i + 1,
        url: `https://c2.example/${i + 1}`,
        title: `Title ${i + 1}`,
        domain: 'c2.example',
      })),
    )
    await upsertSerpScrapes(
      FIXTURE_KEYWORD,
      Array.from({ length: 5 }, (_, i) => ({
        position: i + 1,
        url: `https://c2.example/${i + 1}`,
        headings: [{ level: 1, text: `Has scrape #${i + 1}` }],
        textContent: 'scraped content',
        isBlog: true,
      })),
    )

    const r = await reconstructSerpAnalysisResult(FIXTURE_KEYWORD)
    expect(r).not.toBeNull()
    expect(r!.competitors).toHaveLength(10)

    const withScrape = r!.competitors.filter((c) => c.headings.length > 0)
    const withoutScrape = r!.competitors.filter((c) => c.headings.length === 0)
    expect(withScrape).toHaveLength(5)
    expect(withoutScrape).toHaveLength(5)
    for (const c of withoutScrape) {
      expect(c.textContent).toBe('')
      expect(c.isBlog).toBeNull()
    }
  })

  it('returns null when no rows in keyword_serp_results', async () => {
    const r = await reconstructSerpAnalysisResult(FIXTURE_KEYWORD)
    expect(r).toBeNull()
  })
})
