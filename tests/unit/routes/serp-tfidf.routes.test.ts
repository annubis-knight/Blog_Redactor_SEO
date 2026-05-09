// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Story C2 (chantier 2) — la route délègue à lexique-analysis.analyzeLexique.
const mockAnalyzeLexique = vi.fn()

vi.mock('../../../server/services/keyword/lexique-analysis.service', () => {
  class LexiqueScrapeMissingError extends Error {
    constructor() {
      super("Lancez d'abord l'analyse SERP dans l'onglet Lieutenants")
      this.name = 'LexiqueScrapeMissingError'
    }
  }
  return {
    analyzeLexique: (...args: unknown[]) => mockAnalyzeLexique(...args),
    LexiqueScrapeMissingError,
  }
})

import { LexiqueScrapeMissingError as MockLexiqueScrapeMissingError } from '../../../server/services/keyword/lexique-analysis.service.js'

// Mocks restants utilisés par d'autres parties de la route (cache check /serp/analyze).
const mockGetSerpResultsFresh = vi.fn()
const mockReconstructSerp = vi.fn()
vi.mock('../../../server/services/keyword/keyword-serp.service', () => ({
  getSerpResultsFresh: (...args: unknown[]) => mockGetSerpResultsFresh(...args),
  reconstructSerpAnalysisResult: (...args: unknown[]) => mockReconstructSerp(...args),
}))

const mockFetchAndPersist = vi.fn()
vi.mock('../../../server/services/external/scrape-corpus.service', () => ({
  fetchAndPersist: (...args: unknown[]) => mockFetchAndPersist(...args),
}))

import router from '../../../server/routes/serp-analysis.routes'

// --- Minimal Express helpers ---
function makeReq(body: Record<string, unknown> = {}) {
  return { body } as any
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    jsonData: null,
  }
  res.json = vi.fn((data: unknown) => { res.jsonData = data; return res })
  res.status = vi.fn((code: number) => { res.statusCode = code; return res })
  return res
}

function getTfidfHandler() {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/serp/tfidf' && l.route?.methods?.post,
  )
  return layer?.route?.stack?.[0]?.handle
}

const MOCK_TFIDF_RESULT = {
  keyword: 'seo',
  totalCompetitors: 5,
  obligatoire: [
    { term: 'seo', level: 'obligatoire', documentFrequency: 0.8, density: 4.2, competitorCount: 4, totalCompetitors: 5 },
  ],
  differenciateur: [],
  optionnel: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAnalyzeLexique.mockResolvedValue({ tfidfResult: MOCK_TFIDF_RESULT })
})

describe('POST /api/serp/tfidf (Story C2 — bascule lexique-analysis)', () => {
  it('route handler exists', () => {
    expect(getTfidfHandler()).toBeDefined()
  })

  it('returns 400 if keyword is missing', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({})
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.jsonData).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    }))
  })

  it('returns 400 if keyword is empty string', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: '' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 if keyword is whitespace only', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: '   ' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('AC.C2.2 — 404 verbatim si LexiqueScrapeMissingError', async () => {
    mockAnalyzeLexique.mockRejectedValue(new MockLexiqueScrapeMissingError())
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.jsonData).toEqual({
      error: { code: 'NOT_FOUND', message: "Lancez d'abord l'analyse SERP dans l'onglet Lieutenants" },
    })
  })

  it('AC.C2.3 — 200 avec { data: TfidfResult } quand scrapes présents', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ data: MOCK_TFIDF_RESULT })
  })

  it('appelle analyzeLexique avec keyword trimé', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: '  seo local  ' })
    const res = makeRes()
    await handler(req, res)
    expect(mockAnalyzeLexique).toHaveBeenCalledWith('seo local', { articleId: undefined })
  })

  it('AC.C2.4 — articleId fourni → propagé dans opts', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: 'seo', articleId: 42 })
    const res = makeRes()
    await handler(req, res)
    expect(mockAnalyzeLexique).toHaveBeenCalledWith('seo', { articleId: 42 })
  })

  it('articleId invalide (string non-numérique) → opts.articleId = undefined', async () => {
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: 'seo', articleId: 'abc' })
    const res = makeRes()
    await handler(req, res)
    expect(mockAnalyzeLexique).toHaveBeenCalledWith('seo', { articleId: undefined })
  })

  it('returns 500 on unexpected error (non-LexiqueScrapeMissingError)', async () => {
    mockAnalyzeLexique.mockRejectedValue(new Error('DB down'))
    const handler = getTfidfHandler()
    const req = makeReq({ keyword: 'seo' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.jsonData).toEqual(expect.objectContaining({
      error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
    }))
  })
})
