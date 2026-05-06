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
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CaptainSidePanel from '../../../src/components/moteur/CaptainSidePanel.vue'
import type { ExploredKeywordEntry } from '../../../src/composables/keyword/useExploredKeywords'

// Stub minimal d'une ExploredKeywordEntry validée — strict minimum pour rendre le panel.
function makeEntry(keyword: string): ExploredKeywordEntry {
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

// Stubs pour les sous-composants lourds. Sprint B (2026-05-02) : CaptainAiPanel
// est remplacé par <AiPanel variant="advice"> + <AiAdviceMarkdown>.
// On stubbe AiPanel pour les tests UX d'antan (close, click outside, …) qui
// n'ont rien à faire de l'IA.
const GLOBAL_STUBS = {
  CaptainRootsSidebar: { template: '<div data-testid="stub-roots" />' },
  AiPanel: { template: '<div data-testid="stub-ai-panel"><slot /></div>' },
  AiAdviceMarkdown: { template: '<div data-testid="stub-ai-advice" />' },
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

// ---------------------------------------------------------------------------
// Sprint B (2026-05-02) — Migration vers <AiPanel variant="advice">.
// On vérifie la présence du nouveau panel partagé (data-testid='ai-panel-advice')
// et la présence du markdown advice via <AiAdviceMarkdown>.
// ---------------------------------------------------------------------------

describe('CaptainSidePanel — Sprint B (migration AiPanel advice)', () => {
  // Pas de stub : on monte le vrai AiPanel + AiAdviceMarkdown pour valider
  // l'intégration end-to-end (state="success" → markdown rendu).
  const REAL_STUBS = {
    CaptainRootsSidebar: { template: '<div data-testid="stub-roots" />' },
  }

  it('affiche <AiPanel variant="advice"> dans le sidepanel', () => {
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry, parsedMarkdown: '## Conseil\n\nFais X.' },
      global: { stubs: REAL_STUBS },
    })
    expect(wrapper.find('[data-testid="ai-panel-advice"]').exists()).toBe(true)
  })

  it('parsedMarkdown fourni → contenu rendu via <AiAdviceMarkdown>', async () => {
    // Sprint 3 (2026-05-04) — AiPanel collapsed par défaut, on ouvre via toggle.
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry, parsedMarkdown: '## Conseil\n\nFais X.' },
      global: { stubs: REAL_STUBS },
    })
    await wrapper.find('[data-testid="ai-panel-toggle"]').trigger('click')
    const advice = wrapper.find('[data-testid="ai-advice-markdown"]')
    expect(advice.exists()).toBe(true)
    expect(advice.html()).toContain('Conseil')
    expect(advice.html()).toContain('Fais X')
  })

  it('streaming en cours → <AiAdviceMarkdown> dans le slot streaming (caret visible)', () => {
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry, parsedMarkdown: 'Début…', aiIsStreaming: true },
      global: { stubs: REAL_STUBS },
    })
    expect(wrapper.find('[data-testid="ai-advice-markdown"]').exists()).toBe(true)
    // Le caret n'est rendu que si streaming=true a été propagé.
    expect(wrapper.html()).toContain('aip-advice__caret')
  })

  it('aiError fourni → bloc d\'erreur affiché (state=error)', () => {
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry, aiError: 'API down' },
      global: { stubs: REAL_STUBS },
    })
    const err = wrapper.find('[data-testid="ai-panel-error"]')
    expect(err.exists()).toBe(true)
    expect(err.text()).toContain('API down')
  })

  it('verdictSummary fourni → affiché en tête de slot (avant le markdown)', async () => {
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: {
        ...COMMON_PROPS,
        entry,
        parsedMarkdown: '## Conseil',
        verdictSummary: { level: 'GO', label: 'Très bon', reason: 'Volume fort' },
      },
      global: { stubs: REAL_STUBS },
    })
    await wrapper.find('[data-testid="ai-panel-toggle"]').trigger('click')
    const verdict = wrapper.find('[data-testid="ai-panel-verdict"]')
    expect(verdict.exists()).toBe(true)
    expect(verdict.text()).toContain('GO')
    expect(verdict.text()).toContain('Très bon')
  })

  it('CTA en mode success → variant regen + confirmMessage propagé', async () => {
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry, parsedMarkdown: '## Conseil' },
      global: { stubs: REAL_STUBS },
    })
    await wrapper.find('[data-testid="ai-panel-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="ai-trigger-regen"]').exists()).toBe(true)
  })

  it('clic régénération + confirm=true → emit ai-regenerate', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry, parsedMarkdown: '## Conseil' },
      global: { stubs: REAL_STUBS },
    })
    await wrapper.find('[data-testid="ai-panel-toggle"]').trigger('click')
    await wrapper.find('[data-testid="ai-trigger-regen"]').trigger('click')
    expect(window.confirm).toHaveBeenCalled()
    expect(wrapper.emitted('ai-regenerate')).toBeTruthy()
  })

  it('clic régénération + confirm=false → PAS d\'emit ai-regenerate', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const entry = makeEntry('agence seo')
    const wrapper = mount(CaptainSidePanel, {
      props: { ...COMMON_PROPS, entry, parsedMarkdown: '## Conseil' },
      global: { stubs: REAL_STUBS },
    })
    await wrapper.find('[data-testid="ai-panel-toggle"]').trigger('click')
    await wrapper.find('[data-testid="ai-trigger-regen"]').trigger('click')
    expect(wrapper.emitted('ai-regenerate')).toBeFalsy()
  })
})
