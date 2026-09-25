/**
 * Vague 3 — Tests architecturaux LieutenantsResultsLayout (sous-composant J.D).
 *
 * Référence FR PRD : FR-LIE-AI-FRONTIER (PRD §8.7), FR-HN-TAB (M7 : la
 * structure H1/H2/H3 a quitté l'onglet Lieutenants pour l'onglet Structure).
 *
 * Ces tests doublent le verrou Sprint C-1 (`lieutenants-selection-architecture.test.ts`)
 * mais à un niveau plus fin : ils s'exécutent sur le sous-composant ISOLÉ,
 * sans monter LieutenantsPanel.
 *
 * Invariant : LieutenantProposals est descendant direct de `.serp-results`
 * (root du sous-composant), JAMAIS du LieutenantsAiPanel. La frontière
 * sémantique données utilisateur ↔ panel IA est garantie par construction du
 * sous-composant. LieutenantH2Structure n'est plus rendu ici (FR-HN-TAB, M7) :
 * il vit dans StructureHnPanel.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LieutenantsResultsLayout from '../../../src/components/moteur/lieutenants/LieutenantsResultsLayout.vue'
import type { ProposedLieutenant } from '../../../shared/types/serp-analysis.types'
import type { SerpAnalysisResult } from '../../../shared/types/index'

function makeSerpResult(): SerpAnalysisResult {
  return {
    keyword: 'seo',
    competitors: [],
    paaQuestions: [{ question: 'Q1 ?', answer: 'A1' }],
    maxScraped: 0,
  } as never as SerpAnalysisResult
}

function makeLt(keyword: string): ProposedLieutenant {
  return { keyword, reasoning: '', sources: [], suggestedHnLevel: 2, score: 50 } as never
}

const stubs = {
  LieutenantProposals: {
    name: 'LieutenantProposals',
    template: '<div data-testid="lieutenants-container" class="lieutenants-container"></div>',
    props: ['iaIsStreaming', 'iaChunks', 'iaError', 'lieutenantCards', 'eliminatedCards', 'totalGenerated', 'selectedCards', 'isLocked', 'contentGapInsights', 'articleLevel'],
    emits: ['toggle', 'retry'],
  },
  // Stubbé pour détecter une réintroduction : il ne doit plus être rendu ici.
  LieutenantH2Structure: {
    name: 'LieutenantH2Structure',
    template: '<div data-testid="lieutenant-h2-structure"></div>',
  },
  LieutenantsAiPanel: {
    name: 'LieutenantsAiPanel',
    template: '<div data-testid="ai-panel-suggestion"></div>',
    props: ['iaIsStreaming', 'iaChunks', 'iaError', 'isLocked', 'contentGapInsights', 'totalGenerated'],
    emits: ['retry'],
  },
  CollapsableSection: { template: '<div><slot /></div>' },
}

const baseProps = {
  serpResult: makeSerpResult(),
  isLocked: false,
  lieutenantCards: [makeLt('lt-1')],
  iaIsStreaming: false,
  iaChunks: '',
  iaError: null,
  eliminatedCards: [],
  totalGenerated: 1,
  selectedCards: new Map(),
  contentGapInsights: '',
  articleLevel: 'intermediaire' as const,
  wordGroups: [],
}

function isDescendantOf(wrapper: ReturnType<typeof mount>, ancestorSelector: string, descendantSelector: string): boolean {
  const ancestor = wrapper.find(ancestorSelector)
  if (!ancestor.exists()) return false
  return ancestor.find(descendantSelector).exists()
}

describe('LieutenantsResultsLayout — architecture FR-LIE-AI-FRONTIER (Vague 3 J.D)', () => {
  it('AC.J.17 — LieutenantProposals est descendant direct de .serp-results, PAS de LieutenantsAiPanel', () => {
    const wrapper = mount(LieutenantsResultsLayout, {
      props: baseProps,
      global: { stubs },
    })

    expect(isDescendantOf(wrapper, '.serp-results', '[data-testid="lieutenants-container"]'))
      .toBe(true)
    expect(isDescendantOf(wrapper, '[data-testid="ai-panel-suggestion"]', '[data-testid="lieutenants-container"]'))
      .toBe(false)
  })

  it('AC.J.18 (FR-HN-TAB, M7) — LieutenantH2Structure n\'est plus rendu dans le layout Lieutenants', () => {
    const wrapper = mount(LieutenantsResultsLayout, {
      props: baseProps,
      global: { stubs },
    })

    // Le layout est bien visible (propositions rendues)…
    expect(wrapper.find('.serp-results').exists()).toBe(true)
    expect(wrapper.find('[data-testid="lieutenants-container"]').exists()).toBe(true)
    // … mais la structure Hn n'y figure plus : elle a son onglet (StructureHnPanel).
    expect(wrapper.findComponent({ name: 'LieutenantH2Structure' }).exists()).toBe(false)
    expect(wrapper.find('[data-testid="lieutenant-h2-structure"]').exists()).toBe(false)
  })

  it('AC.J.19 — LieutenantsAiPanel est rendu en bas du layout (présent mais isolé)', () => {
    const wrapper = mount(LieutenantsResultsLayout, {
      props: baseProps,
      global: { stubs },
    })

    expect(wrapper.find('[data-testid="ai-panel-suggestion"]').exists()).toBe(true)
  })

  it('AC.J.20 — Le bloc complet est masqué si serpResult/isLocked/lieutenantCards sont tous vides', () => {
    const wrapper = mount(LieutenantsResultsLayout, {
      props: { ...baseProps, serpResult: null, isLocked: false, lieutenantCards: [] },
      global: { stubs },
    })

    expect(wrapper.find('.serp-results').exists()).toBe(false)
  })

  it.skip('AC.J.21 — lieutenant-lock est rendu quand bloc visible (Sprint 17 — bouton batch supprimé : checkbox = lock immédiat)', () => {
    const wrapper = mount(LieutenantsResultsLayout, {
      props: baseProps,
      global: { stubs },
    })

    expect(wrapper.find('[data-testid="lieutenant-lock"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="lock-btn"]').exists()).toBe(true)
  })
})
