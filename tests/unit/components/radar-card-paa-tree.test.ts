/**
 * FR-RAD-PAA-TREE — Arbre PAA récursif parent → children (Vague 5).
 *
 * Invariants couverts (cf. PRD §8.5) :
 *   - parent (depth 1) avec chevron toggle children s'il a des enfants
 *   - children (depth 2) avec chevron toggle answer s'il a une réponse
 *   - badge match (label issu de matchLabel(paa))
 *   - semanticScore en % si défini
 *   - counts children entre parenthèses
 *   - indicateur "PAA en cache" si cachedPaa === true
 *   - emits toggle-children / toggle-answer avec l'index
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarCardPaaTree from '../../../src/components/intent/radar-card/RadarCardPaaTree.vue'
import type { RadarPaaItem } from '../../../shared/types/intent.types'

const makePaa = (overrides: Partial<RadarPaaItem> = {}): RadarPaaItem => ({
  question: 'Comment faire X ?',
  depth: 1,
  match: 'exact',
  ...overrides,
})

const stubFns = {
  itemBorderClass: () => 'paa-item--exact',
  badgeClass: () => 'paa-badge--exact',
  matchLabel: (paa: RadarPaaItem) => (paa.depth === 2 ? 'Sem. partiel' : 'Exact'),
}

describe('RadarCardPaaTree — FR-RAD-PAA-TREE', () => {
  it('rend un parent avec children et expose les counts entre parenthèses', () => {
    const wrapper = mount(RadarCardPaaTree, {
      props: {
        paaTree: [
          {
            paa: makePaa({ question: 'Q parent', semanticScore: 0.85 }),
            index: 0,
            children: [
              { paa: makePaa({ question: 'Q child 1', depth: 2, parentQuestion: 'Q parent' }), index: 1, children: [] },
              { paa: makePaa({ question: 'Q child 2', depth: 2, parentQuestion: 'Q parent' }), index: 2, children: [] },
            ],
          },
        ],
        expandedPaa: new Set<number>(),
        expandedParents: new Set<number>(),
        cachedPaa: false,
        ...stubFns,
      },
    })
    expect(wrapper.text()).toContain('Q parent')
    expect(wrapper.find('.paa-children-count').text()).toBe('(2)')
    expect(wrapper.find('.paa-semantic').text()).toBe('85%')
    expect(wrapper.find('.paa-badge').text()).toBe('Exact')
    // Children non visibles tant que le parent n'est pas expanded
    expect(wrapper.text()).not.toContain('Q child 1')
  })

  it('children visibles quand parent.index ∈ expandedParents', () => {
    const wrapper = mount(RadarCardPaaTree, {
      props: {
        paaTree: [
          {
            paa: makePaa({ question: 'Q parent' }),
            index: 0,
            children: [
              { paa: makePaa({ question: 'Q child 1', depth: 2, parentQuestion: 'Q parent' }), index: 1, children: [] },
            ],
          },
        ],
        expandedPaa: new Set<number>(),
        expandedParents: new Set<number>([0]),
        cachedPaa: false,
        ...stubFns,
      },
    })
    expect(wrapper.text()).toContain('Q child 1')
    expect(wrapper.find('.paa-children').exists()).toBe(true)
  })

  it('emits toggle-children avec l\'index quand on clique le chevron parent', async () => {
    const wrapper = mount(RadarCardPaaTree, {
      props: {
        paaTree: [
          {
            paa: makePaa(),
            index: 7,
            children: [{ paa: makePaa({ depth: 2 }), index: 8, children: [] }],
          },
        ],
        expandedPaa: new Set<number>(),
        expandedParents: new Set<number>(),
        cachedPaa: false,
        ...stubFns,
      },
    })
    await wrapper.find('.paa-tree-chevron').trigger('click')
    expect(wrapper.emitted('toggle-children')).toEqual([[7]])
  })

  it('emits toggle-answer quand on clique la question d\'un parent ayant une answer', async () => {
    const wrapper = mount(RadarCardPaaTree, {
      props: {
        paaTree: [
          {
            paa: makePaa({ question: 'Q', answer: 'Réponse détaillée' }),
            index: 3,
            children: [],
          },
        ],
        expandedPaa: new Set<number>(),
        expandedParents: new Set<number>(),
        cachedPaa: false,
        ...stubFns,
      },
    })
    await wrapper.find('.paa-question').trigger('click')
    expect(wrapper.emitted('toggle-answer')).toEqual([[3]])
  })

  it('affiche la answer inline quand index ∈ expandedPaa', () => {
    const wrapper = mount(RadarCardPaaTree, {
      props: {
        paaTree: [
          {
            paa: makePaa({ question: 'Q', answer: 'Réponse détaillée 42' }),
            index: 5,
            children: [],
          },
        ],
        expandedPaa: new Set<number>([5]),
        expandedParents: new Set<number>(),
        cachedPaa: false,
        ...stubFns,
      },
    })
    expect(wrapper.find('.paa-answer').text()).toBe('Réponse détaillée 42')
  })

  it('affiche l\'indicateur "PAA en cache" si cachedPaa === true', () => {
    const wrapper = mount(RadarCardPaaTree, {
      props: {
        paaTree: [{ paa: makePaa(), index: 0, children: [] }],
        expandedPaa: new Set<number>(),
        expandedParents: new Set<number>(),
        cachedPaa: true,
        ...stubFns,
      },
    })
    expect(wrapper.find('.paa-tree__cache-hint').exists()).toBe(true)
    expect(wrapper.find('.paa-tree__cache-hint').text()).toContain('PAA en cache')
  })

  it('n\'affiche PAS l\'indicateur cache si cachedPaa === false', () => {
    const wrapper = mount(RadarCardPaaTree, {
      props: {
        paaTree: [{ paa: makePaa(), index: 0, children: [] }],
        expandedPaa: new Set<number>(),
        expandedParents: new Set<number>(),
        cachedPaa: false,
        ...stubFns,
      },
    })
    expect(wrapper.find('.paa-tree__cache-hint').exists()).toBe(false)
  })

  it('un parent SANS children rend un chevron empty (pas de toggle-children)', async () => {
    const wrapper = mount(RadarCardPaaTree, {
      props: {
        paaTree: [{ paa: makePaa(), index: 0, children: [] }],
        expandedPaa: new Set<number>(),
        expandedParents: new Set<number>(),
        cachedPaa: false,
        ...stubFns,
      },
    })
    expect(wrapper.find('.paa-tree-chevron--empty').exists()).toBe(true)
  })
})
