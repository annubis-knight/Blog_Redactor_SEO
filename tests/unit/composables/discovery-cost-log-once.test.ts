/**
 * FR-INFRA-COST-LOG-STORE — chaque appel IA de Discovery compte UNE ligne dans
 * la pile « Coûts API ».
 *
 * Recette 2026-09-30 (04, point 1) : « Découvrir » ajoutait deux lignes
 * « Génération keywords radar » pour un seul appel, chaque courte-traîne
 * « Courte-traîne IA » ET « Génération keywords radar », et l'analyse IA deux
 * « Analyse discovery » : `apiPost` inscrit déjà le champ `usage` de toute
 * réponse, et le composable l'ajoutait une seconde fois. Le coût et le nombre
 * d'appels affichés étaient gonflés.
 *
 * Le vrai `apiPost` et le vrai store de la pile tournent ; seul `fetch` est simulé.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCostLogStore } from '../../../src/stores/ui/cost-log.store'
import { apiPost } from '../../../src/services/api.service'

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const USAGE = { model: 'mock-provider-v1', inputTokens: 120, outputTokens: 80, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0.0004 }

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve({ data }) }
}

const mockFetch = vi.fn(async (url: string) => {
  if (url.endsWith('/keywords/radar/generate')) {
    // Forme réelle de la route : `_apiUsage` d'origine + alias `usage` pour la pile.
    return jsonResponse({
      articleTitle: 't', articleKeyword: 'k', painPoint: 'p', generatedAt: '2026-09-30T00:00:00.000Z',
      keywords: [{ keyword: 'mesurer résultats avis', reasoning: 'r' }],
      _apiUsage: USAGE, usage: USAGE,
    })
  }
  if (url.endsWith('/keywords/analyze-discovery')) {
    return jsonResponse({ keywords: [], summary: 's', usage: USAGE })
  }
  if (url.endsWith('/keywords/relevance-score')) return jsonResponse({ scores: {}, fallback: false })
  if (url.endsWith('/keywords/suggest-all')) {
    const empty = { items: [], count: 0 }
    return jsonResponse({ alphabet: empty, questions: empty, intents: empty, prepositions: empty, totalUnique: 0 })
  }
  if (url.endsWith('/keywords/discover')) return jsonResponse({ keywords: [] })
  if (url.endsWith('/keywords/word-groups')) return jsonResponse({ groups: [] })
  throw new Error(`fetch inattendu : ${url}`)
})
vi.stubGlobal('fetch', mockFetch)

const { useDiscoveryPanel } = await import('../../../src/composables/keyword/useDiscoveryPanel')

function apiLines(label?: string) {
  return useCostLogStore().entries.filter(e => e.level === 'api' && (!label || e.label === label))
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockFetch.mockClear()
  useDiscoveryPanel().reset()
})

describe('FR-INFRA-COST-LOG-STORE — un appel IA de Discovery, une ligne de coût', () => {
  it('« Courte-traîne IA » : une seule ligne, sous son nom', async () => {
    const panel = useDiscoveryPanel()
    await panel.generateLongTail('mesurer résultats', 'Titre', 'mesurer résultats', 'Le lecteur ne sait pas')
    expect(apiLines().map(e => e.label)).toEqual(['Courte-traîne IA'])
  })

  it('« Découvrir » : la génération IA Claude compte une ligne', async () => {
    const panel = useDiscoveryPanel()
    panel.discover('mesurer résultats', 'Titre', 'mesurer résultats', 'Le lecteur ne sait pas')
    await vi.waitFor(() => expect(panel.isAnyLoading.value).toBe(false))
    expect(apiLines('Génération keywords radar')).toHaveLength(1)
  })

  it('« Analyser les résultats pertinents » : une ligne « Analyse discovery »', async () => {
    const panel = useDiscoveryPanel()
    await panel.analyzeResults()
    expect(apiLines('Analyse discovery')).toHaveLength(1)
  })

  it('apiPost garde le libellé demandé pour le coût d’une réponse', async () => {
    await apiPost('/keywords/radar/generate', {}, { usageLabel: 'Courte-traîne IA' })
    expect(apiLines().map(e => e.label)).toEqual(['Courte-traîne IA'])
  })
})
