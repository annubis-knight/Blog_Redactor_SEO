/**
 * FR-CAP-AI-PANEL — « Régénérer » l'avis expert IA du Capitaine demande
 * confirmation, et le message dit ce qui va vraiment se passer.
 *
 * Recette du 2026-09-30 (CAP-7, EXT-4, EXT-6) : la fenêtre annonçait « Cela
 * consommera un appel Claude. » en mode simulé (badge MOCK, rien de facturé)
 * comme avec un autre fournisseur. Le message suit maintenant le mode effectif
 * et le fournisseur d'IA que le serveur a renvoyés au badge.
 *
 * Le vrai panneau d'IA et son vrai bouton tournent ; seul le store du mode
 * est positionné à la main.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CaptainSidePanel from '../../../src/components/moteur/CaptainSidePanel.vue'
import { useRuntimeModeStore } from '../../../src/stores/ui/runtime-mode.store'
import type { ExploredKeywordEntry } from '../../../src/composables/keyword/useExploredKeywords'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

function makeEntry(keyword: string): ExploredKeywordEntry {
  const card = {
    keyword,
    reasoning: '',
    paaItems: [],
    combinedScore: 70,
    scoreBreakdown: { paaMatchScore: 0, resonanceBonus: 0, opportunityScore: 0, intentValueScore: 0, cpcScore: 0, painAlignmentScore: 0, total: 0 },
    cachedPaa: false,
    kpis: {
      searchVolume: 1500, difficulty: 30, cpc: 2.5, competition: 0.5, intentTypes: [], intentProbability: null,
      autocompleteMatchCount: 3, paaMatchCount: 0, paaWeightedScore: 0, paaTotal: 0, avgSemanticScore: null,
    },
  }
  return {
    card, originalCard: card, validation: null, isLoading: false, error: null,
    rootVariants: new Map(), isLoadingRoots: false, activeWordIndices: [0, 1], failedRoots: [], pendingVariants: new Set(),
  }
}

function mountWithAdvice() {
  return mount(CaptainSidePanel, {
    props: {
      entry: makeEntry('agence web'),
      // Un avis déjà là : le bouton du panneau est « Régénérer ».
      parsedMarkdown: '<p>1. Potentiel éditorial</p>',
      aiIsStreaming: false,
      aiError: null,
      verdictSummary: null,
      rootVariants: [],
      isLoadingRoots: false,
      failedRoots: [],
      activeVariantKeyword: 'agence web',
      showGotoLocked: false,
    },
    global: { stubs: { CaptainRootsSidebar: true, AiAdviceMarkdown: true } },
    attachTo: document.body,
  })
}

async function confirmMessageOnRegenerate(): Promise<string> {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const wrapper = mountWithAdvice()
  await wrapper.find('[data-testid="ai-panel-toggle"]').trigger('click')
  await wrapper.find('[data-testid="ai-trigger-regen"]').trigger('click')
  expect(confirmSpy).toHaveBeenCalledTimes(1)
  const message = confirmSpy.mock.calls[0]![0] as string
  // « Annuler » : rien ne part.
  expect(wrapper.emitted('ai-regenerate')).toBeUndefined()
  wrapper.unmount()
  return message
}

describe('FR-CAP-AI-PANEL — la confirmation de « Régénérer » suit le mode et le fournisseur', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })
  afterEach(() => vi.restoreAllMocks())

  it('mode simulé (badge MOCK) : aucun appel payant annoncé, pas de « Claude »', async () => {
    const mode = useRuntimeModeStore()
    mode.effective = 'mock'
    mode.aiProvider = 'mock'

    const message = await confirmMessageOnRegenerate()

    expect(message).toBe("Régénérer l'avis expert IA ? Mode simulé : la réponse sera simulée, sans appel payant.")
    expect(message).not.toContain('Claude')
  })

  it('réel avec Claude : « Cela consommera un appel Claude. »', async () => {
    const mode = useRuntimeModeStore()
    mode.effective = 'real'
    mode.aiProvider = 'claude'

    expect(await confirmMessageOnRegenerate()).toBe("Régénérer l'avis expert IA ? Cela consommera un appel Claude.")
  })

  it('réel avec un autre fournisseur : il est nommé', async () => {
    const mode = useRuntimeModeStore()
    mode.effective = 'real'
    mode.aiProvider = 'gemini'

    expect(await confirmMessageOnRegenerate()).toBe("Régénérer l'avis expert IA ? Cela consommera un appel Gemini.")
  })
})
