/**
 * FR-CAP-ROOTS — à la réouverture, une racine sans étude enregistrée pour
 * l'article revient avec les mesures que la base connaît déjà, gratuitement.
 *
 * Recette du 2026-09-30 (CAP-15) : `getArticleKeywords` renvoyait chaque racine
 * avec `kpis: []`. Une racine étudiée a sa propre ligne d'exploration (le lot 2
 * la relit) ; une racine jamais étudiée pour cet article revenait « — », sans
 * Score Pertinence ni « Moyenne », verdict GRAY — alors que `keyword_metrics`
 * (mesures communes à tous les articles) la connaissait souvent, et que le
 * calcul de pertinence de la relecture la notait déjà, pour rien.
 *
 * Aucun appel externe : seules la base et les lectures de mesures sont simulées.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
vi.mock('../../../server/db/client', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
  query: (...args: unknown[]) => mockQuery(...args),
}))

vi.mock('../../../server/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../../server/services/queries/article-pain-point.service', () => ({
  getArticlePainPoint: async () => 'Mes clients artisans ne trouvent pas de site internet à Toulouse',
  PAIN_POINT_FALLBACK: '(non défini)',
}))

vi.mock('../../../server/services/queries/article-pain-intent.service', () => ({
  getArticlePainIntent: async () => null,
}))

// Mesures communes (`keyword_metrics`) : seule la racine « création site » est connue.
const KNOWN_METRICS: Record<string, unknown> = {
  'création site': {
    keyword: 'création site', lang: 'fr', country: 'fr',
    searchVolume: 673000, keywordDifficulty: 54, cpc: 4.63, competition: 0.4, intentRaw: 0.8,
    intentLabel: 'commercial',
    autocompleteSuggestions: [{ text: 'création site', position: 1 }, { text: 'création site internet toulouse', position: 2 }],
    autocompleteSource: 'google',
    paaQuestions: [
      { question: 'Quel est le prix d’une création de site internet ?', answer: 'Entre 500 et 5000 euros.' },
      { question: 'Comment créer un site pour un artisan à Toulouse ?', answer: null },
    ],
    localAnalysis: null, contentGapAnalysis: null, localComparison: null,
    fetchedAt: '2026-09-30T10:00:00.000Z',
  },
}
vi.mock('../../../server/services/keyword/keyword-metrics.service', () => ({
  getKeywordMetrics: async (keyword: string) => KNOWN_METRICS[keyword] ?? null,
}))

const PARENT = 'création site internet toulouse'

function explorationRow(keyword: string, rootKeywords: string[], metrics: Record<string, unknown> = {}) {
  return {
    article_id: 1342, keyword, article_level: 'intermediaire', status: 'suggested',
    root_keywords: rootKeywords, ai_panel_markdown: null, explored_at: new Date('2026-09-30T10:00:00Z'), locked_at: null,
    search_volume: null, keyword_difficulty: null, cpc: null, competition: null, intent_raw: null,
    autocomplete_suggestions: [], autocomplete_source: null, metrics_fetched_at: null,
    article_title: 'Créer son site à Toulouse',
    ...metrics,
  }
}

beforeEach(() => {
  vi.resetModules()
  mockQuery.mockReset()
  mockQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM captain_explorations ce')) {
      return {
        rows: [
          explorationRow(PARENT, ['création site internet', 'création site', 'création'], {
            search_volume: 90, keyword_difficulty: 20, cpc: 3, intent_raw: 0.7,
            autocomplete_suggestions: [], autocomplete_source: 'google', metrics_fetched_at: new Date('2026-09-30T10:00:00Z'),
          }),
          // « création site internet » a été étudiée pour l'article : sa propre ligne (relue par l'écran).
          explorationRow('création site internet', ['création site']),
        ],
      }
    }
    return { rows: [] }
  })
})

async function rootsOfParent() {
  const { getArticleKeywords } = await import('../../../server/services/infra/data.service')
  const { data } = await getArticleKeywords(1342)
  return (data!.richRootKeywords ?? []).filter(r => r.parentKeyword === PARENT)
}

describe('FR-CAP-ROOTS — racine relue sans étude enregistrée : ses mesures connues reviennent', () => {
  it('ordre des racines : celui de l’étude, de la plus longue à la plus courte', async () => {
    expect((await rootsOfParent()).map(r => r.keyword)).toEqual(['création site internet', 'création site', 'création'])
  })

  it('une racine connue de `keyword_metrics` revient avec ses indicateurs, ses questions et son Score Pertinence', async () => {
    const root = (await rootsOfParent()).find(r => r.keyword === 'création site')!
    const value = (name: string) => root.kpis.find(k => k.name === name)?.rawValue
    expect(value('volume')).toBe(673000)
    expect(value('kd')).toBe(54)
    expect(value('cpc')).toBe(4.63)
    expect(value('autocomplete')).toBe(1)
    expect(root.paaQuestions?.map(p => p.question)).toEqual([
      'Quel est le prix d’une création de site internet ?',
      'Comment créer un site pour un artisan à Toulouse ?',
    ])
    expect(root.relevanceScore?.total).toEqual(expect.any(Number))
    expect(root.relevanceUnavailableReason ?? null).toBeNull()
  })

  it('une racine qui a sa propre étude pour l’article reste relue par cette étude (rien de doublé)', async () => {
    const root = (await rootsOfParent()).find(r => r.keyword === 'création site internet')!
    expect(root.kpis).toEqual([])
    expect(root.relevanceScore ?? null).toBeNull()
  })

  it('une racine que la base n’a jamais mesurée reste sans indicateurs : rien n’est inventé ni acheté', async () => {
    const root = (await rootsOfParent()).find(r => r.keyword === 'création')!
    expect(root.kpis).toEqual([])
    expect(root.relevanceScore ?? null).toBeNull()
  })
})
