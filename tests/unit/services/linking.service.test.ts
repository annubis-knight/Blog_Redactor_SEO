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
      { sourceId: 1, targetId: 2, anchorText: 'link ab', position: 'p-1' },
      { sourceId: 1, targetId: 3, anchorText: 'link ac', position: 'p-2' },
      { sourceId: 2, targetId: 1, anchorText: 'link ba', position: 'p-1' },
      { sourceId: 3, targetId: 4, anchorText: 'link cd', position: 'p-1' },
    ]
    const matrix: LinkingMatrix = { links, updatedAt: null }

    it('returns outgoing links for article 1', () => {
      const result = getLinksForArticle(matrix, 1)
      expect(result.outgoing).toHaveLength(2)
      expect(result.outgoing[0]!.targetId).toBe(2)
    })

    it('returns incoming links for article 1', () => {
      const result = getLinksForArticle(matrix, 1)
      expect(result.incoming).toHaveLength(1)
      expect(result.incoming[0]!.sourceId).toBe(2)
    })

    it('returns empty arrays for unknown article', () => {
      const result = getLinksForArticle(matrix, 99)
      expect(result.outgoing).toHaveLength(0)
      expect(result.incoming).toHaveLength(0)
    })
  })

  describe('checkAnchorDiversity', () => {
    it('returns no alerts when anchors are diverse', () => {
      const matrix: LinkingMatrix = {
        links: [
          { sourceId: 1, targetId: 2, anchorText: 'anchor 1', position: 'p-1' },
          { sourceId: 1, targetId: 3, anchorText: 'anchor 2', position: 'p-2' },
          { sourceId: 2, targetId: 3, anchorText: 'anchor 3', position: 'p-1' },
        ],
        updatedAt: null,
      }
      expect(checkAnchorDiversity(matrix)).toHaveLength(0)
    })

    it('flags anchors used more than 3 times', () => {
      const matrix: LinkingMatrix = {
        links: [
          { sourceId: 1, targetId: 2, anchorText: 'same text', position: 'p-1' },
          { sourceId: 1, targetId: 3, anchorText: 'same text', position: 'p-2' },
          { sourceId: 2, targetId: 3, anchorText: 'same text', position: 'p-1' },
          { sourceId: 3, targetId: 4, anchorText: 'same text', position: 'p-1' },
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
          { sourceId: 1, targetId: 2, anchorText: 'SEO Tips', position: 'p-1' },
          { sourceId: 1, targetId: 3, anchorText: 'seo tips', position: 'p-2' },
          { sourceId: 2, targetId: 3, anchorText: 'Seo Tips', position: 'p-1' },
          { sourceId: 3, targetId: 4, anchorText: 'seo tips', position: 'p-1' },
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
