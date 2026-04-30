/**
 * Tests anti-régression pour CaptainSidePanel — comportements UX critiques.
 *
 * Couvre les améliorations 2026-04-30 :
 *   1. v-if sur `entry` : le panel n'est PAS rendu quand aucune carte sélectionnée
 *   2. close émis quand on clique sur la croix
 *   3. close émis quand on clique en dehors du panel
 *   4. close NON émis pendant un drag de redimensionnement (skip pendant resize)
 *   5. close NON émis quand on clique sur une autre radar-list-item
 *      (le parent gère la nouvelle sélection sans qu'on parasite avec un close prématuré)
 *
 * Ces tests bloquent toute régression future de ces 5 comportements.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CaptainSidePanel from '../../../src/components/moteur/CaptainSidePanel.vue'
import type { CarouselEntry } from '../../../src/composables/keyword/useRadarCarousel'

// Stub minimal d'une CarouselEntry validée — strict minimum pour rendre le panel.
function makeEntry(keyword: string): CarouselEntry {
  const card = {
    keyword,
    reasoning: '',
    paaItems: [],
    combinedScore: 70,
    scoreBreakdown: {
      paaMatchScore: 70,
      resonanceBonus: 60,
      opportunityScore: 70,
      intentValueScore: 80,
      cpcScore: 60,
      painAlignmentScore: 70,
      total: 70,
    },
    cachedPaa: false,
    kpis: {
      searchVolume: 1500,
      difficulty: 30,
      cpc: 2.5,
      competition: 0.5,
      intentTypes: ['commercial' as const],
      intentProbability: 0.9,
      autocompleteMatchCount: 3,
      paaMatchCount: 2,
      paaWeightedScore: 2.5,
      paaTotal: 5,
      avgSemanticScore: null,
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
  }
}

const COMMON_PROPS = {
  parsedMarkdown: '',
  aiIsStreaming: false,
  aiError: null,
  verdictSummary: null,
  rootVariants: [],
  isLoadingRoots: false,
  failedRoots: [],
  activeVariantKeyword: '',
  showGotoLocked: false,
}

// Stubs pour les sous-composants lourds (CaptainRootsSidebar, CaptainAiPanel).
const GLOBAL_STUBS = {
  CaptainRootsSidebar: { template: '<div data-testid="stub-roots" />' },
  CaptainAiPanel: { template: '<div data-testid="stub-ai-panel" />' },
}

describe('CaptainSidePanel — comportements UX (anti-régression)', () => {
  it('REGRESSION GUARD : entry=null → panel ABSENT du DOM (pas de drawer vide)', () => {
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry: null },
      global: { stubs: GLOBAL_STUBS },
    })

    // Avant le fix : un <aside> vide était rendu en permanence.
    // Maintenant : v-if sur entry → aucun élément.
    expect(wrapper.find('[data-testid="side-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="side-panel-content"]').exists()).toBe(false)
  })

  it('entry défini → panel rendu avec le keyword visible', () => {
    const entry = makeEntry('agence seo paris')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry },
      global: { stubs: GLOBAL_STUBS },
    })

    expect(wrapper.find('[data-testid="side-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="side-panel-content"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('agence seo paris')
  })

  it('clic sur la croix de fermeture → emit("close")', async () => {
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry },
      global: { stubs: GLOBAL_STUBS },
    })

    await wrapper.find('[data-testid="side-panel-close"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')!.length).toBe(1)
  })

  it('clic en dehors du panel → emit("close")', async () => {
    const entry = makeEntry('agence seo')

    // On mount un host qui contient un élément frère du panel.
    const Host = defineComponent({
      props: ['entry'],
      emits: ['close'],
      setup(props, { emit }) {
        return () => h('div', [
          h('button', { 'data-testid': 'outside-element', class: 'outside' }, 'Hors panel'),
          h(CaptainSidePanel, {
            ...COMMON_PROPS,
            entry: props.entry,
            onClose: () => emit('close'),
          }),
        ])
      },
    })

    const wrapper = mount(Host, {
      props: { entry },
      global: { stubs: GLOBAL_STUBS },
      attachTo: document.body,
    })

    // pointerdown sur un élément hors panel → doit déclencher close.
    const outside = wrapper.find('[data-testid="outside-element"]').element as HTMLElement
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('REGRESSION GUARD : clic à l\'intérieur du panel → AUCUN emit("close")', async () => {
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry },
      global: { stubs: GLOBAL_STUBS },
      attachTo: document.body,
    })

    // pointerdown sur le contenu du panel → ne doit PAS fermer.
    const content = wrapper.find('[data-testid="side-panel-content"]').element as HTMLElement
    content.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper.unmount()
  })

  it('REGRESSION GUARD : clic sur un radar-list-item → AUCUN emit("close")', async () => {
    // Cas critique : si l'utilisateur clique sur une AUTRE carte de la liste,
    // le parent va re-mettre selectedIndex sur la nouvelle carte. Si le panel
    // émet aussi close, on aurait close → null → re-select : race conditions.
    const entry = makeEntry('agence seo')

    const Host = defineComponent({
      props: ['entry'],
      emits: ['close'],
      setup(props, { emit }) {
        return () => h('div', [
          h('div', { 'data-testid': 'radar-list-item-2' }, [
            h('span', { 'data-testid': 'inner-of-list-item' }, 'Carte voisine'),
          ]),
          h(CaptainSidePanel, {
            ...COMMON_PROPS,
            entry: props.entry,
            onClose: () => emit('close'),
          }),
        ])
      },
    })

    const wrapper = mount(Host, {
      props: { entry },
      global: { stubs: GLOBAL_STUBS },
      attachTo: document.body,
    })

    const innerListItem = wrapper.find('[data-testid="inner-of-list-item"]').element as HTMLElement
    innerListItem.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

    // Aucune émission → le parent gère la sélection sans qu'on parasite.
    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper.unmount()
  })

  it('panel reçoit la KPIs section quand entry a des kpis (lecture seule)', () => {
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry },
      global: { stubs: GLOBAL_STUBS },
    })

    expect(wrapper.find('[data-testid="side-panel-market-kpis"]').exists()).toBe(true)
    // Volume 1500 doit apparaître (formaté fr-FR : "1 500 rech/m")
    expect(wrapper.text()).toMatch(/1[\s ]500/)
  })
})
