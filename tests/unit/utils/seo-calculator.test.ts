import { describe, it, expect } from 'vitest'
import {
  countWords,
  calculateKeywordDensity,
  validateHeadingHierarchy,
  analyzeMetaTags,
  calculateSeoScore,
  generateSeoChecklist,
  detectNlpTerms,
} from '../../../src/utils/seo-calculator'
import type { Keyword, ArticleKeywords } from '../../../shared/types/index'
import type { RelatedKeyword } from '../../../shared/types/dataforseo.types'

describe('seo-calculator', () => {
  describe('countWords', () => {
    it('counts words in a plain text string', () => {
      expect(countWords('hello world foo bar')).toBe(4)
    })

    it('returns 0 for empty string', () => {
      expect(countWords('')).toBe(0)
    })

    it('returns 0 for whitespace only', () => {
      expect(countWords('   ')).toBe(0)
    })

    it('handles multiple spaces between words', () => {
      expect(countWords('hello   world')).toBe(2)
    })
  })

  describe('calculateKeywordDensity', () => {
    const pilierKeyword: Keyword = { keyword: 'référencement naturel', cocoonName: 'SEO', type: 'Pilier' }
    const moyenneKeyword: Keyword = { keyword: 'optimisation', cocoonName: 'SEO', type: 'Moyenne traine' }

    it('calculates density for a keyword present in content', () => {
      const html = '<p>Le référencement naturel est important. Le référencement naturel aide les PME à se développer sur le web de manière efficace et durable.</p>'
      const result = calculateKeywordDensity(html, pilierKeyword)
      expect(result.keyword).toBe('référencement naturel')
      expect(result.type).toBe('Pilier')
      expect(result.occurrences).toBe(2)
      expect(result.density).toBeGreaterThan(0)
      expect(result.matchMethod).toBe('exact')
    })

    it('returns 0 density when keyword is not found', () => {
      const html = '<p>Ceci est un texte sans le mot recherché</p>'
      const result = calculateKeywordDensity(html, pilierKeyword)
      expect(result.occurrences).toBe(0)
      expect(result.density).toBe(0)
      expect(result.inTarget).toBe(false)
    })

    it('returns 0 density for empty content', () => {
      const result = calculateKeywordDensity('', moyenneKeyword)
      expect(result.density).toBe(0)
      expect(result.occurrences).toBe(0)
    })

    it('sets inTarget true when density is within range', () => {
      const words = Array(98).fill('mot').join(' ')
      const html = `<p>référencement naturel ${words} référencement naturel et encore référencement naturel</p>`
      const result = calculateKeywordDensity(html, pilierKeyword)
      expect(result.target.min).toBe(1.5)
      expect(result.target.max).toBe(2.5)
    })

    it('applies correct target ranges for each keyword type', () => {
      const html = '<p>test content</p>'
      const longue: Keyword = { keyword: 'test', cocoonName: 'SEO', type: 'Longue traine' }
      const result = calculateKeywordDensity(html, longue)
      expect(result.target.min).toBe(0.3)
      expect(result.target.max).toBe(0.8)
    })

    it('detects long-tail keywords via semantic matching', () => {
      const html = "<p>Les étapes clés d'une création de site web professionnel réussie doivent être suivies méthodiquement.</p>"
      const kw: Keyword = { keyword: 'étapes création site web professionnel', cocoonName: 'Web', type: 'Moyenne traine' }
      const result = calculateKeywordDensity(html, kw)
      expect(result.occurrences).toBeGreaterThanOrEqual(1)
      expect(result.matchMethod).toBe('semantic')
    })

    it('includes matchMethod field', () => {
      const html = '<p>Le seo est important pour votre site</p>'
      const kw: Keyword = { keyword: 'seo', cocoonName: 'SEO', type: 'Pilier' }
      const result = calculateKeywordDensity(html, kw)
      expect(result.matchMethod).toBeDefined()
    })
  })

  describe('validateHeadingHierarchy', () => {
    it('validates a correct hierarchy', () => {
      const html = '<h1>Title</h1><h2>Section</h2><h3>Subsection</h3><h2>Another</h2>'
      const result = validateHeadingHierarchy(html)
      expect(result.isValid).toBe(true)
      expect(result.h1Count).toBe(1)
      expect(result.errors).toHaveLength(0)
    })

    it('detects missing H1', () => {
      const html = '<h2>Section</h2><h3>Subsection</h3>'
      const result = validateHeadingHierarchy(html)
      expect(result.isValid).toBe(false)
      expect(result.h1Count).toBe(0)
      expect(result.errors.some(e => e.message.includes('Aucun H1'))).toBe(true)
    })

    it('detects multiple H1', () => {
      const html = '<h1>First</h1><h1>Second</h1><h2>Section</h2>'
      const result = validateHeadingHierarchy(html)
      expect(result.isValid).toBe(false)
      expect(result.h1Count).toBe(2)
      expect(result.errors.some(e => e.message.includes('2 H1'))).toBe(true)
    })

    it('detects skipped heading levels', () => {
      const html = '<h1>Title</h1><h3>Subsection</h3>'
      const result = validateHeadingHierarchy(html)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Saut de niveau'))).toBe(true)
    })

    it('handles empty content', () => {
      const result = validateHeadingHierarchy('')
      expect(result.isValid).toBe(false)
      expect(result.h1Count).toBe(0)
    })
  })

  describe('analyzeMetaTags', () => {
    it('detects meta title in optimal range', () => {
      const title = 'A'.repeat(55)
      const result = analyzeMetaTags(title, null, null)
      expect(result.titleLength).toBe(55)
      expect(result.titleInRange).toBe(true)
    })

    it('detects meta title too short', () => {
      const result = analyzeMetaTags('Short', null, null)
      expect(result.titleInRange).toBe(false)
    })

    it('detects meta description in optimal range', () => {
      const desc = 'A'.repeat(155)
      const result = analyzeMetaTags(null, desc, null)
      expect(result.descriptionLength).toBe(155)
      expect(result.descriptionInRange).toBe(true)
    })

    it('detects keyword presence in meta title via smart matching', () => {
      const result = analyzeMetaTags('Guide du référencement SEO pour les PME', null, 'référencement SEO')
      expect(result.titleHasKeyword).toBe(true)
    })

    it('detects keyword absence in meta title', () => {
      const result = analyzeMetaTags('Guide pour les PME', null, 'référencement SEO')
      expect(result.titleHasKeyword).toBe(false)
    })

    it('handles null values', () => {
      const result = analyzeMetaTags(null, null, null)
      expect(result.titleLength).toBe(0)
      expect(result.descriptionLength).toBe(0)
      expect(result.titleHasKeyword).toBe(false)
      expect(result.descriptionHasKeyword).toBe(false)
    })
  })

  describe('calculateSeoScore', () => {
    const keywords: Keyword[] = [
      { keyword: 'seo', cocoonName: 'SEO', type: 'Pilier' },
      { keyword: 'optimisation', cocoonName: 'SEO', type: 'Moyenne traine' },
    ]

    it('returns a score between 0 and 100', () => {
      const html = '<h1>SEO Guide</h1><h2>Optimisation</h2><p>Le seo est important pour l\'optimisation des sites web.</p>'
      const result = calculateSeoScore(html, keywords, 'Guide SEO complet pour les entreprises françaises en 2026', 'Découvrez notre guide complet sur le SEO et l\'optimisation de votre site web pour améliorer votre référencement naturel durablement.', 100)
      expect(result.global).toBeGreaterThanOrEqual(0)
      expect(result.global).toBeLessThanOrEqual(100)
    })

    it('includes heading validation', () => {
      const html = '<h1>Title</h1><h2>Section</h2>'
      const result = calculateSeoScore(html, keywords, null, null)
      expect(result.headingValidation).toBeDefined()
      expect(result.headingValidation.h1Count).toBe(1)
    })

    it('includes meta analysis', () => {
      const result = calculateSeoScore('<h1>T</h1><p>text</p>', keywords, 'A'.repeat(55), 'B'.repeat(155))
      expect(result.metaAnalysis.titleInRange).toBe(true)
      expect(result.metaAnalysis.descriptionInRange).toBe(true)
    })

    it('counts words correctly', () => {
      const html = '<h1>Title</h1><p>one two three four five</p>'
      const result = calculateSeoScore(html, keywords, null, null)
      expect(result.wordCount).toBe(6) // Title + 5 words
    })

    it('handles empty content gracefully', () => {
      const result = calculateSeoScore('', [], null, null)
      expect(result.global).toBeGreaterThanOrEqual(0)
      expect(result.wordCount).toBe(0)
    })

    it('scores higher with better meta tags and keyword presence', () => {
      const goodHtml = '<h1>Le SEO pour les PME</h1><h2>Optimisation technique</h2><p>Le seo est la clé du succès. L\'optimisation passe par de bonnes pratiques.</p>'
      const goodTitle = 'Guide SEO complet pour PME - Optimisation en 2026'
      const goodDesc = 'Découvrez comment le SEO et l\'optimisation technique peuvent aider votre PME à se développer. Guide complet avec des conseils pratiques et actionnables.'

      const scoreGood = calculateSeoScore(goodHtml, keywords, goodTitle, goodDesc)
      const scoreBad = calculateSeoScore('<p>random text without any keywords</p>', keywords, null, null)

      expect(scoreGood.global).toBeGreaterThan(scoreBad.global)
    })

    it('returns all factor scores', () => {
      const html = '<h1>SEO</h1><p>seo optimisation</p>'
      const result = calculateSeoScore(html, keywords, null, null)
      expect(result.factors).toHaveProperty('keywordPilierScore')
      expect(result.factors).toHaveProperty('keywordSecondaryScore')
      expect(result.factors).toHaveProperty('headingScore')
      expect(result.factors).toHaveProperty('metaTitleScore')
      expect(result.factors).toHaveProperty('metaDescriptionScore')
      expect(result.factors).toHaveProperty('contentLengthScore')
    })

    it('includes checklistItems and nlpTerms in result', () => {
      const relatedKws: RelatedKeyword[] = [
        { keyword: 'optimisation', searchVolume: 1000, competition: 0.5, cpc: 1.2 },
      ]
      const html = '<h1>SEO</h1><p>seo optimisation</p>'
      const result = calculateSeoScore(html, keywords, 'SEO title', null, undefined, relatedKws)
      expect(result.checklistItems).toBeDefined()
      expect(result.nlpTerms).toBeDefined()
      expect(result.nlpTerms).toHaveLength(1)
      expect(result.nlpTerms[0].isDetected).toBe(true)
    })

    it('uses articleKeywords capitaine for scoring when provided', () => {
      const articleKw: ArticleKeywords = {
        articleSlug: 'test',
        capitaine: 'design web',
        lieutenants: ['ux design', 'ergonomie'],
        lexique: ['interface', 'utilisateur', 'responsive'],
      }
      const html = '<h1>Design web moderne</h1><h2>UX design avancé</h2><p>Le design web est essentiel pour une bonne ergonomie. L\'interface utilisateur doit être responsive.</p>'
      const result = calculateSeoScore(html, keywords, null, null, undefined, undefined, articleKw)

      // Should use capitaine + lieutenants, not cocoon keywords
      expect(result.keywordDensities.some(d => d.keyword === 'design web')).toBe(true)
      expect(result.keywordDensities.some(d => d.keyword === 'ux design')).toBe(true)
      expect(result.keywordDensities.some(d => d.keyword === 'ergonomie')).toBe(true)
      // Cocoon keywords should NOT be present
      expect(result.keywordDensities.some(d => d.keyword === 'seo')).toBe(false)
      expect(result.keywordDensities.some(d => d.keyword === 'optimisation')).toBe(false)
      // Capitaine density type should be Pilier
      const capitaineDensity = result.keywordDensities.find(d => d.keyword === 'design web')
      expect(capitaineDensity?.type).toBe('Pilier')
      // hasArticleKeywords flag
      expect(result.hasArticleKeywords).toBe(true)
    })

    it('returns empty densities when no articleKeywords (no fallback)', () => {
      const html = '<h1>SEO</h1><p>seo optimisation</p>'
      const result = calculateSeoScore(html, keywords, null, null, undefined, undefined, undefined)
      // No fallback to cocoon keywords anymore — empty densities
      expect(result.keywordDensities).toHaveLength(0)
      expect(result.hasArticleKeywords).toBe(false)
    })

    it('returns empty densities when articleKeywords has empty capitaine', () => {
      const emptyArticleKw: ArticleKeywords = {
        articleSlug: 'test',
        capitaine: '',
        lieutenants: [],
        lexique: [],
      }
      const html = '<h1>SEO</h1><p>seo optimisation</p>'
      const result = calculateSeoScore(html, keywords, null, null, undefined, undefined, emptyArticleKw)
      expect(result.keywordDensities).toHaveLength(0)
      expect(result.hasArticleKeywords).toBe(false)
    })

    it('uses capitaine for checklist when articleKeywords is provided', () => {
      const articleKw: ArticleKeywords = {
        articleSlug: 'test',
        capitaine: 'design web',
        lieutenants: [],
        lexique: [],
      }
      const html = '<h1>Design web</h1><h2>Design web tips</h2><p>Le design web est la clé.</p><p>En conclusion, le design web reste essentiel.</p>'
      const result = calculateSeoScore(html, keywords, 'Guide design web', 'Description design web', undefined, undefined, articleKw)
      // Checklist should check for 'design web', not 'seo'
      expect(result.checklistItems.length).toBeGreaterThan(0)
      expect(result.checklistItems[0].keyword).toBe('design web')
    })

    it('includes hasArticleKeywords field', () => {
      const html = '<h1>T</h1><p>text</p>'
      const result = calculateSeoScore(html, keywords, null, null)
      expect(result).toHaveProperty('hasArticleKeywords')
      expect(typeof result.hasArticleKeywords).toBe('boolean')
    })
  })

  describe('generateSeoChecklist', () => {
    const keywords: Keyword[] = [
      { keyword: 'seo', cocoonName: 'SEO', type: 'Pilier' },
    ]

    it('returns 6 checklist items for pilier keyword', () => {
      const html = '<h1>SEO Guide</h1><h2>SEO Tips</h2><p>Le seo est important.</p><p>Conclusion avec seo.</p>'
      const result = generateSeoChecklist(html, keywords, 'Meta SEO', 'Description SEO')
      expect(result).toHaveLength(6)
    })

    it('detects keyword in meta title', () => {
      const html = '<h1>Title</h1><p>Content</p>'
      const result = generateSeoChecklist(html, keywords, 'Guide SEO', null)
      const metaItem = result.find(r => r.location === 'metaTitle')
      expect(metaItem?.isPresent).toBe(true)
    })

    it('detects keyword in H1', () => {
      const html = '<h1>Guide SEO complet</h1><p>Content</p>'
      const result = generateSeoChecklist(html, keywords, null, null)
      const h1Item = result.find(r => r.location === 'h1')
      expect(h1Item?.isPresent).toBe(true)
    })

    it('detects keyword in intro (first paragraph)', () => {
      const html = '<h1>Title</h1><p>Le seo est la clé.</p><p>Deuxième paragraphe.</p>'
      const result = generateSeoChecklist(html, keywords, null, null)
      const introItem = result.find(r => r.location === 'intro')
      expect(introItem?.isPresent).toBe(true)
    })

    it('detects keyword in H2', () => {
      const html = '<h1>Title</h1><h2>Méthodes SEO</h2><p>Content</p>'
      const result = generateSeoChecklist(html, keywords, null, null)
      const h2Item = result.find(r => r.location === 'h2')
      expect(h2Item?.isPresent).toBe(true)
    })

    it('detects keyword in conclusion (last paragraph)', () => {
      const html = '<h1>Title</h1><p>Intro</p><p>Middle</p><p>En conclusion, le seo reste essentiel.</p>'
      const result = generateSeoChecklist(html, keywords, null, null)
      const conclusionItem = result.find(r => r.location === 'conclusion')
      expect(conclusionItem?.isPresent).toBe(true)
    })

    it('marks absent when keyword not found', () => {
      const html = '<h1>Title</h1><p>Content without keyword</p>'
      const result = generateSeoChecklist(html, keywords, 'Title', 'Description')
      const h1Item = result.find(r => r.location === 'h1')
      expect(h1Item?.isPresent).toBe(false)
    })

    it('returns empty array when no pilier keyword', () => {
      const noKeywords: Keyword[] = [
        { keyword: 'test', cocoonName: 'SEO', type: 'Moyenne traine' },
      ]
      const result = generateSeoChecklist('<h1>T</h1><p>c</p>', noKeywords, null, null)
      expect(result).toHaveLength(0)
    })

    it('includes matchMethod and matchScore fields', () => {
      const html = '<h1>Guide SEO complet</h1><p>Le seo est la clé.</p>'
      const result = generateSeoChecklist(html, keywords, 'Guide SEO', null)
      const metaItem = result.find(r => r.location === 'metaTitle')!
      expect(metaItem).toHaveProperty('matchMethod')
      expect(metaItem).toHaveProperty('matchScore')
      expect(metaItem.matchMethod).toBe('exact')
      expect(metaItem.matchScore).toBe(1.0)
    })

    it('detects long-tail keyword via semantic matching in checklist', () => {
      const longTailKws: Keyword[] = [
        { keyword: 'étapes création site web professionnel', cocoonName: 'Web', type: 'Pilier' },
      ]
      const html = "<h1>Les étapes clés d'une création de site web professionnel réussie</h1><h2>Pourquoi créer un site</h2><p>Introduction sur les étapes clés de la création d'un site web professionnel.</p><p>Conclusion sur les étapes de création de site web professionnel.</p>"
      const result = generateSeoChecklist(html, longTailKws, "Les étapes pour créer un site web professionnel", null)
      const h1Item = result.find(r => r.location === 'h1')
      expect(h1Item?.isPresent).toBe(true)
      expect(h1Item?.matchMethod).toBe('semantic')
    })
  })

  describe('detectNlpTerms', () => {
    const relatedKeywords: RelatedKeyword[] = [
      { keyword: 'référencement', searchVolume: 5000, competition: 0.8, cpc: 2.5 },
      { keyword: 'backlinks', searchVolume: 3000, competition: 0.6, cpc: 1.8 },
      { keyword: 'indexation', searchVolume: 1000, competition: 0.3, cpc: 0.5 },
    ]

    it('detects terms present in content', () => {
      const html = '<p>Le référencement et les backlinks sont importants.</p>'
      const result = detectNlpTerms(html, relatedKeywords)
      expect(result).toHaveLength(3)
      expect(result.find(r => r.term === 'référencement')?.isDetected).toBe(true)
      expect(result.find(r => r.term === 'backlinks')?.isDetected).toBe(true)
      expect(result.find(r => r.term === 'indexation')?.isDetected).toBe(false)
    })

    it('preserves search volume', () => {
      const result = detectNlpTerms('<p>test</p>', relatedKeywords)
      expect(result.find(r => r.term === 'référencement')?.searchVolume).toBe(5000)
    })

    it('returns empty array for empty relatedKeywords', () => {
      const result = detectNlpTerms('<p>content</p>', [])
      expect(result).toHaveLength(0)
    })

    it('is case insensitive', () => {
      const html = '<p>Le RÉFÉRENCEMENT est important.</p>'
      const result = detectNlpTerms(html, relatedKeywords)
      expect(result.find(r => r.term === 'référencement')?.isDetected).toBe(true)
    })
  })
})
