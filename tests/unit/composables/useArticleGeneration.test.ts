/**
 * FR-RED-ARTICLE / FR-RED-META / FR-RED-REDUCE-SECTION / FR-RED-HUMANIZE-SECTION
 * + FR-RED-WORD-COUNT-TARGET — composable extrait V4 (Option B Vague).
 *
 * Invariants couverts (cf. PRD §8.10) :
 *   - wordCountTarget = briefStore.briefData.contentLengthRecommendation
 *   - canReduce = delta > 15% du target (article trop long)
 *   - currentKeyword = capitaine || briefData.article.title (fallback)
 *   - allKeywords = liste plate des keywords du brief
 *   - handleGenerateArticle :
 *     * no-op si articleId null
 *     * no-op si brief ou outline manquants
 *     * séquence article → save → meta → save (2 saves pour ne pas perdre l'article si meta plante)
 *     * pilierKeyword.keyword priorise sur article.title pour meta
 *   - handleReduce / handleHumanize : save SEULEMENT si content && !error
 *   - handleAbort* délèguent au store
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

vi.mock('../../../src/utils/logger', () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { useArticleGeneration } from '../../../src/composables/article/useArticleGeneration'

function makeEditorStore(overrides: Record<string, unknown> = {}) {
  return {
    content: '<p>Article content</p>',
    error: null as string | null,
    metaTitle: 'Meta title',
    wordCountDelta: vi.fn((target: number | null) => (target ? 200 : null)),
    generateArticle: vi.fn().mockResolvedValue(undefined),
    saveArticle: vi.fn().mockResolvedValue(undefined),
    generateMeta: vi.fn().mockResolvedValue(undefined),
    reduceArticle: vi.fn().mockResolvedValue(undefined),
    humanizeArticle: vi.fn().mockResolvedValue(undefined),
    abortReduce: vi.fn(),
    abortHumanize: vi.fn(),
    ...overrides,
  } as never
}

function makeBriefStore(target: number | null = 1500) {
  return {
    briefData: {
      contentLengthRecommendation: target,
      article: { title: 'Le SEO local pour les artisans' },
      keywords: [
        { keyword: 'seo local artisan', type: 'Pilier' },
        { keyword: 'référencement google', type: 'Intermédiaire' },
      ],
    },
  } as never
}

function makeOutlineStore() {
  return {
    outline: { sections: [{ id: 's1', level: 1, title: 'H1', annotation: '' }] },
  } as never
}

function makeArticleKeywordsStore(capitaine: string | null = 'seo local artisan') {
  return {
    keywords: capitaine ? { capitaine } : null,
  } as never
}

function setup(opts: { articleId?: number | null; editorOverrides?: Record<string, unknown>; target?: number | null; capitaine?: string | null } = {}) {
  const articleId = ref<number | null>('articleId' in opts ? (opts.articleId as number | null) : 7)
  const editorStore = makeEditorStore(opts.editorOverrides)
  const briefStore = makeBriefStore(opts.target)
  const outlineStore = makeOutlineStore()
  const articleKeywordsStore = makeArticleKeywordsStore(opts.capitaine)
  const api = useArticleGeneration({ articleId, editorStore, briefStore, outlineStore, articleKeywordsStore })
  return { api, articleId, editorStore, briefStore, outlineStore, articleKeywordsStore }
}

describe('useArticleGeneration — FR-RED-ARTICLE/META/REDUCE/HUMANIZE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('computeds', () => {
    it('wordCountTarget = briefData.contentLengthRecommendation', () => {
      const { api } = setup({ target: 2000 })
      expect(api.wordCountTarget.value).toBe(2000)
    })

    it('wordCountTarget = null si brief absent', () => {
      const { api } = setup({ target: null })
      expect(api.wordCountTarget.value).toBeNull()
    })

    it('canReduce = true si delta > 15% du target', () => {
      // delta=200 / target=1000 = 20% > 15
      const { api } = setup({ target: 1000, editorOverrides: { wordCountDelta: vi.fn(() => 200) } })
      expect(api.canReduce.value).toBe(true)
    })

    it('canReduce = false si delta ≤ 15%', () => {
      const { api } = setup({ target: 1000, editorOverrides: { wordCountDelta: vi.fn(() => 100) } })
      expect(api.canReduce.value).toBe(false)
    })

    it('canReduce = false si content vide', () => {
      const { api } = setup({ target: 1000, editorOverrides: { content: '' } })
      expect(api.canReduce.value).toBe(false)
    })

    it('currentKeyword = capitaine si présent', () => {
      const { api } = setup({ capitaine: 'mon keyword' })
      expect(api.currentKeyword.value).toBe('mon keyword')
    })

    it('currentKeyword = article.title si capitaine absent', () => {
      const { api } = setup({ capitaine: null })
      expect(api.currentKeyword.value).toBe('Le SEO local pour les artisans')
    })

    it('allKeywords = liste plate des keywords du brief', () => {
      const { api } = setup()
      expect(api.allKeywords.value).toEqual(['seo local artisan', 'référencement google'])
    })
  })

  describe('handleGenerateArticle', () => {
    it('no-op si articleId est null', async () => {
      const { api, editorStore } = setup({ articleId: null })
      await api.handleGenerateArticle()
      expect(editorStore.generateArticle).not.toHaveBeenCalled()
    })

    it('séquence happy path : generate → save → meta → save (2 appels saveArticle)', async () => {
      const { api, editorStore } = setup()
      await api.handleGenerateArticle()
      expect(editorStore.generateArticle).toHaveBeenCalledOnce()
      expect(editorStore.saveArticle).toHaveBeenCalledTimes(2)
      expect(editorStore.generateMeta).toHaveBeenCalledOnce()
    })

    it('utilise pilierKeyword.keyword pour meta (pas article.title)', async () => {
      const { api, editorStore } = setup()
      await api.handleGenerateArticle()
      expect(editorStore.generateMeta).toHaveBeenCalledWith(
        7,
        'seo local artisan',
        'Le SEO local pour les artisans',
        '<p>Article content</p>',
      )
    })

    it('si meta plante (editorStore.error), saveArticle est appelé une SEULE fois (avant meta)', async () => {
      const editorStore = makeEditorStore()
      let callCount = 0
      editorStore.generateMeta = vi.fn(async () => {
        callCount++
        editorStore.error = 'Meta failed'
      })
      const articleId = ref<number | null>(7)
      const api = useArticleGeneration({
        articleId,
        editorStore,
        briefStore: makeBriefStore(),
        outlineStore: makeOutlineStore(),
        articleKeywordsStore: makeArticleKeywordsStore(),
      })
      await api.handleGenerateArticle()
      expect(callCount).toBe(1)
      // 1 save pré-meta (sauvegarde le contenu) ; pas de 2ème save car meta a planté
      expect(editorStore.saveArticle).toHaveBeenCalledTimes(1)
    })

    it('no-op si brief manquant', async () => {
      const articleId = ref<number | null>(7)
      const editorStore = makeEditorStore()
      const api = useArticleGeneration({
        articleId,
        editorStore,
        briefStore: { briefData: null } as never,
        outlineStore: makeOutlineStore(),
        articleKeywordsStore: makeArticleKeywordsStore(),
      })
      await api.handleGenerateArticle()
      expect(editorStore.generateArticle).not.toHaveBeenCalled()
    })

    it('no-op si outline manquant', async () => {
      const articleId = ref<number | null>(7)
      const editorStore = makeEditorStore()
      const api = useArticleGeneration({
        articleId,
        editorStore,
        briefStore: makeBriefStore(),
        outlineStore: { outline: null } as never,
        articleKeywordsStore: makeArticleKeywordsStore(),
      })
      await api.handleGenerateArticle()
      expect(editorStore.generateArticle).not.toHaveBeenCalled()
    })

    it('si generateArticle plante (error), pas de save ni meta', async () => {
      const editorStore = makeEditorStore({ content: '', error: 'Network' })
      const articleId = ref<number | null>(7)
      const api = useArticleGeneration({
        articleId,
        editorStore,
        briefStore: makeBriefStore(),
        outlineStore: makeOutlineStore(),
        articleKeywordsStore: makeArticleKeywordsStore(),
      })
      await api.handleGenerateArticle()
      expect(editorStore.generateArticle).toHaveBeenCalledOnce()
      expect(editorStore.saveArticle).not.toHaveBeenCalled()
      expect(editorStore.generateMeta).not.toHaveBeenCalled()
    })
  })

  describe('handleReduce', () => {
    it('no-op si articleId null', async () => {
      const { api, editorStore } = setup({ articleId: null })
      await api.handleReduce()
      expect(editorStore.reduceArticle).not.toHaveBeenCalled()
    })

    it('no-op si wordCountTarget null', async () => {
      const { api, editorStore } = setup({ target: null })
      await api.handleReduce()
      expect(editorStore.reduceArticle).not.toHaveBeenCalled()
    })

    it('happy path : reduce puis save', async () => {
      const { api, editorStore } = setup()
      await api.handleReduce()
      expect(editorStore.reduceArticle).toHaveBeenCalledWith(
        7,
        1500,
        'seo local artisan',
        ['seo local artisan', 'référencement google'],
      )
      expect(editorStore.saveArticle).toHaveBeenCalledOnce()
    })

    it('pas de save si reduceArticle a posé une error', async () => {
      const editorStore = makeEditorStore()
      editorStore.reduceArticle = vi.fn(async () => {
        editorStore.error = 'Reduce failed'
      })
      const articleId = ref<number | null>(7)
      const api = useArticleGeneration({
        articleId,
        editorStore,
        briefStore: makeBriefStore(),
        outlineStore: makeOutlineStore(),
        articleKeywordsStore: makeArticleKeywordsStore(),
      })
      await api.handleReduce()
      expect(editorStore.saveArticle).not.toHaveBeenCalled()
    })
  })

  describe('handleHumanize', () => {
    it('no-op si articleId null', async () => {
      const { api, editorStore } = setup({ articleId: null })
      await api.handleHumanize()
      expect(editorStore.humanizeArticle).not.toHaveBeenCalled()
    })

    it('happy path : humanize puis save', async () => {
      const { api, editorStore } = setup()
      await api.handleHumanize()
      expect(editorStore.humanizeArticle).toHaveBeenCalledWith(
        7,
        'seo local artisan',
        ['seo local artisan', 'référencement google'],
      )
      expect(editorStore.saveArticle).toHaveBeenCalledOnce()
    })

    it('pas de save si humanizeArticle a posé une error', async () => {
      const editorStore = makeEditorStore()
      editorStore.humanizeArticle = vi.fn(async () => {
        editorStore.error = 'Humanize failed'
      })
      const articleId = ref<number | null>(7)
      const api = useArticleGeneration({
        articleId,
        editorStore,
        briefStore: makeBriefStore(),
        outlineStore: makeOutlineStore(),
        articleKeywordsStore: makeArticleKeywordsStore(),
      })
      await api.handleHumanize()
      expect(editorStore.saveArticle).not.toHaveBeenCalled()
    })
  })

  describe('abort handlers', () => {
    it('handleAbortReduce délègue à editorStore.abortReduce', () => {
      const { api, editorStore } = setup()
      api.handleAbortReduce()
      expect(editorStore.abortReduce).toHaveBeenCalledOnce()
    })

    it('handleAbortHumanize délègue à editorStore.abortHumanize', () => {
      const { api, editorStore } = setup()
      api.handleAbortHumanize()
      expect(editorStore.abortHumanize).toHaveBeenCalledOnce()
    })
  })
})
