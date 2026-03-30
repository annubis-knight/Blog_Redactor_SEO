import { describe, it, expect } from 'vitest'
import {
  checkAnswerCapsules,
  analyzeQuestionHeadings,
  countSourcedStats,
  detectLongParagraphs,
  detectJargon,
  calculateGeoScore,
} from '../../../src/utils/geo-calculator'

describe('geo-calculator', () => {
  describe('checkAnswerCapsules', () => {
    it('detects answer capsules via data attribute', () => {
      const html = '<h2>Comment optimiser?</h2><p data-type="answer-capsule">Résumé court.</p>'
      const result = checkAnswerCapsules(html)
      expect(result).toHaveLength(1)
      expect(result[0].hasAnswerCapsule).toBe(true)
    })

    it('detects short first paragraph as answer capsule', () => {
      const html = '<h2>Qu\'est-ce que le SEO?</h2><p>Le SEO est l\'optimisation pour les moteurs de recherche.</p>'
      const result = checkAnswerCapsules(html)
      expect(result).toHaveLength(1)
      expect(result[0].hasAnswerCapsule).toBe(true)
    })

    it('marks long first paragraph as no answer capsule', () => {
      const longText = Array(60).fill('mot').join(' ')
      const html = `<h2>Section</h2><p>${longText}</p>`
      const result = checkAnswerCapsules(html)
      expect(result).toHaveLength(1)
      expect(result[0].hasAnswerCapsule).toBe(false)
    })

    it('returns empty for no H2s', () => {
      const html = '<h1>Title</h1><p>Content</p>'
      const result = checkAnswerCapsules(html)
      expect(result).toHaveLength(0)
    })

    it('handles multiple H2 sections', () => {
      const html = '<h2>Section 1</h2><p>Short.</p><h2>Section 2</h2><p>' + Array(60).fill('word').join(' ') + '</p>'
      const result = checkAnswerCapsules(html)
      expect(result).toHaveLength(2)
      expect(result[0].hasAnswerCapsule).toBe(true)
      expect(result[1].hasAnswerCapsule).toBe(false)
    })
  })

  describe('analyzeQuestionHeadings', () => {
    it('detects question mark in headings', () => {
      const html = '<h2>Comment optimiser?</h2><h2>Bonnes pratiques</h2><h3>Pourquoi?</h3>'
      const result = analyzeQuestionHeadings(html)
      expect(result.totalH2H3).toBe(3)
      expect(result.questionCount).toBe(2)
      expect(result.percentage).toBe(67)
    })

    it('detects French question words', () => {
      const html = '<h2>Comment faire du SEO</h2><h3>Pourquoi le SEO est important</h3>'
      const result = analyzeQuestionHeadings(html)
      expect(result.questionCount).toBe(2)
      expect(result.percentage).toBe(100)
    })

    it('returns 0% for no questions', () => {
      const html = '<h2>Guide SEO</h2><h3>Méthodes</h3>'
      const result = analyzeQuestionHeadings(html)
      expect(result.percentage).toBe(0)
    })

    it('handles empty content', () => {
      const result = analyzeQuestionHeadings('')
      expect(result.totalH2H3).toBe(0)
      expect(result.percentage).toBe(0)
    })

    it('ignores H1 and H4+ headings', () => {
      const html = '<h1>Title?</h1><h4>Subtitle?</h4><h2>Normal heading</h2>'
      const result = analyzeQuestionHeadings(html)
      expect(result.totalH2H3).toBe(1)
      expect(result.questionCount).toBe(0)
    })
  })

  describe('countSourcedStats', () => {
    it('detects percentage with parenthetical source', () => {
      const html = '<p>42% (Source : Étude XYZ 2025)</p>'
      const result = countSourcedStats(html)
      expect(result.count).toBeGreaterThanOrEqual(1)
    })

    it('detects "selon" pattern', () => {
      const html = '<p>Les ventes ont augmenté de 35% selon McKinsey.</p>'
      const result = countSourcedStats(html)
      expect(result.count).toBeGreaterThanOrEqual(1)
    })

    it('returns 0 for content without stats', () => {
      const html = '<p>Le SEO est important pour les entreprises.</p>'
      const result = countSourcedStats(html)
      expect(result.count).toBe(0)
      expect(result.inTarget).toBe(false)
    })

    it('marks inTarget when count >= 3', () => {
      const html = '<p>42% (Source A). 30% selon experts. 50% (source : étude C). 60% (étude D 2025).</p>'
      const result = countSourcedStats(html)
      expect(result.count).toBeGreaterThanOrEqual(3)
      expect(result.inTarget).toBe(true)
    })
  })

  describe('calculateGeoScore', () => {
    it('returns a score between 0 and 100', () => {
      const html = '<h2>Comment optimiser?</h2><p>Le SEO améliore la visibilité, 42% (Source XYZ).</p>'
      const result = calculateGeoScore(html)
      expect(result.global).toBeGreaterThanOrEqual(0)
      expect(result.global).toBeLessThanOrEqual(100)
    })

    it('includes all factors', () => {
      const html = '<h2>Question?</h2><p>Short answer.</p>'
      const result = calculateGeoScore(html)
      expect(result.factors).toHaveProperty('extractibilityScore')
      expect(result.factors).toHaveProperty('questionHeadingsScore')
      expect(result.factors).toHaveProperty('answerCapsulesScore')
      expect(result.factors).toHaveProperty('sourcedStatsScore')
    })

    it('includes answerCapsules, questionHeadings, sourcedStats', () => {
      const html = '<h2>Heading</h2><p>Content.</p>'
      const result = calculateGeoScore(html)
      expect(result.answerCapsules).toBeDefined()
      expect(result.questionHeadings).toBeDefined()
      expect(result.sourcedStats).toBeDefined()
    })

    it('scores higher with question headings and short paragraphs', () => {
      const goodHtml = '<h2>Comment optimiser le SEO?</h2><p>Réponse courte et claire.</p>' +
        '<h2>Pourquoi le GEO?</h2><p>Explication concise.</p>'
      const badHtml = '<h2>SEO Guide</h2><p>' + Array(100).fill('word').join(' ') + '</p>'
      const good = calculateGeoScore(goodHtml)
      const bad = calculateGeoScore(badHtml)
      expect(good.global).toBeGreaterThan(bad.global)
    })

    it('handles empty content', () => {
      const result = calculateGeoScore('')
      expect(result.global).toBeGreaterThanOrEqual(0)
    })

    it('includes paragraphAlerts and jargonDetections', () => {
      const html = '<h2>Section</h2><p>Short.</p>'
      const result = calculateGeoScore(html)
      expect(result.paragraphAlerts).toBeDefined()
      expect(result.jargonDetections).toBeDefined()
    })
  })

  describe('detectLongParagraphs', () => {
    it('detects paragraphs exceeding 80 words', () => {
      const longParagraph = '<p>' + Array(90).fill('mot').join(' ') + '</p>'
      const html = '<p>Short paragraph.</p>' + longParagraph
      const result = detectLongParagraphs(html)
      expect(result).toHaveLength(1)
      expect(result[0].index).toBe(1)
      expect(result[0].wordCount).toBe(90)
    })

    it('returns empty for short paragraphs', () => {
      const html = '<p>This is a short paragraph.</p><p>Another short one.</p>'
      const result = detectLongParagraphs(html)
      expect(result).toHaveLength(0)
    })

    it('includes excerpt in alert', () => {
      const longText = Array(90).fill('word').join(' ')
      const html = `<p>${longText}</p>`
      const result = detectLongParagraphs(html)
      expect(result).toHaveLength(1)
      expect(result[0].excerpt.length).toBeLessThanOrEqual(84) // 80 + "..."
    })

    it('handles empty content', () => {
      const result = detectLongParagraphs('')
      expect(result).toHaveLength(0)
    })
  })

  describe('detectJargon', () => {
    it('detects jargon terms in content', () => {
      const html = '<p>Nous devons leverage nos synergies pour un résultat win-win.</p>'
      const result = detectJargon(html)
      expect(result.length).toBeGreaterThanOrEqual(2)
      const terms = result.map(d => d.term)
      expect(terms).toContain('leverage')
      expect(terms).toContain('win-win')
    })

    it('provides suggestions for detected jargon', () => {
      const html = '<p>Nous devons leverage cette opportunité.</p>'
      const result = detectJargon(html)
      const leverage = result.find(d => d.term === 'leverage')
      expect(leverage).toBeDefined()
      expect(leverage!.suggestion).toBe('utiliser')
    })

    it('counts occurrences correctly', () => {
      const html = '<p>Cette synergie crée une synergie positive. Encore une synergie.</p>'
      const result = detectJargon(html)
      const synergie = result.find(d => d.term === 'synergie')
      expect(synergie).toBeDefined()
      expect(synergie!.count).toBe(3)
    })

    it('returns empty when no jargon found', () => {
      const html = '<p>Le SEO est important pour la visibilité en ligne.</p>'
      const result = detectJargon(html)
      expect(result).toHaveLength(0)
    })

    it('is case insensitive', () => {
      const html = '<p>LEVERAGE et Synergie sont du jargon.</p>'
      const result = detectJargon(html)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })
  })
})
