/**
 * Tests des mergers `mergeCaptainExploredKeywords`, `mergeRichLieutenants` et
 * `fetchKeywordsMerge` du store article-keywords. Garantit l'invariant clé :
 * **aucun doublon** ne doit apparaître après un merge, peu importe l'overlap
 * entre l'état mémoire et le payload entrant.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useArticleKeywordsStore } from '../../../src/stores/article/article-keywords.store'
import type { ArticleKeywords, CaptainScanEntry, RichLieutenant } from '../../../shared/types/index.js'

vi.mock('../../../src/services/api.service', () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}))

import { apiGet } from '../../../src/services/api.service'
const mockApiGet = vi.mocked(apiGet)

beforeEach(() => {
  setActivePinia(createPinia())
  mockApiGet.mockReset()
})

function entry(keyword: string): CaptainScanEntry {
  return {
    keyword,
    kpis: [],
    articleLevel: 'intermediaire',
    timestamp: new Date().toISOString(),
    validated: true,
  } as unknown as CaptainScanEntry
}

function lieutenant(keyword: string, lockedAt: string | null = null, status: 'suggested' | 'locked' | 'eliminated' | 'archived' = 'suggested'): RichLieutenant {
  return {
    keyword,
    status,
    reasoning: '',
    sources: [],
    suggestedHnLevel: 2,
    score: null,
    kpis: null,
    lockedAt,
  } as unknown as RichLieutenant
}

describe('article-keywords.store — mergeCaptainExploredKeywords', () => {
  it('ajoute uniquement les entrées absentes (clé = keyword lowercased)', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty(1)
    store.addCaptainPanel(entry('design émotionnel'))
    store.addCaptainPanel(entry('UX émotionnelle'))
    expect(store.captainExploredKeywords).toHaveLength(2)

    // Payload contient une dup (case différente) + une nouvelle entrée
    store.mergeCaptainExploredKeywords([
      entry('Design Émotionnel'), // dup → ignorée
      entry('design affectif'),   // nouveau
    ])

    expect(store.captainExploredKeywords).toHaveLength(3)
    const keywords = store.captainExploredKeywords.map(h => h.keyword)
    expect(keywords).toContain('design émotionnel')
    expect(keywords).toContain('UX émotionnelle')
    expect(keywords).toContain('design affectif')
  })

  it('initialise richCaptain si absent', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty(1)
    // Pas de richCaptain au départ
    expect(store.keywords?.richCaptain).toBeUndefined()

    store.mergeCaptainExploredKeywords([entry('foo')])
    expect(store.keywords?.richCaptain?.exploredKeywords).toHaveLength(1)
  })

  it('respecte la limite MAX_VALIDATION_HISTORY (30) après merge', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty(1)
    for (let i = 0; i < 25; i++) store.addCaptainPanel(entry(`kw-${i}`))
    expect(store.captainExploredKeywords).toHaveLength(25)

    // Ajoute 10 nouveaux via merge → total 35, doit être tronqué à 30
    store.mergeCaptainExploredKeywords(Array.from({ length: 10 }, (_, i) => entry(`new-${i}`)))
    expect(store.captainExploredKeywords).toHaveLength(30)
  })
})

describe('article-keywords.store — mergeRichLieutenants', () => {
  it('ajoute uniquement les nouveaux lieutenants (clé = keyword lowercased)', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty(1)
    if (store.keywords) store.keywords.richLieutenants = [lieutenant('seo local'), lieutenant('audit seo')]

    store.mergeRichLieutenants([
      lieutenant('SEO local'), // dup
      lieutenant('netlinking'), // nouveau
    ])

    expect(store.keywords?.richLieutenants).toHaveLength(3)
    const kws = store.keywords?.richLieutenants?.map(l => l.keyword.toLowerCase())
    expect(new Set(kws).size).toBe(3) // pas de doublon
  })

  it('en cas de collision, le lockedAt le plus récent gagne', () => {
    const store = useArticleKeywordsStore()
    store.initEmpty(1)
    if (store.keywords) store.keywords.richLieutenants = [
      lieutenant('seo local', '2025-01-01T00:00:00Z', 'suggested'),
    ]

    store.mergeRichLieutenants([
      lieutenant('seo local', '2026-04-30T00:00:00Z', 'locked'),
    ])

    const lt = store.keywords?.richLieutenants?.[0]
    expect(lt?.status).toBe('locked')
    expect(lt?.lockedAt).toBe('2026-04-30T00:00:00Z')
  })
})

describe('article-keywords.store — fetchKeywordsMerge', () => {
  it('initialise depuis remote si la mémoire est vide', async () => {
    mockApiGet.mockResolvedValue({
      articleId: 1,
      capitaine: 'foo',
      lieutenants: ['a'],
      lexique: ['x'],
      rootKeywords: [],
    } as ArticleKeywords)
    const store = useArticleKeywordsStore()
    await store.fetchKeywordsMerge(1)
    expect(store.keywords?.capitaine).toBe('foo')
    expect(store.keywords?.lieutenants).toEqual(['a'])
  })

  it('fusionne sans doublons sur lexique, lieutenants, rootKeywords', async () => {
    mockApiGet.mockResolvedValue({
      articleId: 1,
      capitaine: 'should-not-overwrite',
      lieutenants: ['existing', 'new-lt'],
      lexique: ['term-a', 'term-b'],
      rootKeywords: ['root-x'],
    } as ArticleKeywords)
    const store = useArticleKeywordsStore()
    store.initEmpty(1)
    if (store.keywords) {
      store.keywords.capitaine = 'memory-value'
      store.keywords.lieutenants = ['existing']
      store.keywords.lexique = ['term-a']
      store.keywords.rootKeywords = ['root-x']
    }

    await store.fetchKeywordsMerge(1)

    // capitaine NON écrasé (mémoire avait une valeur)
    expect(store.keywords?.capitaine).toBe('memory-value')
    // lieutenants : union sans doublon
    expect(store.keywords?.lieutenants).toEqual(['existing', 'new-lt'])
    // lexique : union sans doublon
    expect(store.keywords?.lexique).toEqual(['term-a', 'term-b'])
    // rootKeywords : pas de doublon
    expect(store.keywords?.rootKeywords).toEqual(['root-x'])
  })

  it('skip silencieusement si remote est null', async () => {
    mockApiGet.mockResolvedValue(null)
    const store = useArticleKeywordsStore()
    store.initEmpty(1)
    if (store.keywords) store.keywords.capitaine = 'kept'

    await store.fetchKeywordsMerge(1)
    expect(store.keywords?.capitaine).toBe('kept')
  })
})
