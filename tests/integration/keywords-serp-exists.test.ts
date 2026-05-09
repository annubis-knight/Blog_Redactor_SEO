// @vitest-environment node
/**
 * Chantier 3 — E1-S1 : pré-check SERP léger (service hasSerpScrape).
 *
 * Couvre :
 *   - AC.LEX-PRECHECK.1 : keyword scrapé → { exists:true, scrapedAt:<ISO> }.
 *   - AC.LEX-PRECHECK.2 : keyword inconnu → { exists:false, scrapedAt:null }
 *                        (jamais d'exception — c'est le but d'éliminer la
 *                        trace 404 console côté UI).
 *
 * Le service lit `keyword_serp_scrapes` (MAX(scraped_at)) sans charger
 * `text_content`/`headings`. Aucun appel externe DataForSEO.
 *
 * La validation HTTP (400 sur keyword vide / trop long) est gérée dans le
 * handler de route et couverte par le smoke test browser de E1-S3 + le test
 * du composable E1-S2 (qui ne fetch pas si keyword null/empty).
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { pool, query } from '../../server/db/client.js'

const FIXTURE_KEYWORD_SCRAPED = '__test_e1s1_scraped__'
const FIXTURE_KEYWORD_UNKNOWN = '__test_e1s1_unknown__'
const FIXTURE_LANG = 'fr'
const FIXTURE_COUNTRY = 'fr'

async function clean(): Promise<void> {
  await query(`DELETE FROM keyword_metrics WHERE keyword IN ($1, $2)`, [
    FIXTURE_KEYWORD_SCRAPED,
    FIXTURE_KEYWORD_UNKNOWN,
  ])
}

async function seedScrapedKeyword(): Promise<void> {
  await query(
    `INSERT INTO keyword_metrics (keyword, lang, country)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [FIXTURE_KEYWORD_SCRAPED, FIXTURE_LANG, FIXTURE_COUNTRY],
  )
  await query(
    `INSERT INTO keyword_serp_results (keyword, lang, country, position, url, domain)
     VALUES ($1, $2, $3, 1, 'https://e1s1.test/a', 'e1s1.test')
     ON CONFLICT DO NOTHING`,
    [FIXTURE_KEYWORD_SCRAPED, FIXTURE_LANG, FIXTURE_COUNTRY],
  )
  await query(
    `INSERT INTO keyword_serp_scrapes (keyword, lang, country, position, url)
     VALUES ($1, $2, $3, 1, 'https://e1s1.test/a')
     ON CONFLICT DO NOTHING`,
    [FIXTURE_KEYWORD_SCRAPED, FIXTURE_LANG, FIXTURE_COUNTRY],
  )
}

beforeEach(async () => {
  await clean()
  await seedScrapedKeyword()
})

afterAll(async () => {
  await clean()
  await pool.end()
})

describe('hasSerpScrape — chantier 3 E1-S1', () => {
  it('AC.LEX-PRECHECK.1 — keyword scrapé → exists:true + scrapedAt ISO non-null', async () => {
    const { hasSerpScrape } = await import(
      '../../server/services/keyword/keyword-serp.service.js'
    )

    const result = await hasSerpScrape(FIXTURE_KEYWORD_SCRAPED)

    expect(result.exists).toBe(true)
    expect(result.scrapedAt).toBeTypeOf('string')
    expect(result.scrapedAt).not.toBeNull()
    // Doit être une date ISO valide
    expect(() => new Date(result.scrapedAt as string).toISOString()).not.toThrow()
  })

  it('AC.LEX-PRECHECK.2 — keyword inconnu → exists:false + scrapedAt:null (pas d\'exception)', async () => {
    const { hasSerpScrape } = await import(
      '../../server/services/keyword/keyword-serp.service.js'
    )

    const result = await hasSerpScrape(FIXTURE_KEYWORD_UNKNOWN)

    expect(result.exists).toBe(false)
    expect(result.scrapedAt).toBeNull()
  })

  it('respecte lang/country (un keyword en FR scrapé n\'apparaît pas en EN)', async () => {
    const { hasSerpScrape } = await import(
      '../../server/services/keyword/keyword-serp.service.js'
    )

    const resultEn = await hasSerpScrape(FIXTURE_KEYWORD_SCRAPED, 'en', 'us')
    expect(resultEn.exists).toBe(false)
    expect(resultEn.scrapedAt).toBeNull()
  })
})
