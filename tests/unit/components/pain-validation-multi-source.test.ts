import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VerdictBadge from '../../../src/components/intent/VerdictBadge.vue'
import ConfidenceBar from '../../../src/components/intent/ConfidenceBar.vue'
import SourceDots from '../../../src/components/intent/SourceDots.vue'
import SourceBlock from '../../../src/components/intent/SourceBlock.vue'
import DiscussionList from '../../../src/components/intent/DiscussionList.vue'
import AutocompleteChips from '../../../src/components/intent/AutocompleteChips.vue'
import RowDetail from '../../../src/components/intent/RowDetail.vue'
import LatentAlert from '../../../src/components/intent/LatentAlert.vue'
import ValidationSummary from '../../../src/components/intent/ValidationSummary.vue'
import ValidationRow from '../../../src/components/intent/ValidationRow.vue'
import type { PainVerdictCategory, MultiSourceVerdict } from '../../../shared/types/intent.types'

describe('VerdictBadge', () => {
  const categories: PainVerdictCategory[] = ['brulante', 'confirmee', 'emergente', 'latente', 'froide', 'incertaine']

  it('renders all 6 verdict categories', () => {
    for (const cat of categories) {
      const wrapper = mount(VerdictBadge, { props: { category: cat } })
      expect(wrapper.find('.verdict-badge').exists()).toBe(true)
      expect(wrapper.find(`.verdict-badge--${cat}`).exists()).toBe(true)
    }
  })

  it('applies provisional styling when provisional=true', () => {
    const wrapper = mount(VerdictBadge, { props: { category: 'confirmee', provisional: true } })
    expect(wrapper.find('.verdict-badge--provisional').exists()).toBe(true)
  })

  it('does not apply provisional styling when provisional=false', () => {
    const wrapper = mount(VerdictBadge, { props: { category: 'brulante', provisional: false } })
    expect(wrapper.find('.verdict-badge--provisional').exists()).toBe(false)
  })
})

describe('ConfidenceBar', () => {
  it('displays percentage label', () => {
    const wrapper = mount(ConfidenceBar, { props: { value: 0.75 } })
    expect(wrapper.find('.confidence-label').text()).toBe('75%')
  })

  it('handles 0 value', () => {
    const wrapper = mount(ConfidenceBar, { props: { value: 0 } })
    expect(wrapper.find('.confidence-label').text()).toBe('0%')
  })

  it('handles 1.0 value', () => {
    const wrapper = mount(ConfidenceBar, { props: { value: 1 } })
    expect(wrapper.find('.confidence-label').text()).toBe('100%')
  })
})

describe('SourceDots', () => {
  it('renders 4 dots', () => {
    const wrapper = mount(SourceDots, {
      props: {
        sources: {
          autocomplete: 'ok',
          dataforseo: 'ok',
          discussions: 'loading',
          nlp: 'disabled',
        },
      },
    })
    const dots = wrapper.findAll('.source-dot')
    expect(dots).toHaveLength(4)
  })

  it('applies correct state classes', () => {
    const wrapper = mount(SourceDots, {
      props: {
        sources: {
          autocomplete: 'ok',
          dataforseo: 'error',
          discussions: 'loading',
          nlp: 'disabled',
        },
      },
    })
    expect(wrapper.find('.source-dot--ok').exists()).toBe(true)
    expect(wrapper.find('.source-dot--error').exists()).toBe(true)
    expect(wrapper.find('.source-dot--loading').exists()).toBe(true)
    expect(wrapper.find('.source-dot--disabled').exists()).toBe(true)
  })
})

describe('LatentAlert', () => {
  it('renders keyword and explanation', () => {
    const wrapper = mount(LatentAlert, {
      props: {
        keyword: 'fuite chauffe-eau',
        explanation: 'Opportunité first-mover',
      },
    })
    expect(wrapper.text()).toContain('fuite chauffe-eau')
    expect(wrapper.text()).toContain('Opportunité first-mover')
    expect(wrapper.text()).toContain('LATENTE')
  })
})

