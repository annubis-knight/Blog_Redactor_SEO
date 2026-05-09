// @vitest-environment node
/**
 * Story B2 — TDD lexique-analysis.service.ts
 *
 * Couvre AC.B2.1 → AC.B2.6 (≈ AC.LEX-SCRAPE.2/3/3.bis/4 du PRD).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockFetchAndPersist = vi.fn()
const mockGetHeadings = vi.fn()
const mockGetTextContent = vi.fn()
vi.mock('../../../server/services/external/scrape-corpus.service', () => ({
  fetchAndPersist: (...args: unknown[]) => mockFetchAndPersist(...args),
  getHeadings: (...args: unknown[]) => mockGetHeadings(...args),
  getTextContent: (...args: unknown[]) => mockGetTextContent(...args),
}))

const mockExtractTfidf = vi.fn()
vi.mock('../../../server/services/keyword/tfidf.service', () => ({
  extractTfidf: (...args: unknown[]) => mockExtractTfidf(...args),
}))

const mockSaveLexiqueTfidf = vi.fn()
vi.mock('../../../server/services/keyword/lexique-exploration.service', () => ({
  saveLexiqueTfidf: (...args: unknown[]) => mockSaveLexiqueTfidf(...args),
}))

import {
  analyzeLexique,
  LexiqueScrapeMissingError,
} from '../../../server/services/keyword/lexique-analysis.service.js'

const TEXT_ROWS = [
  { position: 1, url: 'https://x/1', textContent: 'body 1' },
  { position: 2, url: 'https://x/2', textContent: 'body 2' },
]

const TFIDF_FAKE = {
  keyword: 'seo',
  totalCompetitors: 2,
  obligatoire: [],
  differenciateur: [],
  optionnel: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTextContent.mockResolvedValue(TEXT_ROWS)
  mockExtractTfidf.mockResolvedValue(TFIDF_FAKE)
  mockSaveLexiqueTfidf.mockResolvedValue(undefined)
  mockFetchAndPersist.mockResolvedValue({
    keyword: 'seo', lang: 'fr', country: 'fr',
    fromCache: null, scrapedAt: new Date().toISOString(),
    serpResults: [], scrapes: [], paaQuestions: [],
  })
})

// --- AC.B2.1 ↔ AC.LEX-SCRAPE.2 ---------------------------------------------

describe('AC.LEX-SCRAPE.2 — ne lit jamais headings', () => {
  it('analyzeLexique n\'appelle PAS getHeadings', async () => {
    await analyzeLexique('seo')
    expect(mockGetHeadings).not.toHaveBeenCalled()
    expect(mockGetTextContent).toHaveBeenCalled()
    expect(mockExtractTfidf).toHaveBeenCalledTimes(1)
  })
})

// --- AC.B2.2 ↔ AC.LEX-SCRAPE.3 ---------------------------------------------

describe('AC.LEX-SCRAPE.3 — kw vierge avec triggerScrapeIfMissing=true', () => {
  it('appelle fetchAndPersist avant le check texts', async () => {
    const order: string[] = []
    mockFetchAndPersist.mockImplementation(async () => {
      order.push('fetchAndPersist')
      return {
        keyword: 'seo', lang: 'fr', country: 'fr',
        fromCache: null, scrapedAt: new Date().toISOString(),
        serpResults: [], scrapes: [], paaQuestions: [],
      }
    })
    mockGetTextContent.mockImplementation(async () => {
      order.push('getTextContent')
      return TEXT_ROWS
    })

    await analyzeLexique('seo', { triggerScrapeIfMissing: true })
    expect(order.indexOf('fetchAndPersist')).toBeLessThan(order.indexOf('getTextContent'))
    expect(mockFetchAndPersist).toHaveBeenCalledWith('seo', 'specifique', 'fr', 'fr')
  })

  it('ne déclenche PAS fetchAndPersist si triggerScrapeIfMissing est falsy', async () => {
    await analyzeLexique('seo')
    expect(mockFetchAndPersist).not.toHaveBeenCalled()
    await analyzeLexique('seo', { triggerScrapeIfMissing: false })
    expect(mockFetchAndPersist).not.toHaveBeenCalled()
  })
})

// --- AC.B2.3 ↔ AC.LEX-SCRAPE.3.bis -----------------------------------------

describe('AC.LEX-SCRAPE.3.bis — kw vierge sans trigger → throw verbatim', () => {
  it('texts vide + triggerScrapeIfMissing absent → LexiqueScrapeMissingError', async () => {
    mockGetTextContent.mockResolvedValue([])
    await expect(analyzeLexique('vide')).rejects.toThrow(LexiqueScrapeMissingError)
  })

  it("message d'erreur exact : « Lancez d'abord l'analyse SERP dans l'onglet Lieutenants »", async () => {
    mockGetTextContent.mockResolvedValue([])
    await expect(analyzeLexique('vide')).rejects.toThrowError(
      "Lancez d'abord l'analyse SERP dans l'onglet Lieutenants",
    )
  })

  it('même avec triggerScrapeIfMissing=true, si texts vide après scrape → throw', async () => {
    mockGetTextContent.mockResolvedValue([])
    await expect(
      analyzeLexique('vide', { triggerScrapeIfMissing: true }),
    ).rejects.toThrow(LexiqueScrapeMissingError)
  })
})

// --- AC.B2.4 ↔ AC.LEX-SCRAPE.4 ---------------------------------------------

describe('AC.LEX-SCRAPE.4 — signature pure', () => {
  it('invocable sans contexte HTTP/Express', async () => {
    const result = await analyzeLexique('test-kw')
    expect(result.tfidfResult).toEqual(TFIDF_FAKE)
  })
})

// --- AC.B2.5 — extractTfidf strict ----------------------------------------

describe('AC.B2.5 — délègue à extractTfidf 1×', () => {
  it('extractTfidf est appelé exactement 1 fois et son résultat est retourné inchangé', async () => {
    const r = await analyzeLexique('seo')
    expect(mockExtractTfidf).toHaveBeenCalledTimes(1)
    expect(mockExtractTfidf).toHaveBeenCalledWith('seo', 'fr', 'fr')
    expect(r.tfidfResult).toBe(TFIDF_FAKE)
  })
})

// --- Persistance optionnelle -----------------------------------------------

describe('persistance lexique_explorations', () => {
  it('appelle saveLexiqueTfidf si articleId est fourni', async () => {
    await analyzeLexique('seo', { articleId: 42 })
    expect(mockSaveLexiqueTfidf).toHaveBeenCalledWith(42, 'seo', TFIDF_FAKE)
  })

  it("n'appelle PAS saveLexiqueTfidf si articleId est absent", async () => {
    await analyzeLexique('seo')
    expect(mockSaveLexiqueTfidf).not.toHaveBeenCalled()
  })

  it('si saveLexiqueTfidf échoue, le résultat tfidf est quand même retourné (best-effort)', async () => {
    mockSaveLexiqueTfidf.mockRejectedValue(new Error('DB down'))
    const r = await analyzeLexique('seo', { articleId: 42 })
    expect(r.tfidfResult).toEqual(TFIDF_FAKE)
  })
})

// --- AC.B2.6 — header AUTHORITY -------------------------------------------

describe('AC.B2.6 — header AUTHORITY', () => {
  it('le fichier source contient un header AUTHORITY conforme', async () => {
    const { readFile } = await import('node:fs/promises')
    const { fileURLToPath } = await import('node:url')
    const path = fileURLToPath(new URL('../../../server/services/keyword/lexique-analysis.service.ts', import.meta.url))
    const src = await readFile(path, 'utf8')
    expect(src).toMatch(/AUTHORITY: PostgreSQL/)
    expect(src).toMatch(/lexique_explorations/)
    expect(src).toMatch(/scrape-corpus/)
    expect(src).toMatch(/NEVER IMPORTS:.*lieutenants-/i)
    expect(src).toMatch(/NEVER READS:.*headings/)
  })
})
