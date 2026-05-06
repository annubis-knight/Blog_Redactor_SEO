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
import type { ExploredKeywordEntry } from '../../../src/composables/keyword/useExploredKeywords'

const RadarCardLockableStub = {
  name: 'RadarCardLockable',
  props: ['card', 'locked', 'interactiveWords', 'validating', 'displayMode', 'articleLevel', 'modifiers'],
  emits: ['update:locked', 'word-toggle', 'modifier-untag', 'modifier-cycle'],
  template: `
    <div class="stub-lockable"
      :data-locked="locked"
      :data-validating="validating"
      :data-has-iw="interactiveWords ? '1' : '0'"
      :data-locked-left-words="interactiveWords?.lockedLeftWords ?? '0'"
      :data-display-mode="displayMode"
    >
      <button class="stub-toggle" @click="$emit('update:locked', !locked)">toggle</button>
      <button class="stub-word-toggle" @click="$emit('word-toggle', [0,1])">word</button>
      <button class="stub-untag" @click="$emit('modifier-untag', 2)">untag</button>
      <button class="stub-cycle" @click="$emit('modifier-cycle', { index: 1, next: 'local' })">cycle</button>
    </div>
  `,
}

function makeEntry(over: Partial<ExploredKeywordEntry> = {}): ExploredKeywordEntry {
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

  // 2026-05-01 — Refonte des règles d'activation :
  // Avant : interactiveWords présent UNIQUEMENT si racines pré-validées ou en chargement.
  // Après : interactiveWords présent dès que keyword ≥ 3 mots (cohérence visuelle)
  //         + 2 premiers mots significatifs sanctuarisés via lockedLeftWords=2.

  it('REGRESSION GUARD : keyword ≥ 3 mots → interactiveWords TOUJOURS présent (même sans racines pré-validées)', () => {
    // Entry sans rootVariants ni isLoadingRoots — avant le fix : aucun mot cliquable.
    // Après le fix : mots cliquables fournis avec lockedLeftWords=2.
    const wrapper = mount(CaptainInteractiveWords, {
      props: { entry: makeEntry(), lockedKeyword: null },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-has-iw')).toBe('1')
  })

  it('keyword < 3 mots → interactiveWords absent (pas de racines à explorer)', () => {
    const shortKeywordCard = {
      ...makeEntry().card,
      keyword: 'agence seo', // 2 mots
    }
    const wrapper = mount(CaptainInteractiveWords, {
      props: {
        entry: makeEntry({
          card: shortKeywordCard as never,
          originalCard: shortKeywordCard as never,
        }),
        lockedKeyword: null,
      },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-has-iw')).toBe('0')
  })

  it('keyword 1 mot → interactiveWords absent', () => {
    const oneWordCard = {
      ...makeEntry().card,
      keyword: 'seo',
    }
    const wrapper = mount(CaptainInteractiveWords, {
      props: {
        entry: makeEntry({
          card: oneWordCard as never,
          originalCard: oneWordCard as never,
        }),
        lockedKeyword: null,
      },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-has-iw')).toBe('0')
  })

  it('keyword 3+ mots avec racines en chargement → interactiveWords toujours présent', () => {
    const wrapper = mount(CaptainInteractiveWords, {
      props: {
        entry: makeEntry({ isLoadingRoots: true }),
        lockedKeyword: null,
      },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-has-iw')).toBe('1')
  })

  it('REGRESSION GUARD : lockedLeftWords=2 transmis aux mots interactifs (sanctuarise les 2 premiers significatifs)', () => {
    // Ancrage de la racine du capitaine. Si quelqu'un retire la valeur 2,
    // les utilisateurs pourront désactiver les mots porteurs de la racine.
    const wrapper = mount(CaptainInteractiveWords, {
      props: { entry: makeEntry(), lockedKeyword: null },
      global: { stubs: { RadarCardLockable: RadarCardLockableStub } },
    })
    expect(wrapper.find('.stub-lockable').attributes('data-locked-left-words')).toBe('2')
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