describe('ValidationSummary', () => {
  const distribution: Record<PainVerdictCategory, number> = {
    brulante: 1, confirmee: 2, emergente: 1, latente: 0, froide: 1, incertaine: 0,
  }

  it('displays verdict distribution with counts', () => {
    const wrapper = mount(ValidationSummary, {
      props: {
        distribution,
        averageConfidence: 0.72,
        sourcesRatio: '3/4',
      },
    })
    // Check all verdict categories are rendered
    expect(wrapper.findAll('.summary-item').length).toBe(6)
    expect(wrapper.text()).toContain('3/4')
  })

  it('shows LatentAlert when latent keyword provided', () => {
    const wrapper = mount(ValidationSummary, {
      props: {
        distribution,
        averageConfidence: 0.72,
        sourcesRatio: '3/4',
        latentKeyword: 'test kw',
        latentExplanation: 'First mover',
      },
    })
    expect(wrapper.findComponent(LatentAlert).exists()).toBe(true)
  })

  it('does not show LatentAlert when no latent keyword', () => {
    const wrapper = mount(ValidationSummary, {
      props: {
        distribution,
        averageConfidence: 0.72,
        sourcesRatio: '3/4',
      },
    })
    expect(wrapper.findComponent(LatentAlert).exists()).toBe(false)
  })
})

describe('ValidationRow', () => {
  function makeVerdict(overrides: Partial<MultiSourceVerdict> = {}): MultiSourceVerdict {
    return {
      category: 'confirmee',
      confidence: 0.72,
      consensusAgreement: 0.80,
      sourcesAvailable: 3,
      sourcesTotal: 3,
      perSourceBreakdown: {},
      ...overrides,
    }
  }

  it('renders 7 columns correctly', () => {
    const wrapper = mount(ValidationRow, {
      props: {
        keyword: { keyword: 'test kw', reasoning: 'test reason' },
        verdict: makeVerdict(),
        sourceStates: { autocomplete: 'ok', dataforseo: 'ok', discussions: 'ok', nlp: 'disabled' },
        selected: false,
        volume: 500,
        discCount: 8,
      },
    })
    const cells = wrapper.findAll('td')
    expect(cells.length).toBe(7)
    expect(wrapper.text()).toContain('test kw')
    expect(wrapper.text()).toContain('test reason')
  })

  it('shows skeleton when verdict is null', () => {
    const wrapper = mount(ValidationRow, {
      props: {
        keyword: { keyword: 'test kw', reasoning: 'reason' },
        verdict: null,
        sourceStates: { autocomplete: 'loading', dataforseo: 'loading', discussions: 'loading', nlp: 'disabled' },
        selected: false,
        volume: null,
        discCount: null,
      },
    })
    expect(wrapper.findAll('.skeleton').length).toBeGreaterThan(0)
  })

  it('shows provisional badge when < 3 sources', () => {
    const wrapper = mount(ValidationRow, {
      props: {
        keyword: { keyword: 'test', reasoning: '' },
        verdict: makeVerdict({ sourcesAvailable: 2 }),
        sourceStates: { autocomplete: 'ok', dataforseo: 'ok', discussions: 'error', nlp: 'disabled' },
        selected: false,
        volume: 100,
        discCount: 0,
      },
    })
    const badge = wrapper.findComponent(VerdictBadge)
    expect(badge.props('provisional')).toBe(true)
  })

  it('shows full badge when >= 3 sources', () => {
    const wrapper = mount(ValidationRow, {
      props: {
        keyword: { keyword: 'test', reasoning: '' },
        verdict: makeVerdict({ sourcesAvailable: 3 }),
        sourceStates: { autocomplete: 'ok', dataforseo: 'ok', discussions: 'ok', nlp: 'disabled' },
        selected: false,
        volume: 500,
        discCount: 5,
      },
    })
    const badge = wrapper.findComponent(VerdictBadge)
    expect(badge.props('provisional')).toBe(false)
  })

  it('applies selected class', () => {
    const wrapper = mount(ValidationRow, {
      props: {
        keyword: { keyword: 'test', reasoning: '' },
        verdict: makeVerdict(),
        sourceStates: { autocomplete: 'ok', dataforseo: 'ok', discussions: 'ok', nlp: 'disabled' },
        selected: true,
        volume: 100,
        discCount: 3,
      },
    })
    expect(wrapper.find('.validation-row--selected').exists()).toBe(true)
  })

  it('emits toggle-detail on row click', async () => {
    const wrapper = mount(ValidationRow, {
      props: {
        keyword: { keyword: 'test', reasoning: '' },
        verdict: makeVerdict(),
        sourceStates: { autocomplete: 'ok', dataforseo: 'ok', discussions: 'ok', nlp: 'disabled' },
        selected: false,
        volume: 100,
        discCount: 3,
      },
    })
    await wrapper.find('.validation-row').trigger('click')
    expect(wrapper.emitted('toggle-detail')).toBeTruthy()
  })
})

