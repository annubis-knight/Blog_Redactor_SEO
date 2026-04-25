// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---
vi.mock('../../../server/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockGetCached = vi.fn()
const mockSetCached = vi.fn()
vi.mock('../../../server/db/cache-helpers', () => ({
  slugify: (text: string) => text.toLowerCase().replace(/\s+/g, '-'),
  getCached: (...args: unknown[]) => mockGetCached(...args),
  setCached: (...args: unknown[]) => mockSetCached(...args),
}))

vi.mock('../../../server/services/external/dataforseo.service', () => ({
  fetchSerp: vi.fn().mockResolvedValue([
    { position: 1, title: 'Page 1', url: 'https://example.com/1', description: 'Desc 1', domain: 'example.com' },
    { position: 2, title: 'Page 2', url: 'https://example.com/2', description: 'Desc 2', domain: 'example.com' },
  ]),
  fetchPaa: vi.fn().mockResolvedValue([
    { question: 'What is SEO?', answer: 'SEO is...' },
  ]),
}))

// Mock global fetch for HTML fetching
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { fetchSerp, fetchPaa } from '../../../server/services/external/dataforseo.service'
import { extractHeadings, extractTextContent, analyzeSerpCompetitors } from '../../../server/services/external/serp-analysis.service'

const mockFetchSerp = vi.mocked(fetchSerp)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCached.mockResolvedValue(null)
  mockSetCached.mockResolvedValue(undefined)
  mockFetch.mockResolvedValue({
    ok: true,
    text: () => Promise.resolve('<html><body><h1>Title</h1><h2>Section</h2><p>Content text</p></body></html>'),
  })
})

describe('extractHeadings', () => {
  it('extracts H1, H2, H3 from HTML', () => {
    const html = '<h1>Main Title</h1><h2>Sub Section</h2><h3>Detail</h3><h4>Ignored</h4>'
    const result = extractHeadings(html)
    expect(result).toEqual([
      { level: 1, text: 'Main Title' },
      { level: 2, text: 'Sub Section' },
      { level: 3, text: 'Detail' },
    ])
  })

  it('strips inner HTML tags from headings', () => {
    const html = '<h2><strong>Bold</strong> Title</h2>'
    const result = extractHeadings(html)
    expect(result).toEqual([{ level: 2, text: 'Bold Title' }])
  })

  it('decodes HTML entities', () => {
    const html = '<h1>A &amp; B &lt;C&gt;</h1>'
    const result = extractHeadings(html)
    expect(result).toEqual([{ level: 1, text: 'A & B <C>' }])
  })

  it('returns empty array for no headings', () => {
    expect(extractHeadings('<p>No headings here</p>')).toEqual([])
  })

  it('skips empty headings', () => {
    const html = '<h1>  </h1><h2>Real Title</h2>'
    const result = extractHeadings(html)
    expect(result).toEqual([{ level: 2, text: 'Real Title' }])
  })
})

describe('extractTextContent', () => {
  it('strips tags and returns clean text', () => {
    const html = '<p>Hello <strong>world</strong></p>'
    expect(extractTextContent(html)).toBe('Hello world')
  })

  it('removes script and style blocks', () => {
    const html = '<script>alert("x")</script><style>body{}</style><p>Content</p>'
    expect(extractTextContent(html)).toBe('Content')
  })

  it('removes noscript blocks', () => {
    const html = '<noscript>Enable JS</noscript><p>Visible</p>'
    expect(extractTextContent(html)).toBe('Visible')
  })

  it('decodes HTML entities', () => {
    expect(extractTextContent('<p>A&amp;B&nbsp;C</p>')).toBe('A&B C')
  })

  it('collapses whitespace', () => {
    const html = '<p>  lots   of    spaces  </p>'
    expect(extractTextContent(html)).toBe('lots of spaces')
  })
})

describe('analyzeSerpCompetitors', () => {
  it('fetches SERP and PAA when service is called (cache handled at route level post-Sprint 15.5-bis)', async () => {
    const result = await analyzeSerpCompetitors('seo', 'pilier')
    expect(fetchSerp).toHaveBeenCalledWith('seo')
    expect(fetchPaa).toHaveBeenCalledWith('seo')
  })

  it('fetches HTML for each competitor URL', async () => {
    await analyzeSerpCompetitors('seo', 'intermediaire')
    expect(mockFetch).toHaveBeenCalledTimes(2) // 2 SERP results
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/1', expect.objectContaining({
      headers: expect.objectContaining({ 'User-Agent': expect.any(String) }),
    }))
  })

  it('extracts headings and text content from fetched HTML', async () => {
    const result = await analyzeSerpCompetitors('seo', 'intermediaire')
    expect(result.competitors[0].headings).toEqual([
      { level: 1, text: 'Title' },
      { level: 2, text: 'Section' },
    ])
    expect(result.competitors[0].textContent).toContain('Content text')
  })

  it('preserves raw text content for TF-IDF cascade (NFR11)', async () => {
    const result = await analyzeSerpCompetitors('seo', 'intermediaire')
    for (const comp of result.competitors) {
      expect(comp).toHaveProperty('textContent')
      expect(typeof comp.textContent).toBe('string')
    }
  })

  it('handles fetch errors gracefully per competitor', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('<h1>OK</h1><p>Text</p>') })
      .mockRejectedValueOnce(new Error('Network error'))

    const result = await analyzeSerpCompetitors('seo', 'intermediaire')
    expect(result.competitors).toHaveLength(2)
    expect(result.competitors[0].headings).toHaveLength(1)
    expect(result.competitors[1].fetchError).toBe('Network error')
    expect(result.competitors[1].headings).toEqual([])
  })

  it('sets fromCache to false for fresh results', async () => {
    const result = await analyzeSerpCompetitors('seo', 'intermediaire')
    expect(result.fromCache).toBe(false)
  })

  it('returns maxScraped count', async () => {
    const result = await analyzeSerpCompetitors('seo', 'intermediaire')
    expect(result.maxScraped).toBe(2)
  })

  it('includes PAA questions in result', async () => {
    const result = await analyzeSerpCompetitors('seo', 'intermediaire')
    expect(result.paaQuestions).toEqual([{ question: 'What is SEO?', answer: 'SEO is...' }])
  })
})
