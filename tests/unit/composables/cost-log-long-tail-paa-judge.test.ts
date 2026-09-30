/**
 * FR-INFRA-COST-LOG-STORE — la génération des longues traînes du Radar et le
 * jugement des questions PAA du Capitaine ajoutent chacun UNE ligne de coût,
 * avec un libellé qui dit l'action.
 *
 * Recette 2026-09-30 : ces deux appels IA n'ajoutaient aucune ligne à la pile
 * « Coûts API » (leur route ne rendait pas l'`usage`). Maintenant qu'elles le
 * rendent, `apiPost` l'inscrit une fois ; l'appelant ne l'ajoute pas lui-même
 * (règle « un appel, une ligne » des lots 1 et 5).
 *
 * Le vrai `apiPost` et le vrai store de la pile tournent ; seul `fetch` est
 * simulé, avec la forme réelle des réponses des deux routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCostLogStore } from '../../../src/stores/ui/cost-log.store'

vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const USAGE = { model: 'claude-haiku-4-5-20251001', inputTokens: 900, outputTokens: 300, cacheReadTokens: 0, cacheCreationTokens: 0, estimatedCost: 0.0021 }
const SUGGESTION = { keyword: 'mesurer résultats site lyon', rationale: 'Combine la mesure et la ville visée.', preferenceScore: 8, derivedFromRoots: ['mesurer résultats', 'lyon'] }

let longTailUsage: typeof USAGE | null = USAGE

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve({ data }) }
}

const mockFetch = vi.fn(async (url: string) => {
  if (url.endsWith('/articles/42/radar-exploration/long-tail')) {
    return jsonResponse({ suggestions: [SUGGESTION], fromCache: longTailUsage === null, usage: longTailUsage })
  }
  if (url.endsWith('/articles/42/captain/judge-paa')) {
    return jsonResponse({ judgments: {}, relevanceScores: {}, usage: USAGE })
  }
  throw new Error(`fetch inattendu : ${url}`)
})
vi.stubGlobal('fetch', mockFetch)

const { useLongTailSuggestions } = await import('../../../src/composables/intent/useLongTailSuggestions')
const { useArticleKeywordsStore } = await import('../../../src/stores/article/article-keywords.store')

function apiLines() {
  return useCostLogStore().entries.filter(e => e.level === 'api').map(e => e.label)
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockFetch.mockClear()
  longTailUsage = USAGE
})

describe('FR-INFRA-COST-LOG-STORE — longues traînes et jugement PAA : une ligne de coût chacun', () => {
  const roots = [{ keyword: 'mesurer résultats' }, { keyword: 'lyon' }]

  it('Radar « Générer les longues traînes » : une seule ligne « Longues traînes du Radar »', async () => {
    await useLongTailSuggestions(42).generate(roots, 'Titre', 'Le lecteur ne sait pas')
    expect(apiLines()).toEqual(['Longues traînes du Radar'])
  })

  it('longues traînes servies par le cache : aucune ligne de coût', async () => {
    longTailUsage = null
    await useLongTailSuggestions(42).regenerate(roots, 'Titre', 'Le lecteur ne sait pas')
    expect(apiLines()).toEqual([])
  })

  it('Capitaine, jugement des questions PAA : une seule ligne « Jugement des questions PAA »', async () => {
    await useArticleKeywordsStore().loadCaptainPaaJudgments(42)
    expect(apiLines()).toEqual(['Jugement des questions PAA'])
  })
})
