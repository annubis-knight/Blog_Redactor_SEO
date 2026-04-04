import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarCardLockable from '../../../src/components/intent/RadarCardLockable.vue'

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

function mountLockable(props: { locked: boolean }) {
  return mount(RadarCardLockable, {
    props: { card: makeCard(), ...props },
    global: { stubs: { RadarKeywordCard: RadarKeywordCardStub } },
  })
}

describe('RadarCardLockable', () => {
  it('renders the RadarKeywordCard with card prop', () => {
    const w = mountLockable({ locked: false })
    expect(w.find('.radar-card-stub').text()).toBe('test keyword')
  })

  it('shows unlock icon when locked=false', () => {
    const w = mountLockable({ locked: false })
    const btn = w.find('[data-testid="radar-card-lock"]')
    // Stroke-based SVG (outline) for unlocked
    expect(btn.find('svg[fill="none"]').exists()).toBe(true)
    expect(btn.find('svg[fill="currentColor"]').exists()).toBe(false)
  })

  it('shows lock icon when locked=true', () => {
    const w = mountLockable({ locked: true })
    const btn = w.find('[data-testid="radar-card-lock"]')
    // Filled SVG for locked
    expect(btn.find('svg[fill="currentColor"]').exists()).toBe(true)
    expect(btn.find('svg[fill="none"]').exists()).toBe(false)
  })

  it('emits update:locked with true when clicking unlocked', async () => {
    const w = mountLockable({ locked: false })
    await w.find('[data-testid="radar-card-lock"]').trigger('click')
    expect(w.emitted('update:locked')).toEqual([[true]])
  })

  it('emits update:locked with false when clicking locked', async () => {
    const w = mountLockable({ locked: true })
    await w.find('[data-testid="radar-card-lock"]').trigger('click')
    expect(w.emitted('update:locked')).toEqual([[false]])
  })

  it('adds .locked class when locked', () => {
    const w = mountLockable({ locked: true })
    expect(w.find('.radar-card-lockable').classes()).toContain('locked')
  })

  it('does not add .locked class when unlocked', () => {
    const w = mountLockable({ locked: false })
    expect(w.find('.radar-card-lockable').classes()).not.toContain('locked')
  })

  it('sets aria-pressed to match locked state', () => {
    const locked = mountLockable({ locked: true })
    expect(locked.find('[data-testid="radar-card-lock"]').attributes('aria-pressed')).toBe('true')

    const unlocked = mountLockable({ locked: false })
    expect(unlocked.find('[data-testid="radar-card-lock"]').attributes('aria-pressed')).toBe('false')
  })

  it('shows correct title based on locked state', () => {
    const locked = mountLockable({ locked: true })
    expect(locked.find('[data-testid="radar-card-lock"]').attributes('title')).toBe('Déverrouiller')

    const unlocked = mountLockable({ locked: false })
    expect(unlocked.find('[data-testid="radar-card-lock"]').attributes('title')).toBe('Verrouiller')
  })

  it('toggle button has .active class when locked', () => {
    const locked = mountLockable({ locked: true })
    expect(locked.find('[data-testid="radar-card-lock"]').classes()).toContain('active')

    const unlocked = mountLockable({ locked: false })
    expect(unlocked.find('[data-testid="radar-card-lock"]').classes()).not.toContain('active')
  })
})
