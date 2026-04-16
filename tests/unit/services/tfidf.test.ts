// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { tokenize, extractTfidf } from '../../../server/services/keyword/tfidf.service'
import type { SerpCompetitor } from '../../../shared/types/serp-analysis.types'

function makeCompetitor(textContent: string, fetchError?: string): SerpCompetitor {
  return {
    position: 1,
    title: 'Page',
    url: 'https://example.com',
    domain: 'example.com',
    headings: [],
    textContent,
    fetchError,
  }
}

describe('tokenize', () => {
  it('lowercases text', () => {
    const tokens = tokenize('Bonjour MONDE')
    expect(tokens).toContain('bonjour')
    expect(tokens).toContain('monde')
  })

  it('removes punctuation', () => {
    const tokens = tokenize('mot-clé, phrase! test.')
    expect(tokens).toContain('mot-clé')
    expect(tokens).toContain('phrase')
    expect(tokens).toContain('test')
  })

  it('preserves French accented characters', () => {
    const tokens = tokenize('référencement élémentaire à côté')
    expect(tokens).toContain('référencement')
    expect(tokens).toContain('élémentaire')
    expect(tokens).toContain('côté')
  })

  it('filters French stopwords', () => {
    const tokens = tokenize('les solutions pour les problèmes dans une situation')
    expect(tokens).not.toContain('les')
    expect(tokens).not.toContain('pour')
    expect(tokens).not.toContain('dans')
    expect(tokens).not.toContain('une')
    expect(tokens).toContain('solutions')
    expect(tokens).toContain('problèmes')
    expect(tokens).toContain('situation')
  })

  it('filters terms shorter than 3 characters', () => {
    const tokens = tokenize('le bon ai la top seo')
    expect(tokens).not.toContain('ai')
    expect(tokens).not.toContain('le')
    expect(tokens).not.toContain('la')
    expect(tokens).toContain('bon')
    expect(tokens).toContain('top')
    expect(tokens).toContain('seo')
  })

  it('filters pure numeric terms', () => {
    const tokens = tokenize('test 123 nombre 456')
    expect(tokens).not.toContain('123')
    expect(tokens).not.toContain('456')
    expect(tokens).toContain('test')
    expect(tokens).toContain('nombre')
  })

  it('returns empty array for empty text', () => {
    expect(tokenize('')).toEqual([])
  })

  it('handles whitespace-only text', () => {
    expect(tokenize('   \n\t  ')).toEqual([])
  })
})

