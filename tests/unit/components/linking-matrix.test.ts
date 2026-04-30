/**
 * Tests anti-régression pour LinkingMatrix — matrice de maillage interne.
 *
 * Composant macro de la vue LinkingMatrixView (audit SEO post-publication).
 * Couvre les invariants critiques :
 *   1. liste vide → message "Aucun article"
 *   2. agrégation : N liens (source, target) → count=N et anchors[N]
 *   3. cellule diagonale (source==target) → classe "self" + tiret
 *   4. cellule avec lien → classe "has-link" + count visible
 *   5. cellule sans lien → ni self ni has-link
 *   6. classe "same-cocoon" appliquée si source/target dans le même cocon
 *   7. tooltip de cellule = liste des ancres concaténées
 *   8. troncature du titre dans les en-têtes
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LinkingMatrix from '../../../src/components/linking/LinkingMatrix.vue'

function makeArticle(id: number, title: string) {
  return {
    id,
    slug: `art-${id}`,
    title,
    type: 'Pilier' as const,
    cocoonId: 1,
    keyword: '',
    painPoint: null,
    locked: false,
    status: 'proposed' as const,
    phase: 'proposed' as const,
  }
}

function makeCocoon(name: string, articles: ReturnType<typeof makeArticle>[]) {
  return {
    id: Math.random(),
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    articles,
  }
}

describe('LinkingMatrix', () => {
  it('liste vide → message "Aucun article trouvé"', () => {
    const wrapper = mount(LinkingMatrix, {
      props: { links: [], cocoons: [] },
    })
    expect(wrapper.find('.matrix-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('Aucun article trouvé')
    expect(wrapper.find('.matrix-table').exists()).toBe(false)
  })

  it('rend une matrice N×N avec un en-tête par article', () => {
    const cocoon = makeCocoon('Cocoon A', [
      makeArticle(1, 'Article 1'),
      makeArticle(2, 'Article 2'),
      makeArticle(3, 'Article 3'),
    ])
    const wrapper = mount(LinkingMatrix, {
      props: { links: [], cocoons: [cocoon] },
    })

    const colHeaders = wrapper.findAll('.matrix-col-header')
    expect(colHeaders).toHaveLength(3)
    const rowHeaders = wrapper.findAll('.matrix-row-header')
    expect(rowHeaders).toHaveLength(3)
    // 3 sources × 3 cibles = 9 cellules
    expect(wrapper.findAll('.matrix-cell')).toHaveLength(9)
  })

  it('REGRESSION GUARD : agrégation correcte de N liens identiques', () => {
    // 3 liens 1→2 avec 3 ancres différentes → count=3, 3 ancres dans tooltip.
    const cocoon = makeCocoon('Cocoon A', [makeArticle(1, 'Source'), makeArticle(2, 'Cible')])
    const links = [
      { sourceId: 1, targetId: 2, anchorText: 'lien rouge' },
      { sourceId: 1, targetId: 2, anchorText: 'cliquez ici' },
      { sourceId: 1, targetId: 2, anchorText: 'voir aussi' },
    ]
    const wrapper = mount(LinkingMatrix, { props: { links, cocoons: [cocoon] } })

    const cell12 = wrapper.find('[class*="has-link"]')
    expect(cell12.exists()).toBe(true)
    expect(cell12.find('.cell-count').text()).toBe('3')
    // Tooltip = ancres concaténées
    expect(cell12.attributes('title')).toBe('lien rouge, cliquez ici, voir aussi')
  })

  it('cellule diagonale (source=target) → classe self + tiret affiché', () => {
    const cocoon = makeCocoon('Cocoon A', [makeArticle(1, 'Article 1')])
    const wrapper = mount(LinkingMatrix, { props: { links: [], cocoons: [cocoon] } })

    const selfCell = wrapper.find('.matrix-cell.self')
    expect(selfCell.exists()).toBe(true)
    expect(selfCell.find('.cell-self').text()).toBe('—')
  })

  it('cellule sans lien → ni "has-link" ni count', () => {
    const cocoon = makeCocoon('Cocoon A', [makeArticle(1, 'A1'), makeArticle(2, 'A2')])
    const wrapper = mount(LinkingMatrix, { props: { links: [], cocoons: [cocoon] } })

    // Cellule (1, 2) hors diagonale, sans lien → ni self ni has-link
    const cells = wrapper.findAll('.matrix-cell')
    const offDiagonalEmpty = cells.find(c =>
      !c.classes('self') && !c.classes('has-link'),
    )
    expect(offDiagonalEmpty).toBeDefined()
    expect(offDiagonalEmpty!.find('.cell-count').exists()).toBe(false)
  })

  it('REGRESSION GUARD : classe "same-cocoon" appliquée si source/target dans le même cocoon', () => {
    const cocoonA = makeCocoon('Cocoon A', [makeArticle(1, 'A1'), makeArticle(2, 'A2')])
    const cocoonB = makeCocoon('Cocoon B', [makeArticle(3, 'B1')])
    const wrapper = mount(LinkingMatrix, {
      props: { links: [], cocoons: [cocoonA, cocoonB] },
    })

    const cells = wrapper.findAll('.matrix-cell')
    // Cellules same-cocoon : (1→2) et (2→1). Plus 0 (self diag).
    const sameCocoonCells = cells.filter(c => c.classes('same-cocoon'))
    expect(sameCocoonCells).toHaveLength(2)

    // Cellules cross-cocoon (A→B et B→A) ne doivent PAS avoir same-cocoon
    const crossCocoonCells = cells.filter(c =>
      !c.classes('same-cocoon') && !c.classes('self'),
    )
    // (1,3) (2,3) (3,1) (3,2) = 4 cellules cross-cocoon
    expect(crossCocoonCells.length).toBe(4)
  })

  it('agrégation respecte les sources distinctes (1→2 et 3→2 ≠ même cellule)', () => {
    const cocoon = makeCocoon('Cocoon A', [
      makeArticle(1, 'A1'),
      makeArticle(2, 'A2'),
      makeArticle(3, 'A3'),
    ])
    const links = [
      { sourceId: 1, targetId: 2, anchorText: 'a1→a2' },
      { sourceId: 3, targetId: 2, anchorText: 'a3→a2' },
    ]
    const wrapper = mount(LinkingMatrix, { props: { links, cocoons: [cocoon] } })

    // Deux cellules has-link distinctes (pas une seule mégacellule)
    const linkedCells = wrapper.findAll('.matrix-cell.has-link')
    expect(linkedCells).toHaveLength(2)
    expect(linkedCells[0].find('.cell-count').text()).toBe('1')
    expect(linkedCells[1].find('.cell-count').text()).toBe('1')
  })

  it('titre tronqué dans les colonnes (12 chars) et lignes (20 chars)', () => {
    const longTitle = 'Un titre vraiment beaucoup trop long pour rentrer'
    const cocoon = makeCocoon('Cocoon', [makeArticle(1, longTitle)])
    const wrapper = mount(LinkingMatrix, { props: { links: [], cocoons: [cocoon] } })

    const colLabel = wrapper.find('.col-label').text()
    const rowLabel = wrapper.find('.row-title').text()

    expect(colLabel.endsWith('...')).toBe(true)
    expect(colLabel.length).toBe(15) // 12 + '...'
    expect(rowLabel.endsWith('...')).toBe(true)
    expect(rowLabel.length).toBe(23) // 20 + '...'

    // Le titre complet reste dans le `title` attribute pour tooltip natif
    expect(wrapper.find('.matrix-col-header').attributes('title')).toBe(longTitle)
  })

  it('multi-cocoons : tous les articles agrégés dans la matrice', () => {
    const cocoonA = makeCocoon('A', [makeArticle(1, 'A1'), makeArticle(2, 'A2')])
    const cocoonB = makeCocoon('B', [makeArticle(3, 'B1')])
    const wrapper = mount(LinkingMatrix, {
      props: { links: [], cocoons: [cocoonA, cocoonB] },
    })

    expect(wrapper.findAll('.matrix-row-header')).toHaveLength(3)
    expect(wrapper.findAll('.matrix-col-header')).toHaveLength(3)
  })

  it('légende toujours visible quand au moins un article', () => {
    const cocoon = makeCocoon('A', [makeArticle(1, 'A1')])
    const wrapper = mount(LinkingMatrix, { props: { links: [], cocoons: [cocoon] } })
    expect(wrapper.find('.matrix-legend').exists()).toBe(true)
    expect(wrapper.text()).toContain('Lien existant')
    expect(wrapper.text()).toContain('Même cocon')
  })
})
