// @vitest-environment node
import { describe, it, expect } from 'vitest'
import type {
  CompetitorContent,
  ContentGapAnalysis,
  ThematicGap,
} from '../../../shared/types/index'

describe('Enriched CompetitorContent types', () => {
  it('accepts CompetitorContent without enrichment fields (backward compatible)', () => {
    const comp: CompetitorContent = {
      url: 'https://example.com',
      title: 'Test Article',
      headings: ['H2: Introduction', 'H2: Conclusion'],
      wordCount: 1500,
      localEntities: ['Toulouse', 'Capitole'],
    }

    expect(comp.url).toBe('https://example.com')
    expect(comp.publishDate).toBeUndefined()
    expect(comp.readabilityScore).toBeUndefined()
    expect(comp.paasCovered).toBeUndefined()
  })

  it('accepts CompetitorContent with all enrichment fields', () => {
    const comp: CompetitorContent = {
      url: 'https://example.com/article',
      title: 'SEO Toulouse Guide',
      headings: ['H2: SEO Local'],
      wordCount: 2000,
      localEntities: ['Toulouse', 'Occitanie'],
      publishDate: '2025-06-15',
      readabilityScore: 72,
      paasCovered: ['Quel est le meilleur SEO à Toulouse ?', 'Comment améliorer son SEO local ?'],
    }

    expect(comp.publishDate).toBe('2025-06-15')
    expect(comp.readabilityScore).toBe(72)
    expect(comp.paasCovered).toHaveLength(2)
  })

  it('ContentGapAnalysis contains all required fields', () => {
    const analysis: ContentGapAnalysis = {
      keyword: 'seo toulouse',
      competitors: [
        {
          url: 'https://a.com',
          title: 'A',
          headings: [],
          wordCount: 1200,
          localEntities: [],
          publishDate: '2024-01-15',
          readabilityScore: 65,
          paasCovered: ['question 1'],
        },
        {
          url: 'https://b.com',
          title: 'B',
          headings: [],
          wordCount: 1800,
          localEntities: ['Toulouse'],
        },
      ],
      themes: [
        { theme: 'seo local', frequency: 4, presentInArticle: true },
        { theme: 'google maps', frequency: 3, presentInArticle: false },
      ],
      gaps: [
        { theme: 'google maps', frequency: 3, presentInArticle: false },
      ],
      averageWordCount: 1500,
      localEntitiesFromCompetitors: [{ entity: 'Toulouse', frequency: 5 }],
      cachedAt: '2026-03-19T10:00:00Z',
    }

    expect(analysis.competitors).toHaveLength(2)
    expect(analysis.competitors[0].readabilityScore).toBe(65)
    expect(analysis.competitors[1].readabilityScore).toBeUndefined()
    expect(analysis.gaps).toHaveLength(1)
    expect(analysis.averageWordCount).toBe(1500)
  })

  it('ThematicGap frequency represents competitor coverage count', () => {
    const gap: ThematicGap = {
      theme: 'référencement naturel',
      frequency: 4,
      presentInArticle: false,
    }

    expect(gap.presentInArticle).toBe(false)
    expect(gap.frequency).toBe(4)
  })

  it('freshnessLabel logic works correctly', () => {
    // Testing the same logic as ContentGapPanel.vue freshnessLabel()
    function freshnessLabel(publishDate?: string): { label: string; cls: string } {
      if (!publishDate) return { label: 'Inconnu', cls: 'freshness-unknown' }
      const months = (Date.now() - new Date(publishDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (months < 6) return { label: 'Frais', cls: 'freshness-fresh' }
      if (months < 18) return { label: 'Ancien', cls: 'freshness-old' }
      return { label: 'Obsolète', cls: 'freshness-obsolete' }
    }

    // Recent article
    const recent = new Date()
    recent.setMonth(recent.getMonth() - 2)
    expect(freshnessLabel(recent.toISOString().split('T')[0]).label).toBe('Frais')

    // Old article (1 year ago)
    const old = new Date()
    old.setFullYear(old.getFullYear() - 1)
    expect(freshnessLabel(old.toISOString().split('T')[0]).label).toBe('Ancien')

    // Obsolete article (2+ years ago)
    const obsolete = new Date()
    obsolete.setFullYear(obsolete.getFullYear() - 3)
    expect(freshnessLabel(obsolete.toISOString().split('T')[0]).label).toBe('Obsolète')

    // No date
    expect(freshnessLabel(undefined).label).toBe('Inconnu')
  })

  it('readabilityLabel logic works correctly', () => {
    function readabilityLabel(score?: number): string {
      if (score == null) return '—'
      if (score >= 70) return `${score} (Facile)`
      if (score >= 50) return `${score} (Moyen)`
      return `${score} (Difficile)`
    }

    expect(readabilityLabel(85)).toBe('85 (Facile)')
    expect(readabilityLabel(60)).toBe('60 (Moyen)')
    expect(readabilityLabel(30)).toBe('30 (Difficile)')
    expect(readabilityLabel(undefined)).toBe('—')
    expect(readabilityLabel(null as any)).toBe('—')
  })
})
