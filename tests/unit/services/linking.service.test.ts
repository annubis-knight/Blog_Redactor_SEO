import { describe, it, expect } from 'vitest'
import {
  isValidHierarchyLink,
  getLinksForArticle,
  checkAnchorDiversity,
  familySuggestions,
} from '../../../server/services/article/linking.service'
import type { Article } from '../../../shared/types/index'
import type { LinkingMatrix, InternalLink } from '../../../shared/types/linking.types'

describe('linking.service', () => {
  describe('isValidHierarchyLink', () => {
    it('allows Pilier → Intermédiaire', () => {
      expect(isValidHierarchyLink('pilier', 'intermediaire')).toBe(true)
    })

    it('allows Intermédiaire → Spécialisé', () => {
      expect(isValidHierarchyLink('intermediaire', 'specifique')).toBe(true)
    })

    // Changement volontaire du 2026-09-21 : la règle acceptait `distance <= 2`,
    // soit la distance maximale possible — elle ne refusait donc jamais rien.
    // Dans un cocon sémantique, le pilier parle à ses intermédiaires, qui
    // parlent à leurs fiches. Sauter un cran dilue la structure.
    it('refuse Pilier → Spécialisé (saut de niveau)', () => {
      expect(isValidHierarchyLink('pilier', 'specifique')).toBe(false)
    })

    it('refuse aussi le sens inverse Spécialisé → Pilier', () => {
      expect(isValidHierarchyLink('specifique', 'pilier')).toBe(false)
    })

    it('allows same level links (articles frères)', () => {
      expect(isValidHierarchyLink('pilier', 'pilier')).toBe(true)
      expect(isValidHierarchyLink('intermediaire', 'intermediaire')).toBe(true)
      expect(isValidHierarchyLink('specifique', 'specifique')).toBe(true)
    })

    it('allows reverse direction sur un seul cran', () => {
      expect(isValidHierarchyLink('specifique', 'intermediaire')).toBe(true)
      expect(isValidHierarchyLink('intermediaire', 'pilier')).toBe(true)
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

// C7 — FR-RED-LINKING-MANUAL : le maillage se pose à la main, mais l'outil
// propose d'office, pour un parent, un lien vers chacun de ses enfants (et pour
// un enfant, vers son parent) ; un article pas encore publié est signalé.
describe('familySuggestions', () => {
  const art = (over: Partial<Article>): Article => ({
    id: 0, title: '', type: 'pilier', slug: 's', topic: null, status: 'à rédiger', phase: 'proposed', completedChecks: [],
    suggestedKeyword: null, captainKeywordLocked: null, painPoint: null, painIntentExpected: null, parentId: null, parentSection: null, ...over,
  })
  const PILIER = art({ id: 10, title: 'Rénovation énergétique : le guide', type: 'pilier' })
  const COMBLES = art({ id: 11, title: 'Isoler ses combles', type: 'intermediaire', parentId: 10, parentSection: 'Isoler les combles', status: 'publié', captainKeywordLocked: 'isolation combles' })
  const FENETRES = art({ id: 12, title: 'Changer ses fenêtres', type: 'intermediaire', parentId: 10, parentSection: 'Changer les fenêtres' })
  const texte = '<h2>Isoler les combles</h2><p>Pour aller plus loin, lisez notre article « Isoler ses combles ».</p><h2>Changer les fenêtres</h2><p>Le double vitrage, puis Changer ses fenêtres pas à pas.</p>'

  it('un parent : un lien vers chaque enfant, ancre prise dans le texte ; un enfant non publié est signalé', () => {
    const s = familySuggestions(PILIER, [PILIER, COMBLES, FENETRES], texte, new Set())
    expect(s.map(x => [x.targetId, x.suggestedAnchor])).toEqual([[11, 'Isoler ses combles'], [12, 'Changer ses fenêtres']])
    expect(s[0]!.reason).toMatch(/Article enfant.*Isoler les combles/)
    expect(s[0]!.reason).not.toMatch(/pas encore publié/)
    expect(s[1]!.reason).toMatch(/pas encore publié/)
  })

  it('un enfant : un lien vers son parent', () => {
    const s = familySuggestions(COMBLES, [PILIER, COMBLES], '<p>Tout part du guide « Rénovation énergétique : le guide ».</p>', new Set())
    expect(s).toEqual([expect.objectContaining({ targetId: 10, suggestedAnchor: 'Rénovation énergétique : le guide' })])
    expect(s[0]!.reason).toMatch(/Article parent/)
  })

  it('déjà lié, ou ancre introuvable dans le texte : rien', () => {
    expect(familySuggestions(PILIER, [PILIER, COMBLES, FENETRES], texte, new Set([11, 12]))).toEqual([])
    expect(familySuggestions(PILIER, [PILIER, COMBLES], '<p>Sans rapport.</p>', new Set())).toEqual([])
  })
})

