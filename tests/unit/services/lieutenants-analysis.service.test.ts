// @vitest-environment node
/**
 * Story B1 — TDD lieutenants-analysis.service.ts
 *
 * Couvre AC.B1.1 → AC.B1.5 (≈ AC.LIE-SCRAPE.2/3/4 du PRD).
 *
 * Le service prépare les données scrape pour Lieutenants :
 *   - assure que les scrapes existent (fetchAndPersist via scrape-corpus)
 *   - lit headings + paa
 *   - n'utilise JAMAIS textContent (le test B1.1 le vérifie par mock count)
 *
 * L'IA Lieutenants reste portée par la route SSE
 * `/keywords/:keyword/propose-lieutenants` (keyword-ai-panel.routes.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockFetchAndPersist = vi.fn()
const mockGetHeadings = vi.fn()
const mockGetTextContent = vi.fn()
const mockGetPaaQuestions = vi.fn()

vi.mock('../../../server/services/external/scrape-corpus.service', () => ({
  fetchAndPersist: (...args: unknown[]) => mockFetchAndPersist(...args),
  getHeadings: (...args: unknown[]) => mockGetHeadings(...args),
  getTextContent: (...args: unknown[]) => mockGetTextContent(...args),
  getPaaQuestions: (...args: unknown[]) => mockGetPaaQuestions(...args),
}))

import { proposeLieutenants } from '../../../server/services/keyword/lieutenants-analysis.service.js'

const SCRAPE_RESULT_FRESH = {
  keyword: 'seo',
  lang: 'fr',
  country: 'fr',
  fromCache: null,
  scrapedAt: new Date().toISOString(),
  serpResults: Array.from({ length: 10 }, (_, i) => ({
    keyword: 'seo', lang: 'fr', country: 'fr',
    position: i + 1,
    url: `https://example.com/${i + 1}`,
    title: `T${i + 1}`,
    domain: 'example.com',
    fetchedAt: new Date().toISOString(),
  })),
  scrapes: [],
  paaQuestions: [],
}

const HEADINGS_ROWS = Array.from({ length: 10 }, (_, i) => ({
  position: i + 1,
  url: `https://example.com/${i + 1}`,
  domain: 'example.com',
  headings: [{ level: 1, text: `Title ${i + 1}` }],
  isBlog: i % 2 === 0,
}))

const PAA_ROWS = [
  { id: 1, keyword: 'seo', lang: 'fr', country: 'fr', question: 'Q1', answer: 'A1', depth: 1, parentQuestion: null, fetchedAt: new Date().toISOString() },
  { id: 2, keyword: 'seo', lang: 'fr', country: 'fr', question: 'Q2', answer: null, depth: 1, parentQuestion: null, fetchedAt: new Date().toISOString() },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchAndPersist.mockResolvedValue(SCRAPE_RESULT_FRESH)
  mockGetHeadings.mockResolvedValue(HEADINGS_ROWS)
  mockGetTextContent.mockResolvedValue([])
  mockGetPaaQuestions.mockResolvedValue(PAA_ROWS)
})

// --- AC.B1.1 ↔ AC.LIE-SCRAPE.2 ---------------------------------------------

describe('AC.LIE-SCRAPE.2 — ne lit jamais textContent', () => {
  it('proposeLieutenants n\'appelle PAS getTextContent', async () => {
    await proposeLieutenants('seo', 'pilier')
    expect(mockGetTextContent).not.toHaveBeenCalled()
    expect(mockGetHeadings).toHaveBeenCalled()
    expect(mockGetPaaQuestions).toHaveBeenCalled()
    expect(mockFetchAndPersist).toHaveBeenCalled()
  })
})

// --- Pipeline ordre + délégation -------------------------------------------

describe('Pipeline interne', () => {
  it('appelle fetchAndPersist AVANT getHeadings', async () => {
    const order: string[] = []
    mockFetchAndPersist.mockImplementation(async () => {
      order.push('fetchAndPersist')
      return SCRAPE_RESULT_FRESH
    })
    mockGetHeadings.mockImplementation(async () => {
      order.push('getHeadings')
      return HEADINGS_ROWS
    })
    await proposeLieutenants('seo', 'pilier')
    expect(order.indexOf('fetchAndPersist')).toBeLessThan(order.indexOf('getHeadings'))
  })

  it('passe lang/country par défaut "fr","fr"', async () => {
    await proposeLieutenants('seo', 'pilier')
    expect(mockFetchAndPersist).toHaveBeenCalledWith('seo', 'pilier', 'fr', 'fr')
    expect(mockGetHeadings).toHaveBeenCalledWith('seo', 'fr', 'fr')
    expect(mockGetPaaQuestions).toHaveBeenCalledWith('seo', 'fr', 'fr')
  })
})

// --- Forme du retour -------------------------------------------------------

describe('forme retour ProposeLieutenantsServiceResult', () => {
  it('expose competitors (sans textContent), paaQuestions, maxScraped, fromCache', async () => {
    const result = await proposeLieutenants('seo', 'pilier')
    expect(result.keyword).toBe('seo')
    expect(result.articleLevel).toBe('pilier')
    expect(result.competitors).toHaveLength(10)
    for (const c of result.competitors) {
      expect(c).toHaveProperty('position')
      expect(c).toHaveProperty('url')
      expect(c).toHaveProperty('headings')
      expect(c).toHaveProperty('isBlog')
      // textContent ne doit PAS être exposé par le service Lieutenants
      expect(c).not.toHaveProperty('textContent')
    }
    expect(result.paaQuestions).toHaveLength(2)
    expect(result.maxScraped).toBe(10)
    expect(result.fromCache).toBe(false)
  })

  it('mappe fromCache "memory"|"db" vers boolean true', async () => {
    mockFetchAndPersist.mockResolvedValue({ ...SCRAPE_RESULT_FRESH, fromCache: 'memory' })
    const r1 = await proposeLieutenants('seo', 'pilier')
    expect(r1.fromCache).toBe(true)

    mockFetchAndPersist.mockResolvedValue({ ...SCRAPE_RESULT_FRESH, fromCache: 'db' })
    const r2 = await proposeLieutenants('seo', 'pilier')
    expect(r2.fromCache).toBe(true)

    mockFetchAndPersist.mockResolvedValue({ ...SCRAPE_RESULT_FRESH, fromCache: null })
    const r3 = await proposeLieutenants('seo', 'pilier')
    expect(r3.fromCache).toBe(false)
  })
})

// --- AC.B1.3 ↔ AC.LIE-SCRAPE.4 ---------------------------------------------

describe('AC.LIE-SCRAPE.4 — invocable sans contexte HTTP', () => {
  it('signature pure : (keyword, articleLevel) sans req/res', async () => {
    // Le simple fait que ce test compile + run prouve l'AC.
    const result = await proposeLieutenants('test-kw', 'pilier')
    expect(result).toBeDefined()
  })
})

// --- AC.B1.4 — cache mémoire chaud → 0 fetch HTTP --------------------------

describe('cache mémoire chaud → délégation transparente', () => {
  it('si scrape-corpus retourne fromCache="memory" → on consomme sans demander', async () => {
    mockFetchAndPersist.mockResolvedValue({ ...SCRAPE_RESULT_FRESH, fromCache: 'memory' })
    const result = await proposeLieutenants('seo', 'pilier')
    expect(result.fromCache).toBe(true)
    // Le service appelle quand même fetchAndPersist (c'est lui qui gère le cache mémoire),
    // mais le hit interne empêche tout fetch externe — vérifié via les tests scrape-corpus.
    expect(mockFetchAndPersist).toHaveBeenCalledTimes(1)
  })
})

// --- AC.B1.5 — header AUTHORITY --------------------------------------------

describe('AC.B1.5 — header AUTHORITY', () => {
  it('le fichier source contient un header AUTHORITY conforme', async () => {
    const { readFile } = await import('node:fs/promises')
    const { fileURLToPath } = await import('node:url')
    const path = fileURLToPath(new URL('../../../server/services/keyword/lieutenants-analysis.service.ts', import.meta.url))
    const src = await readFile(path, 'utf8')
    expect(src).toMatch(/AUTHORITY: PostgreSQL/)
    expect(src).toMatch(/lieutenant_explorations/)
    expect(src).toMatch(/scrape-corpus/)
    expect(src).toMatch(/NEVER IMPORTS:.*tfidf.*lexique/i)
    expect(src).toMatch(/NEVER READS:.*textContent/)
  })
})
