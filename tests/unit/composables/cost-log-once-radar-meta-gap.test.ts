/**
 * FR-INFRA-COST-LOG-STORE — un appel IA compte UNE ligne dans la pile « Coûts API ».
 *
 * Recette 2026-09-30 : `apiPost` inscrit déjà le champ `usage` de toute
 * réponse. La génération des mots-clés du Radar, la génération des metas et
 * l'analyse content gap ajoutaient une seconde ligne elles-mêmes (depuis
 * `_apiUsage` ou `usage`) : chaque appel était compté deux fois, et le coût
 * affiché gonflé d'autant. Même défaut que celui corrigé pour Discovery
 * (`discovery-cost-log-once.test.ts`).
 *
 * Le vrai `apiPost` et le vrai store de la pile tournent ; seul `fetch` est simulé.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { useCostLogStore } from '../../../src/stores/ui/cost-log.store'

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const USAGE = { model: 'mock-provider-v1', inputTokens: 120, outputTokens: 80, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0.0004 }

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve({ data }) }
}

const mockFetch = vi.fn(async (url: string) => {
  // Formes réelles des routes : `_apiUsage` d'origine + alias `usage` pour la pile.
  if (url.endsWith('/keywords/radar/generate')) {
    return jsonResponse({
      articleTitle: 't', articleKeyword: 'k', painPoint: 'p', generatedAt: '2026-09-30T00:00:00.000Z',
      keywords: [{ keyword: 'mesurer résultats avis', reasoning: 'r' }],
      _apiUsage: USAGE, usage: USAGE,
    })
  }
  if (url.endsWith('/generate/meta')) return jsonResponse({ metaTitle: 'Titre', metaDescription: 'Description', usage: USAGE })
  if (url.endsWith('/content-gap/analyze')) {
    return jsonResponse({
      keyword: 'k', competitors: [], themes: [], gaps: [], localEntitiesFromCompetitors: [],
      averageWordCount: null, analyzedAt: '2026-09-30T00:00:00.000Z', _apiUsage: USAGE, usage: USAGE,
    })
  }
  throw new Error(`fetch inattendu : ${url}`)
})
vi.stubGlobal('fetch', mockFetch)

const { useKeywordRadar } = await import('../../../src/composables/keyword/useResonanceScore')
const { useEditorStore } = await import('../../../src/stores/article/editor.store')
const ContentGapPanel = (await import('../../../src/components/brief/ContentGapPanel.vue')).default

function apiLines() {
  return useCostLogStore().entries.filter(e => e.level === 'api').map(e => e.label)
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockFetch.mockClear()
})

describe('FR-INFRA-COST-LOG-STORE — un appel IA, une ligne de coût', () => {
  it('Radar « Générer les mots-clés » : une seule ligne', async () => {
    await useKeywordRadar().generate('Titre', 'mesurer résultats', 'Le lecteur ne sait pas')
    expect(apiLines()).toEqual(['Génération keywords radar'])
  })

  it('Rédaction « Générer les metas » : une seule ligne', async () => {
    await useEditorStore().generateMeta(1, 'mesurer résultats', 'Titre', '<p>Texte</p>')
    expect(apiLines()).toEqual(['Génération meta'])
  })

  it('Brief « Analyser les concurrents » (content gap) : une seule ligne', async () => {
    const wrapper = mount(ContentGapPanel, { props: { keyword: 'mesurer résultats', articleId: 1 } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(apiLines()).toEqual(['Analyse content gap'])
  })
})
