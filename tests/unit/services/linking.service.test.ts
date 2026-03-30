import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isValidHierarchyLink,
  getLinksForArticle,
  checkAnchorDiversity,
} from '../../../server/services/linking.service'
import type { LinkingMatrix, InternalLink } from '../../../shared/types/linking.types'

describe('linking.service', () => {
  describe('isValidHierarchyLink', () => {
    it('allows Pilier → Intermédiaire', () => {
      expect(isValidHierarchyLink('Pilier', 'Intermédiaire')).toBe(true)
    })

    it('allows Intermédiaire → Spécialisé', () => {
      expect(isValidHierarchyLink('Intermédiaire', 'Spécialisé')).toBe(true)
    })

    it('allows Pilier → Spécialisé (distance 2)', () => {
      expect(isValidHierarchyLink('Pilier', 'Spécialisé')).toBe(true)
    })

    it('allows same level links', () => {
      expect(isValidHierarchyLink('Pilier', 'Pilier')).toBe(true)
      expect(isValidHierarchyLink('Intermédiaire', 'Intermédiaire')).toBe(true)
    })

    it('allows reverse direction', () => {
      expect(isValidHierarchyLink('Spécialisé', 'Pilier')).toBe(true)
    })
  })

  describe('getLinksForArticle', () => {
    const links: InternalLink[] = [
      { sourceSlug: 'a', targetSlug: 'b', anchorText: 'link ab', position: 'p-1' },
      { sourceSlug: 'a', targetSlug: 'c', anchorText: 'link ac', position: 'p-2' },
      { sourceSlug: 'b', targetSlug: 'a', anchorText: 'link ba', position: 'p-1' },
      { sourceSlug: 'c', targetSlug: 'd', anchorText: 'link cd', position: 'p-1' },
    ]
    const matrix: LinkingMatrix = { links, updatedAt: null }

    it('returns outgoing links for article a', () => {
      const result = getLinksForArticle(matrix, 'a')
      expect(result.outgoing).toHaveLength(2)
      expect(result.outgoing[0]!.targetSlug).toBe('b')
    })

    it('returns incoming links for article a', () => {
      const result = getLinksForArticle(matrix, 'a')
      expect(result.incoming).toHaveLength(1)
      expect(result.incoming[0]!.sourceSlug).toBe('b')
    })

    it('returns empty arrays for unknown article', () => {
      const result = getLinksForArticle(matrix, 'unknown')
      expect(result.outgoing).toHaveLength(0)
      expect(result.incoming).toHaveLength(0)
    })
  })

  describe('checkAnchorDiversity', () => {
    it('returns no alerts when anchors are diverse', () => {
      const matrix: LinkingMatrix = {
        links: [
          { sourceSlug: 'a', targetSlug: 'b', anchorText: 'anchor 1', position: 'p-1' },
          { sourceSlug: 'a', targetSlug: 'c', anchorText: 'anchor 2', position: 'p-2' },
          { sourceSlug: 'b', targetSlug: 'c', anchorText: 'anchor 3', position: 'p-1' },
        ],
        updatedAt: null,
      }
      expect(checkAnchorDiversity(matrix)).toHaveLength(0)
    })

    it('flags anchors used more than 3 times', () => {
      const matrix: LinkingMatrix = {
        links: [
          { sourceSlug: 'a', targetSlug: 'b', anchorText: 'same text', position: 'p-1' },
          { sourceSlug: 'a', targetSlug: 'c', anchorText: 'same text', position: 'p-2' },
          { sourceSlug: 'b', targetSlug: 'c', anchorText: 'same text', position: 'p-1' },
          { sourceSlug: 'c', targetSlug: 'd', anchorText: 'same text', position: 'p-1' },
        ],
        updatedAt: null,
      }
      const alerts = checkAnchorDiversity(matrix)
      expect(alerts).toHaveLength(1)
      expect(alerts[0]!.anchorText).toBe('same text')
      expect(alerts[0]!.count).toBe(4)
    })

    it('is case-insensitive for anchor comparison', () => {
      const matrix: LinkingMatrix = {
        links: [
          { sourceSlug: 'a', targetSlug: 'b', anchorText: 'SEO Tips', position: 'p-1' },
          { sourceSlug: 'a', targetSlug: 'c', anchorText: 'seo tips', position: 'p-2' },
          { sourceSlug: 'b', targetSlug: 'c', anchorText: 'Seo Tips', position: 'p-1' },
          { sourceSlug: 'c', targetSlug: 'd', anchorText: 'seo tips', position: 'p-1' },
        ],
        updatedAt: null,
      }
      const alerts = checkAnchorDiversity(matrix)
      expect(alerts).toHaveLength(1)
    })

    it('returns empty for empty matrix', () => {
      const matrix: LinkingMatrix = { links: [], updatedAt: null }
      expect(checkAnchorDiversity(matrix)).toHaveLength(0)
    })
  })
})
