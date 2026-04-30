/**
 * Tests anti-régression pour CaptainInteractiveWords — wrapper interactif
 * autour de RadarCardLockable côté Capitaine.
 *
 * Composant qui :
 *   1. dérive isLocked à partir de entry.card.keyword === lockedKeyword
 *   2. compose interactiveWordsProps quand racines disponibles
 *   3. relaie update:locked → lock/unlock
 *   4. relaie word-toggle au parent
 *   5. interface avec keyword-modifiers store (tags local/persona)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CaptainInteractiveWords from '../../../src/components/moteur/CaptainInteractiveWords.vue'
import type { CarouselEntry } from '../../../src/composables/keyword/useRadarCarousel'

const RadarCardLockableStub = {
  name: 'RadarCardLockable',
  props: ['card', 'locked', 'interactiveWords', 'validating', 'displayMode', 'articleLevel', 'modifiers'],
  emits: ['update:locked', 'word-toggle', 'modifier-untag', 'modifier-cycle'],
  template: `
    <div class="stub-lockable"
      :data-locked="locked"
      :data-validating="validating"
      :data-has-iw="interactiveWords ? '1' : '0'"
      :data-display-mode="displayMode"
    >
      <button class="stub-toggle" @click="$emit('update:locked', !locked)">toggle</button>
      <button class="stub-word-toggle" @click="$emit('word-toggle', [0,1])">word</button>
      <button class="stub-untag" @click="$emit('modifier-untag', 2)">untag</button>
      <button class="stub-cycle" @click="$emit('modifier-cycle', { index: 1, next: 'local' })">cycle</button>
    </div>
  `,
}

function makeEntry(over: Partial<CarouselEntry> = {}): CarouselEntry {
  const card = {
    keyword: 'agence seo paris',
    reasoning: '',
    paaItems: [],
    combinedScore: 70,
    scoreBreakdown: {
      paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0,
      intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: 70,
    },
    cachedPaa: false,
    kpis: {
      searchVolume: 0, difficulty: 0, cpc: 0, competition: 0,
      intentTypes: [], intentProbability: null,
      autocompleteMatchCount: 0, paaMatchCount: 0,
      paaWeightedScore: 0, paaTotal: 0, avgSemanticScore: null,
    },
  }
  return {
    card,
    originalCard: card,
    validation: null,
    isLoading: false,
    error: null,
    rootVariants: new Map(),
    isLoadingRoots: false,
    activeWordIndices: [0, 1, 2],
    failedRoots: [],
    pendingVariants: new Set(),
    ...over,
  }
}

describe('CaptainInteractiveWords', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('REGRESSION GUARD : displayMode hardcodé à "relevance" (mode Capitaine)', () => {
    const wrapper = mount(CaptainInteractiveWords, {
      props: { entry: makeEntry(), lockedKeyword: null },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-display-mode')).toBe('relevance')
  })

  it('isLocked=true quand keyword === lockedKeyword', () => {
    const wrapper = mount(CaptainInteractiveWords, {
      props: {
        entry: makeEntry(),
        lockedKeyword: 'agence seo paris',
      },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-locked')).toBe('true')
  })

  it('isLocked=false quand lockedKeyword différent', () => {
    const wrapper = mount(CaptainInteractiveWords, {
      props: {
        entry: makeEntry(),
        lockedKeyword: 'autre keyword',
      },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-locked')).toBe('false')
  })

  it('interactiveWords absent quand pas de racines + pas en chargement', () => {
    const wrapper = mount(CaptainInteractiveWords, {
      props: { entry: makeEntry(), lockedKeyword: null },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-has-iw')).toBe('0')
  })

  it('interactiveWords présent quand des racines existent', () => {
    const variants = new Map()
    variants.set('agence seo', {} as never)
    const wrapper = mount(CaptainInteractiveWords, {
      props: {
        entry: makeEntry({ rootVariants: variants }),
        lockedKeyword: null,
      },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-has-iw')).toBe('1')
  })

  it('interactiveWords présent quand isLoadingRoots=true', () => {
    const wrapper = mount(CaptainInteractiveWords, {
      props: {
        entry: makeEntry({ isLoadingRoots: true }),
        lockedKeyword: null,
      },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-has-iw')).toBe('1')
  })

  it('validating=true quand pendingVariants non vide', () => {
    const pending = new Set(['variant1'])
    const wrapper = mount(CaptainInteractiveWords, {
      props: {
        entry: makeEntry({ pendingVariants: pending }),
        lockedKeyword: null,
      },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-validating')).toBe('true')
  })

  it('update:locked=true → emit lock', async () => {
    const wrapper = mount(CaptainInteractiveWords, {
      props: { entry: makeEntry(), lockedKeyword: null },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    await wrapper.find('.stub-toggle').trigger('click') // false → true
    expect(wrapper.emitted('lock')).toBeTruthy()
    expect(wrapper.emitted('unlock')).toBeFalsy()
  })

  it('update:locked=false → emit unlock', async () => {
    const wrapper = mount(CaptainInteractiveWords, {
      props: { entry: makeEntry(), lockedKeyword: 'agence seo paris' },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    await wrapper.find('.stub-toggle').trigger('click') // true → false
    expect(wrapper.emitted('unlock')).toBeTruthy()
    expect(wrapper.emitted('lock')).toBeFalsy()
  })

  it('word-toggle relayé au parent avec les indices', async () => {
    const wrapper = mount(CaptainInteractiveWords, {
      props: { entry: makeEntry(), lockedKeyword: null },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    await wrapper.find('.stub-word-toggle').trigger('click')
    expect(wrapper.emitted('word-toggle')).toBeTruthy()
    expect(wrapper.emitted('word-toggle')![0]).toEqual([[0, 1]])
  })
})