// ===========================================
// Story 25.5 — Level 2-3 Components
// ===========================================

describe('SourceBlock', () => {
  it('renders source name and summary', () => {
    const wrapper = mount(SourceBlock, {
      props: {
        sourceName: 'DataForSEO',
        sourceState: 'ok',
        score: 0.75,
        summary: 'Vol: 500 CPC: 4€',
      },
    })
    expect(wrapper.text()).toContain('DataForSEO')
    expect(wrapper.text()).toContain('Vol: 500 CPC: 4€')
    expect(wrapper.find('.source-state--ok').exists()).toBe(true)
  })

  it('shows error message and retry button when in error state', () => {
    const wrapper = mount(SourceBlock, {
      props: {
        sourceName: 'Discussions',
        sourceState: 'error',
        score: 0,
        summary: 'Non disponible',
        errorMessage: 'API timeout',
      },
    })
    expect(wrapper.find('.source-state--error').exists()).toBe(true)
    expect(wrapper.text()).toContain('API timeout')
    expect(wrapper.find('.source-retry-btn').exists()).toBe(true)
  })

  it('emits retry when retry button clicked', async () => {
    const wrapper = mount(SourceBlock, {
      props: {
        sourceName: 'Discussions',
        sourceState: 'error',
        score: 0,
        summary: 'Non disponible',
      },
    })
    await wrapper.find('.source-retry-btn').trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })

  it('toggles content when expandable and clicked', async () => {
    const wrapper = mount(SourceBlock, {
      props: {
        sourceName: 'Autocomplete',
        sourceState: 'ok',
        score: 0.6,
        summary: '5 suggestions',
        expandable: true,
      },
      slots: {
        default: '<div class="test-slot">Slot content</div>',
      },
    })
    // Initially not expanded
    expect(wrapper.find('.source-block-content').exists()).toBe(false)
    // Click to expand
    await wrapper.find('.source-block-header').trigger('click')
    expect(wrapper.find('.source-block-content').exists()).toBe(true)
  })
})

describe('DiscussionList', () => {
  const discussions = [
    { title: 'Disc 1', domain: 'reddit.com', url: 'https://reddit.com/1', timestamp: new Date().toISOString(), votesCount: 30 },
    { title: 'Disc 2', domain: 'quora.com', url: 'https://quora.com/1', timestamp: new Date().toISOString(), votesCount: 20 },
    { title: 'Disc 3', domain: 'forum.com', url: 'https://forum.com/1', timestamp: new Date().toISOString(), votesCount: 10 },
    { title: 'Disc 4', domain: 'other.com', url: 'https://other.com/1', timestamp: new Date().toISOString(), votesCount: 5 },
    { title: 'Disc 5', domain: 'last.com', url: 'https://last.com/1', timestamp: new Date().toISOString(), votesCount: 1 },
  ]

  it('shows max 3 discussions by default', () => {
    const wrapper = mount(DiscussionList, { props: { discussions } })
    const cards = wrapper.findAll('.discussion-card')
    expect(cards.length).toBe(3)
  })

  it('shows "Voir N autres" link', () => {
    const wrapper = mount(DiscussionList, { props: { discussions } })
    expect(wrapper.find('.disc-show-more').text()).toContain('2 autres')
  })

  it('shows all discussions after clicking "Voir N autres"', async () => {
    const wrapper = mount(DiscussionList, { props: { discussions } })
    await wrapper.find('.disc-show-more').trigger('click')
    const cards = wrapper.findAll('.discussion-card')
    expect(cards.length).toBe(5)
  })
})

describe('AutocompleteChips', () => {
  it('renders chips for each suggestion', () => {
    const wrapper = mount(AutocompleteChips, {
      props: { suggestions: ['plombier toulouse', 'plombier pas cher', 'urgence plombier'] },
    })
    const chips = wrapper.findAll('.chip')
    expect(chips.length).toBe(3)
    expect(chips[0].text()).toBe('plombier toulouse')
  })
})

