import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarCardCheckable from '../../../src/components/intent/RadarCardCheckable.vue'

const RadarKeywordCardStub = {
  name: 'RadarKeywordCard',
  template: '<div class="radar-card-stub">{{ card.keyword }}</div>',
  props: ['card'],
}

function makeCard(keyword = 'test keyword') {
  return {
    keyword,
    reasoning: '',
    kpis: { volume: 100, kd: 20, cpc: 1.5, paaMatchCount: 3, paaTotal: 5 },
    paaItems: [],
    combinedScore: 75,
    scoreBreakdown: {
      paaMatches: { score: 80, weight: 0.3 },
      resonance: { score: 70, weight: 0.15 },
      opportunity: { score: 60, weight: 0.25 },
      intent: { score: 90, weight: 0.15 },
      cpc: { score: 50, weight: 0.15 },
    },
    cachedPaa: false,
  }
}

function mountCheckable(props: { checked: boolean; disabled?: boolean }) {
  return mount(RadarCardCheckable, {
    props: { card: makeCard(), ...props },
    global: { stubs: { RadarKeywordCard: RadarKeywordCardStub } },
  })
}

describe('RadarCardCheckable', () => {
  it('renders the RadarKeywordCard with card prop', () => {
    const w = mountCheckable({ checked: false })
    expect(w.find('.radar-card-stub').text()).toBe('test keyword')
  })

  it('shows an unchecked checkbox when checked=false', () => {
    const w = mountCheckable({ checked: false })
    const cb = w.find<HTMLInputElement>('[data-testid="radar-card-checkbox"]')
    expect(cb.exists()).toBe(true)
    expect(cb.element.checked).toBe(false)
  })

  it('shows a checked checkbox when checked=true', () => {
    const w = mountCheckable({ checked: true })
    const cb = w.find<HTMLInputElement>('[data-testid="radar-card-checkbox"]')
    expect(cb.element.checked).toBe(true)
  })

  it('emits update:checked with true when clicking unchecked', async () => {
    const w = mountCheckable({ checked: false })
    await w.find('[data-testid="radar-card-checkbox"]').trigger('change')
    expect(w.emitted('update:checked')).toEqual([[true]])
  })

  it('emits update:checked with false when clicking checked', async () => {
    const w = mountCheckable({ checked: true })
    await w.find('[data-testid="radar-card-checkbox"]').trigger('change')
    expect(w.emitted('update:checked')).toEqual([[false]])
  })

  it('adds .checked class when checked', () => {
    const w = mountCheckable({ checked: true })
    expect(w.find('.radar-card-checkable').classes()).toContain('checked')
  })

  it('does not add .checked class when unchecked', () => {
    const w = mountCheckable({ checked: false })
    expect(w.find('.radar-card-checkable').classes()).not.toContain('checked')
  })

  it('disables checkbox when disabled=true', () => {
    const w = mountCheckable({ checked: false, disabled: true })
    const cb = w.find<HTMLInputElement>('[data-testid="radar-card-checkbox"]')
    expect(cb.element.disabled).toBe(true)
    expect(w.find('.radar-card-checkable').classes()).toContain('disabled')
  })

  it('does not emit when disabled', async () => {
    const w = mountCheckable({ checked: false, disabled: true })
    await w.find('[data-testid="radar-card-checkbox"]').trigger('change')
    expect(w.emitted('update:checked')).toBeUndefined()
  })
})
