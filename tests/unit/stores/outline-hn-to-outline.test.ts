import { describe, it, expect } from 'vitest'
import { hnToOutline } from '../../../src/stores/outline.store'
import type { ProposeLieutenantsHnNode } from '../../../shared/types/serp-analysis.types'

describe('hnToOutline', () => {
  it('creates outline with H1, Introduction, and Conclusion from empty nodes', () => {
    const result = hnToOutline([], 'Mon Article')

    expect(result.sections).toHaveLength(3)
    expect(result.sections[0]).toMatchObject({ level: 1, title: 'Mon Article', annotation: 'sommaire-cliquable' })
    expect(result.sections[1]).toMatchObject({ level: 2, title: 'Introduction', annotation: 'content-valeur' })
    expect(result.sections[2]).toMatchObject({ level: 2, title: 'Conclusion', annotation: 'content-reminder' })
  })

  it('creates sections from H2/H3 nodes', () => {
    const nodes: ProposeLieutenantsHnNode[] = [
      { level: 2, text: 'Section A' },
      { level: 3, text: 'Section B' },
    ]

    const result = hnToOutline(nodes, 'Titre')

    expect(result.sections).toHaveLength(5) // H1 + Intro + 2 nodes + Conclusion
    expect(result.sections[2]).toMatchObject({ level: 2, title: 'Section A', annotation: null })
    expect(result.sections[3]).toMatchObject({ level: 3, title: 'Section B', annotation: null })
  })

  it('clamps level < 2 to 2', () => {
    const nodes: ProposeLieutenantsHnNode[] = [
      { level: 1, text: 'Should be H2' },
    ]

    const result = hnToOutline(nodes, 'Titre')

    expect(result.sections[2]).toMatchObject({ level: 2, title: 'Should be H2' })
  })

  it('clamps level > 3 to 3', () => {
    const nodes: ProposeLieutenantsHnNode[] = [
      { level: 5, text: 'Should be H3' },
      { level: 4, text: 'Also H3' },
    ]

    const result = hnToOutline(nodes, 'Titre')

    expect(result.sections[2]).toMatchObject({ level: 3, title: 'Should be H3' })
    expect(result.sections[3]).toMatchObject({ level: 3, title: 'Also H3' })
  })

  it('flattens children into sections', () => {
    const nodes: ProposeLieutenantsHnNode[] = [
      {
        level: 2,
        text: 'Parent',
        children: [
          { level: 3, text: 'Child A' },
          { level: 3, text: 'Child B' },
        ],
      },
    ]

    const result = hnToOutline(nodes, 'Titre')

    // H1 + Intro + Parent + Child A + Child B + Conclusion = 6
    expect(result.sections).toHaveLength(6)
    expect(result.sections[2]).toMatchObject({ level: 2, title: 'Parent' })
    expect(result.sections[3]).toMatchObject({ level: 3, title: 'Child A' })
    expect(result.sections[4]).toMatchObject({ level: 3, title: 'Child B' })
  })

  it('clamps children levels the same way', () => {
    const nodes: ProposeLieutenantsHnNode[] = [
      {
        level: 2,
        text: 'Parent',
        children: [
          { level: 5, text: 'Deep child' },
          { level: 1, text: 'Shallow child' },
        ],
      },
    ]

    const result = hnToOutline(nodes, 'Titre')

    expect(result.sections[3]).toMatchObject({ level: 3, title: 'Deep child' })
    expect(result.sections[4]).toMatchObject({ level: 2, title: 'Shallow child' })
  })

  it('generates unique IDs for all sections', () => {
    const nodes: ProposeLieutenantsHnNode[] = [
      { level: 2, text: 'A' },
      { level: 2, text: 'B' },
      { level: 2, text: 'C', children: [{ level: 3, text: 'C1' }] },
    ]

    const result = hnToOutline(nodes, 'Titre')

    const ids = result.sections.map(s => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('generates ID format matching h{level}-{timestamp}-{suffix}', () => {
    const nodes: ProposeLieutenantsHnNode[] = [{ level: 2, text: 'Test' }]

    const result = hnToOutline(nodes, 'Titre')

    expect(result.sections[0].id).toMatch(/^h1-\d+$/)
    expect(result.sections[1].id).toMatch(/^h2-\d+-intro$/)
    expect(result.sections[2].id).toMatch(/^h2-\d+-\d+$/)
    expect(result.sections[3].id).toMatch(/^h2-\d+-conclusion$/)
  })

  it('handles nodes with empty children array', () => {
    const nodes: ProposeLieutenantsHnNode[] = [
      { level: 2, text: 'No children', children: [] },
    ]

    const result = hnToOutline(nodes, 'Titre')

    // H1 + Intro + node + Conclusion
    expect(result.sections).toHaveLength(4)
  })

  it('handles complex nested structure', () => {
    const nodes: ProposeLieutenantsHnNode[] = [
      { level: 2, text: 'H2-1', children: [{ level: 3, text: 'H3-1a' }, { level: 3, text: 'H3-1b' }] },
      { level: 2, text: 'H2-2' },
      { level: 2, text: 'H2-3', children: [{ level: 3, text: 'H3-3a' }] },
    ]

    const result = hnToOutline(nodes, 'Mon Guide')

    // H1 + Intro + H2-1 + H3-1a + H3-1b + H2-2 + H2-3 + H3-3a + Conclusion = 9
    expect(result.sections).toHaveLength(9)
    expect(result.sections[0].title).toBe('Mon Guide')
    expect(result.sections[result.sections.length - 1].title).toBe('Conclusion')
  })
})