describe('RowDetail', () => {
  function makeResult() {
    return {
      keyword: 'test kw',
      dataforseo: { searchVolume: 500, difficulty: 30, cpc: 5.0, competition: 0.7, relatedCount: 10 },
      community: {
        discussionsCount: 8,
        uniqueDomains: ['reddit.com', 'quora.com'],
        domainDiversity: 2,
        avgVotesCount: 15,
        freshness: 'recent' as const,
        serpPosition: 4,
        topDiscussions: [
          { title: 'Disc 1', domain: 'reddit.com', url: 'https://reddit.com/1', timestamp: new Date().toISOString(), votesCount: 20 },
        ],
      },
      autocomplete: {
        suggestionsCount: 5,
        suggestions: ['a', 'b', 'c', 'd', 'e'],
        hasKeyword: true,
        position: 1,
      },
      verdict: { category: 'confirmee' as const, confidence: 0.72, sourcesAvailable: 3 },
    }
  }

  function makeVerdict() {
    return {
      category: 'confirmee' as const,
      confidence: 0.72,
      consensusAgreement: 0.80,
      sourcesAvailable: 3,
      sourcesTotal: 3,
      perSourceBreakdown: {},
    }
  }

  it('renders 4 source blocks', () => {
    const wrapper = mount(RowDetail, {
      props: {
        result: makeResult(),
        verdict: makeVerdict(),
        explanation: null,
      },
    })
    const blocks = wrapper.findAllComponents(SourceBlock)
    expect(blocks.length).toBe(4)
  })

  it('shows confidence explanation when provided', () => {
    const wrapper = mount(RowDetail, {
      props: {
        result: makeResult(),
        verdict: makeVerdict(),
        explanation: 'NLP désactivé · Confiance réduite',
      },
    })
    expect(wrapper.find('.confidence-explanation').exists()).toBe(true)
    expect(wrapper.text()).toContain('NLP désactivé')
  })

  it('does not show explanation when null', () => {
    const wrapper = mount(RowDetail, {
      props: {
        result: makeResult(),
        verdict: makeVerdict(),
        explanation: null,
      },
    })
    expect(wrapper.find('.confidence-explanation').exists()).toBe(false)
  })

  it('shows reduced confidence warning when sources < total', () => {
    const wrapper = mount(RowDetail, {
      props: {
        result: { ...makeResult(), community: null },
        verdict: { ...makeVerdict(), sourcesAvailable: 2, sourcesTotal: 3 },
        explanation: null,
      },
    })
    expect(wrapper.find('.reduced-confidence').exists()).toBe(true)
    expect(wrapper.text()).toContain('2/3')
  })

  it('clicking Discussions block opens DiscussionList', async () => {
    const wrapper = mount(RowDetail, {
      props: {
        result: makeResult(),
        verdict: makeVerdict(),
        explanation: null,
      },
    })
    // Find the Discussions SourceBlock and click it
    const blocks = wrapper.findAllComponents(SourceBlock)
    const discBlock = blocks.find(b => b.props('sourceName') === 'Discussions')
    expect(discBlock).toBeDefined()
    await discBlock!.find('.source-block-header').trigger('click')
    expect(wrapper.findComponent(DiscussionList).exists()).toBe(true)
  })

  it('clicking Autocomplete block opens AutocompleteChips', async () => {
    const wrapper = mount(RowDetail, {
      props: {
        result: makeResult(),
        verdict: makeVerdict(),
        explanation: null,
      },
    })
    const blocks = wrapper.findAllComponents(SourceBlock)
    const autoBlock = blocks.find(b => b.props('sourceName') === 'Autocomplete')
    await autoBlock!.find('.source-block-header').trigger('click')
    expect(wrapper.findComponent(AutocompleteChips).exists()).toBe(true)
  })

  it('Discussions and Autocomplete can be open simultaneously', async () => {
    const wrapper = mount(RowDetail, {
      props: {
        result: makeResult(),
        verdict: makeVerdict(),
        explanation: null,
      },
    })
    const blocks = wrapper.findAllComponents(SourceBlock)
    const discBlock = blocks.find(b => b.props('sourceName') === 'Discussions')
    const autoBlock = blocks.find(b => b.props('sourceName') === 'Autocomplete')
    await discBlock!.find('.source-block-header').trigger('click')
    await autoBlock!.find('.source-block-header').trigger('click')
    expect(wrapper.findComponent(DiscussionList).exists()).toBe(true)
    expect(wrapper.findComponent(AutocompleteChips).exists()).toBe(true)
  })
})
