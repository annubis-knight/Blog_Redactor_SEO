/**
 * Vague 4 — Tests isolés useArticleGeneration.
 *
 * Référence FR PRD : FR-RED-* (génération article + meta + reduce + humanize).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useArticleGeneration } from '../../../../src/composables/article/useArticleGeneration'
import { useEditorStore } from '../../../../src/stores/article/editor.store'
import { useBriefStore } from '../../../../src/stores/strategy/brief.store'
import { useOutlineStore } from '../../../../src/stores/article/outline.store'
import { useArticleKeywordsStore } from '../../../../src/stores/article/article-keywords.store'

vi.mock('../../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('useArticleGeneration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function buildDeps(overrides: { articleId?: number | null } = {}) {
    const editorStore = useEditorStore()
    editorStore.content = null as never
    editorStore.error = null
    editorStore.generateArticle = vi.fn().mockResolvedValue(undefined) as never
    editorStore.generateMeta = vi.fn().mockResolvedValue(undefined) as never
    editorStore.saveArticle = vi.fn().mockResolvedValue(undefined) as never
    editorStore.reduceArticle = vi.fn().mockResolvedValue(undefined) as never
    editorStore.humanizeArticle = vi.fn().mockResolvedValue(undefined) as never
    editorStore.abortReduce = vi.fn() as never
    editorStore.abortHumanize = vi.fn() as never
    editorStore.wordCountDelta = vi.fn().mockReturnValue(0) as never

    const briefStore = useBriefStore()
    briefStore.briefData = {
      article: { title: 'Mon article', cocoonName: 'cocoon', type: 'Pilier' },
      keywords: [
        { keyword: 'mot pilier', type: 'Pilier' },
        { keyword: 'mot lieutenant', type: 'Lieutenant' },
      ],
      contentLengthRecommendation: 1500,
    } as never

    const outlineStore = useOutlineStore()
    outlineStore.outline = { title: 'Article', sections: [{ heading: 'h2', level: 2 }] } as never

    const articleKeywordsStore = useArticleKeywordsStore()
    articleKeywordsStore.keywords = {
      articleId: 1, capitaine: 'mot capitaine', lieutenants: [], lexique: [], rootKeywords: [],
    } as never

    return {
      articleId: ref(overrides.articleId !== undefined ? overrides.articleId : 1),
      editorStore,
      briefStore,
      outlineStore,
      articleKeywordsStore,
    }
  }

  it('AC.M.1 — wordCountTarget reflète briefStore.briefData.contentLengthRecommendation', () => {
    const deps = buildDeps()
    const api = useArticleGeneration(deps)
    expect(api.wordCountTarget.value).toBe(1500)
  })

  it('AC.M.2 — currentKeyword priorise capitaine sur articleTitle', () => {
    const deps = buildDeps()
    const api = useArticleGeneration(deps)
    expect(api.currentKeyword.value).toBe('mot capitaine')

    // Sans capitaine → fallback titre
    deps.articleKeywordsStore.keywords = { ...deps.articleKeywordsStore.keywords!, capitaine: null } as never
    expect(api.currentKeyword.value).toBe('Mon article')
  })

  it('AC.M.3 — allKeywords liste les keywords du brief', () => {
    const deps = buildDeps()
    const api = useArticleGeneration(deps)
    expect(api.allKeywords.value).toEqual(['mot pilier', 'mot lieutenant'])
  })

  it('AC.M.4 — canReduce = true si delta > 15 % du target', () => {
    const deps = buildDeps()
    deps.editorStore.content = '<p>x</p>' as never
    deps.editorStore.wordCountDelta = vi.fn((target: number | null) => {
      if (!target) return null
      return Math.round(target * 0.20) // 20 % au-dessus → canReduce true
    }) as never

    const api = useArticleGeneration(deps)
    expect(api.canReduce.value).toBe(true)
  })

  it('AC.M.5 — canReduce = false si delta = 5 % seulement', () => {
    const deps = buildDeps()
    deps.editorStore.content = '<p>x</p>' as never
    deps.editorStore.wordCountDelta = vi.fn((target: number | null) => {
      if (!target) return null
      return Math.round(target * 0.05)
    }) as never

    const api = useArticleGeneration(deps)
    expect(api.canReduce.value).toBe(false)
  })

  it('AC.M.6 — handleGenerateArticle no-op si articleId null', async () => {
    const deps = buildDeps({ articleId: null })
    const api = useArticleGeneration(deps)
    await api.handleGenerateArticle()
    expect(deps.editorStore.generateArticle).not.toHaveBeenCalled()
  })

  it('AC.M.7 — handleGenerateArticle séquence : generate → save → meta → save', async () => {
    const deps = buildDeps()
    deps.editorStore.generateArticle = vi.fn(async () => {
      // Simule la fin de génération avec content peuplé
      deps.editorStore.content = '<p>généré</p>' as never
    }) as never

    const api = useArticleGeneration(deps)
    await api.handleGenerateArticle()

    expect(deps.editorStore.generateArticle).toHaveBeenCalledWith(
      deps.briefStore.briefData,
      deps.outlineStore.outline,
      1500,
    )
    expect(deps.editorStore.saveArticle).toHaveBeenCalledTimes(2) // après article + après meta
    expect(deps.editorStore.generateMeta).toHaveBeenCalledWith(
      1,
      'mot pilier', // pilier keyword priorisé
      'Mon article',
      '<p>généré</p>',
    )
  })

  it('AC.M.8 — handleGenerateArticle saute meta si error post-generation', async () => {
    const deps = buildDeps()
    deps.editorStore.generateArticle = vi.fn(async () => {
      deps.editorStore.error = 'fail' as never
    }) as never

    const api = useArticleGeneration(deps)
    await api.handleGenerateArticle()

    expect(deps.editorStore.saveArticle).not.toHaveBeenCalled()
    expect(deps.editorStore.generateMeta).not.toHaveBeenCalled()
  })

  it('AC.M.9 — handleReduce no-op si pas de target', async () => {
    const deps = buildDeps()
    deps.briefStore.briefData!.contentLengthRecommendation = null as never
    const api = useArticleGeneration(deps)
    await api.handleReduce()
    expect(deps.editorStore.reduceArticle).not.toHaveBeenCalled()
  })

  it('AC.M.10 — handleReduce appelle reduceArticle puis save si content', async () => {
    const deps = buildDeps()
    deps.editorStore.reduceArticle = vi.fn(async () => {
      deps.editorStore.content = '<p>réduit</p>' as never
    }) as never

    const api = useArticleGeneration(deps)
    await api.handleReduce()

    expect(deps.editorStore.reduceArticle).toHaveBeenCalledWith(1, 1500, 'mot capitaine', ['mot pilier', 'mot lieutenant'])
    expect(deps.editorStore.saveArticle).toHaveBeenCalledWith(1)
  })

  it('AC.M.11 — handleHumanize appelle humanizeArticle puis save si content', async () => {
    const deps = buildDeps()
    deps.editorStore.humanizeArticle = vi.fn(async () => {
      deps.editorStore.content = '<p>humanisé</p>' as never
    }) as never

    const api = useArticleGeneration(deps)
    await api.handleHumanize()

    expect(deps.editorStore.humanizeArticle).toHaveBeenCalledWith(1, 'mot capitaine', ['mot pilier', 'mot lieutenant'])
    expect(deps.editorStore.saveArticle).toHaveBeenCalledWith(1)
  })

  it('AC.M.12 — handleAbortReduce / handleAbortHumanize délèguent au store', () => {
    const deps = buildDeps()
    const api = useArticleGeneration(deps)
    api.handleAbortReduce()
    api.handleAbortHumanize()
    expect(deps.editorStore.abortReduce).toHaveBeenCalled()
    expect(deps.editorStore.abortHumanize).toHaveBeenCalled()
  })
})
