// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { tokenize, computeTfidfFromTexts } from '../../../server/services/keyword/tfidf.service'

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

describe('computeTfidfFromTexts', () => {
  it('returns empty result for empty texts array', () => {
    const result = computeTfidfFromTexts([], 'seo')
    expect(result).toEqual({
      keyword: 'seo',
      totalCompetitors: 0,
      obligatoire: [],
      differenciateur: [],
      optionnel: [],
    })
  })

  it('classifies terms as obligatoire when DF >= 0.7', () => {
    // Term "seo" present in 8/10 docs = 80%
    const texts = Array.from({ length: 10 }, (_, i) =>
      i < 8 ? 'seo naturel référencement' : 'autre contenu différent',
    )
    const result = computeTfidfFromTexts(texts, 'test')
    const seoTerm = result.obligatoire.find((t) => t.term === 'seo')
    expect(seoTerm).toBeDefined()
    expect(seoTerm!.level).toBe('obligatoire')
    expect(seoTerm!.documentFrequency).toBe(0.8)
  })

  it('classifies terms as differenciateur when 0.3 <= DF < 0.7', () => {
    const texts = Array.from({ length: 10 }, (_, i) =>
      i < 5 ? 'stratégie marketing digital' : 'autre contenu différent',
    )
    const result = computeTfidfFromTexts(texts, 'test')
    const term = result.differenciateur.find((t) => t.term === 'stratégie')
    expect(term).toBeDefined()
    expect(term!.level).toBe('differenciateur')
    expect(term!.documentFrequency).toBe(0.5)
  })

  it('classifies terms as optionnel when DF < 0.3', () => {
    const texts = Array.from({ length: 10 }, (_, i) =>
      i < 2 ? 'niche spécifique rare' : 'contenu générique standard',
    )
    const result = computeTfidfFromTexts(texts, 'test')
    const term = result.optionnel.find((t) => t.term === 'niche')
    expect(term).toBeDefined()
    expect(term!.level).toBe('optionnel')
    expect(term!.documentFrequency).toBe(0.2)
  })

  it('computes density as totalOccurrences / totalCompetitors', () => {
    const texts = [
      'seo seo seo référencement naturel',
      'seo seo référencement web',
    ]
    const result = computeTfidfFromTexts(texts, 'test')
    const allTerms = [...result.obligatoire, ...result.differenciateur, ...result.optionnel]
    const seoTerm = allTerms.find((t) => t.term === 'seo')
    expect(seoTerm).toBeDefined()
    expect(seoTerm!.density).toBe(2.5)
  })

  it('sorts terms by density descending within each level', () => {
    const texts = [
      'content content content test',
      'content content content test',
    ]
    const result = computeTfidfFromTexts(texts, 'test')
    const obligatoire = result.obligatoire
    if (obligatoire.length >= 2) {
      expect(obligatoire[0].density).toBeGreaterThanOrEqual(obligatoire[1].density)
    }
  })

  it('limits to 50 terms per level', () => {
    const terms = Array.from({ length: 60 }, (_, i) => `termunique${String(i).padStart(3, '0')}`)
    const text = terms.join(' ')
    const result = computeTfidfFromTexts([text, text], 'test')
    expect(result.obligatoire.length).toBeLessThanOrEqual(50)
  })

  it('sets keyword from parameter', () => {
    const result = computeTfidfFromTexts(['contenu test'], 'seo local')
    expect(result.keyword).toBe('seo local')
  })

  it('includes competitorCount and totalCompetitors in each term', () => {
    const texts = [
      'optimisation contenu web',
      'optimisation site internet',
      'contenu digital marketing',
    ]
    const result = computeTfidfFromTexts(texts, 'test')
    const allTerms = [...result.obligatoire, ...result.differenciateur, ...result.optionnel]
    const optim = allTerms.find((t) => t.term === 'optimisation')
    expect(optim).toBeDefined()
    expect(optim!.competitorCount).toBe(2)
    expect(optim!.totalCompetitors).toBe(3)
  })

  it('rounds documentFrequency to 2 decimal places', () => {
    const texts = [
      'unique terme spécial',
      'autre contenu différent',
      'encore différent ici',
    ]
    const result = computeTfidfFromTexts(texts, 'test')
    const allTerms = [...result.obligatoire, ...result.differenciateur, ...result.optionnel]
    const uniqueTerm = allTerms.find((t) => t.term === 'unique')
    expect(uniqueTerm).toBeDefined()
    expect(uniqueTerm!.documentFrequency).toBe(0.33)
  })
})