describe('extractTfidf', () => {
  it('returns empty result for empty competitors', () => {
    const result = extractTfidf([], 'seo')
    expect(result).toEqual({
      keyword: 'seo',
      totalCompetitors: 0,
      obligatoire: [],
      differenciateur: [],
      optionnel: [],
    })
  })

  it('filters competitors with fetchError', () => {
    const competitors = [
      makeCompetitor('content valide ici'),
      makeCompetitor('', 'Network error'),
    ]
    const result = extractTfidf(competitors, 'test')
    expect(result.totalCompetitors).toBe(1)
  })

  it('filters competitors with empty textContent', () => {
    const competitors = [
      makeCompetitor('content valide ici'),
      makeCompetitor(''),
    ]
    const result = extractTfidf(competitors, 'test')
    expect(result.totalCompetitors).toBe(1)
  })

  it('classifies terms as obligatoire when DF >= 0.7', () => {
    // Term "seo" present in 8/10 competitors = 80%
    const competitors = Array.from({ length: 10 }, (_, i) =>
      makeCompetitor(i < 8 ? 'seo naturel référencement' : 'autre contenu différent'),
    )
    const result = extractTfidf(competitors, 'test')
    const seoTerm = result.obligatoire.find(t => t.term === 'seo')
    expect(seoTerm).toBeDefined()
    expect(seoTerm!.level).toBe('obligatoire')
    expect(seoTerm!.documentFrequency).toBe(0.8)
  })

  it('classifies terms as differenciateur when 0.3 <= DF < 0.7', () => {
    // Term present in 5/10 competitors = 50%
    const competitors = Array.from({ length: 10 }, (_, i) =>
      makeCompetitor(i < 5 ? 'stratégie marketing digital' : 'autre contenu différent'),
    )
    const result = extractTfidf(competitors, 'test')
    const term = result.differenciateur.find(t => t.term === 'stratégie')
    expect(term).toBeDefined()
    expect(term!.level).toBe('differenciateur')
    expect(term!.documentFrequency).toBe(0.5)
  })

  it('classifies terms as optionnel when DF < 0.3', () => {
    // Term present in 2/10 competitors = 20%
    const competitors = Array.from({ length: 10 }, (_, i) =>
      makeCompetitor(i < 2 ? 'niche spécifique rare' : 'contenu générique standard'),
    )
    const result = extractTfidf(competitors, 'test')
    const term = result.optionnel.find(t => t.term === 'niche')
    expect(term).toBeDefined()
    expect(term!.level).toBe('optionnel')
    expect(term!.documentFrequency).toBe(0.2)
  })

  it('computes density as totalOccurrences / totalCompetitors', () => {
    // Term "seo" appears 3 times in doc1, 2 times in doc2 → total 5, density = 5/2 = 2.5
    const competitors = [
      makeCompetitor('seo seo seo référencement naturel'),
      makeCompetitor('seo seo référencement web'),
    ]
    const result = extractTfidf(competitors, 'test')
    const allTerms = [...result.obligatoire, ...result.differenciateur, ...result.optionnel]
    const seoTerm = allTerms.find(t => t.term === 'seo')
    expect(seoTerm).toBeDefined()
    expect(seoTerm!.density).toBe(2.5)
  })

  it('sorts terms by density descending within each level', () => {
    // Two competitors with "content content content" (density 3) and "test" (density 1)
    const competitors = [
      makeCompetitor('content content content test'),
      makeCompetitor('content content content test'),
    ]
    const result = extractTfidf(competitors, 'test')
    const obligatoire = result.obligatoire
    if (obligatoire.length >= 2) {
      expect(obligatoire[0].density).toBeGreaterThanOrEqual(obligatoire[1].density)
    }
  })

  it('limits to 50 terms per level', () => {
    // Generate 60 unique terms present in all competitors
    const terms = Array.from({ length: 60 }, (_, i) => `termunique${String(i).padStart(3, '0')}`)
    const text = terms.join(' ')
    const competitors = [
      makeCompetitor(text),
      makeCompetitor(text),
    ]
    const result = extractTfidf(competitors, 'test')
    expect(result.obligatoire.length).toBeLessThanOrEqual(50)
  })

  it('sets keyword from parameter', () => {
    const competitors = [makeCompetitor('contenu test')]
    const result = extractTfidf(competitors, 'seo local')
    expect(result.keyword).toBe('seo local')
  })

  it('includes competitorCount and totalCompetitors in each term', () => {
    const competitors = [
      makeCompetitor('optimisation contenu web'),
      makeCompetitor('optimisation site internet'),
      makeCompetitor('contenu digital marketing'),
    ]
    const result = extractTfidf(competitors, 'test')
    const allTerms = [...result.obligatoire, ...result.differenciateur, ...result.optionnel]
    const optim = allTerms.find(t => t.term === 'optimisation')
    expect(optim).toBeDefined()
    expect(optim!.competitorCount).toBe(2)
    expect(optim!.totalCompetitors).toBe(3)
  })

  it('rounds documentFrequency to 2 decimal places', () => {
    // 1/3 = 0.333... should round to 0.33
    const competitors = [
      makeCompetitor('unique terme spécial'),
      makeCompetitor('autre contenu différent'),
      makeCompetitor('encore différent ici'),
    ]
    const result = extractTfidf(competitors, 'test')
    const allTerms = [...result.obligatoire, ...result.differenciateur, ...result.optionnel]
    const uniqueTerm = allTerms.find(t => t.term === 'unique')
    expect(uniqueTerm).toBeDefined()
    expect(uniqueTerm!.documentFrequency).toBe(0.33)
  })
})
