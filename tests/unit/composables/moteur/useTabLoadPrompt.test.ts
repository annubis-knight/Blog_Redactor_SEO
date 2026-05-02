/**
 * Tests du composable orchestrateur `useTabLoadPrompt`. Vérifie :
 *   - Le prompt n'apparaît que pour les onglets supportés (Radar, Capitaine,
 *     Lieutenants, Lexique) et seulement si dbCount > 0 ou cacheCount > 0.
 *   - Le prompt est null sans articleId.
 *   - Le dismiss est réinitialisé au changement d'onglet ou d'article.
 *   - Les loaders délèguent au mapper passé en deps et appellent onLoaded.
 */
import { describe, it, expect, vi } from 'vitest'
import { ref, computed, nextTick } from 'vue'
import { useTabLoadPrompt, type LoadPromptTab } from '../../../../src/composables/moteur/useTabLoadPrompt'
import type { TabCacheEntry } from '../../../../src/components/moteur/TabCachePanel.vue'

function makeEntries(overrides: Partial<Record<string, Partial<TabCacheEntry>>> = {}): TabCacheEntry[] {
  const base: TabCacheEntry[] = [
    { tabId: 'radar', tabLabel: 'Radar', dbCount: 0, cacheCount: 0, isCurrentTab: false },
    { tabId: 'capitaine', tabLabel: 'Capitaine', dbCount: 0, cacheCount: 0, isCurrentTab: false },
    { tabId: 'lieutenants', tabLabel: 'Lieutenants', dbCount: 0, cacheCount: 0, isCurrentTab: false },
    { tabId: 'lexique', tabLabel: 'Lexique', dbCount: 0, cacheCount: 0, isCurrentTab: false },
  ]
  return base.map(e => ({ ...e, ...overrides[e.tabId] }))
}

function makeDeps(opts: {
  activeTab?: string
  articleId?: number | null
  entries?: TabCacheEntry[]
  loadFromDb?: (tab: LoadPromptTab) => Promise<boolean>
  loadFromCache?: (tab: LoadPromptTab) => Promise<boolean>
  onLoaded?: (tab: LoadPromptTab, source: 'db' | 'cache') => void
} = {}) {
  const activeTab = ref(opts.activeTab ?? 'capitaine')
  // `?? 42` ne suffit pas : si l'appelant veut tester articleId=null, il faut
  // distinguer "pas fourni" (→ 42) de "explicitement null" (→ null).
  const initialArticleId = 'articleId' in opts ? opts.articleId ?? null : 42
  const articleId = ref<number | null>(initialArticleId)
  const entriesRef = ref(opts.entries ?? makeEntries())
  return {
    activeTab,
    selectedArticleId: articleId,
    tabCacheEntries: computed(() => entriesRef.value),
    loaders: {
      loadFromDb: opts.loadFromDb ?? vi.fn(async () => true),
      loadFromCache: opts.loadFromCache ?? vi.fn(async () => true),
    },
    onLoaded: opts.onLoaded,
    _entriesRef: entriesRef,
  }
}

describe('useTabLoadPrompt — current', () => {
  it('null si articleId manquant', () => {
    const deps = makeDeps({ articleId: null, entries: makeEntries({ capitaine: { dbCount: 5 } }) })
    const { current } = useTabLoadPrompt(deps)
    expect(current.value).toBeNull()
  })

  it('null si onglet courant n\'est pas dans le périmètre (ex: discovery)', () => {
    const deps = makeDeps({ activeTab: 'discovery', entries: makeEntries({ capitaine: { dbCount: 5 } }) })
    const { current } = useTabLoadPrompt(deps)
    expect(current.value).toBeNull()
  })

  it('null si l\'onglet courant a 0 en DB et 0 en cache', () => {
    const deps = makeDeps({ activeTab: 'capitaine', entries: makeEntries() })
    const { current } = useTabLoadPrompt(deps)
    expect(current.value).toBeNull()
  })

  it('renvoie un prompt avec les compteurs DB/Cache de l\'onglet courant', () => {
    const deps = makeDeps({
      activeTab: 'radar',
      entries: makeEntries({ radar: { dbCount: 25, cacheCount: 1 } }),
    })
    const { current } = useTabLoadPrompt(deps)
    expect(current.value).toEqual({
      tabId: 'radar',
      tabLabel: 'Radar',
      dbCount: 25,
      cacheCount: 1,
    })
  })

  it('réagit au changement d\'onglet courant', async () => {
    const deps = makeDeps({
      activeTab: 'capitaine',
      entries: makeEntries({ capitaine: { dbCount: 3 }, lieutenants: { dbCount: 7 } }),
    })
    const { current } = useTabLoadPrompt(deps)
    expect(current.value?.tabId).toBe('capitaine')
    deps.activeTab.value = 'lieutenants'
    await nextTick()
    expect(current.value?.tabId).toBe('lieutenants')
    expect(current.value?.dbCount).toBe(7)
  })
})

describe('useTabLoadPrompt — dismiss', () => {
  it('cache le prompt jusqu\'au prochain changement d\'onglet', async () => {
    const deps = makeDeps({
      activeTab: 'capitaine',
      entries: makeEntries({ capitaine: { dbCount: 5 }, lexique: { dbCount: 8 } }),
    })
    const { current, dismiss } = useTabLoadPrompt(deps)
    expect(current.value).not.toBeNull()
    dismiss()
    await nextTick()
    expect(current.value).toBeNull()

    // Changer d'onglet → réapparaît
    deps.activeTab.value = 'lexique'
    await nextTick()
    expect(current.value?.tabId).toBe('lexique')
  })

  it('réapparaît si on revient sur l\'onglet (reset au changement d\'onglet)', async () => {
    const deps = makeDeps({
      activeTab: 'capitaine',
      entries: makeEntries({ capitaine: { dbCount: 5 }, radar: { dbCount: 3 } }),
    })
    const { current, dismiss } = useTabLoadPrompt(deps)
    dismiss()
    deps.activeTab.value = 'radar'
    await nextTick()
    deps.activeTab.value = 'capitaine'
    await nextTick()
    expect(current.value?.tabId).toBe('capitaine')
  })

  it('reset le dismiss au changement d\'article', async () => {
    const deps = makeDeps({
      activeTab: 'capitaine',
      entries: makeEntries({ capitaine: { dbCount: 5 } }),
    })
    const { current, dismiss } = useTabLoadPrompt(deps)
    dismiss()
    await nextTick()
    expect(current.value).toBeNull()

    deps.selectedArticleId.value = 99
    await nextTick()
    expect(current.value).not.toBeNull()
  })
})

describe('useTabLoadPrompt — loaders', () => {
  it('loadFromDb délègue à deps.loaders.loadFromDb avec le tabId courant', async () => {
    const loadFromDb = vi.fn(async () => true)
    const onLoaded = vi.fn()
    const deps = makeDeps({
      activeTab: 'capitaine',
      entries: makeEntries({ capitaine: { dbCount: 5 } }),
      loadFromDb,
      onLoaded,
    })
    const promptHook = useTabLoadPrompt(deps)
    const ok = await promptHook.loadFromDb()
    expect(ok).toBe(true)
    expect(loadFromDb).toHaveBeenCalledWith('capitaine')
    expect(onLoaded).toHaveBeenCalledWith('capitaine', 'db')
  })

  it('loadFromCache délègue avec le tabId courant', async () => {
    const loadFromCache = vi.fn(async () => true)
    const deps = makeDeps({
      activeTab: 'radar',
      entries: makeEntries({ radar: { cacheCount: 1 } }),
      loadFromCache,
    })
    const promptHook = useTabLoadPrompt(deps)
    await promptHook.loadFromCache()
    expect(loadFromCache).toHaveBeenCalledWith('radar')
  })

  it('isLoading est true pendant l\'opération', async () => {
    let resolve!: (v: boolean) => void
    const loadFromDb = vi.fn(() => new Promise<boolean>(r => { resolve = r }))
    const deps = makeDeps({
      activeTab: 'capitaine',
      entries: makeEntries({ capitaine: { dbCount: 5 } }),
      loadFromDb,
    })
    const { isLoading, loadFromDb: trigger } = useTabLoadPrompt(deps)
    const p = trigger()
    expect(isLoading.value).toBe(true)
    resolve(true)
    await p
    expect(isLoading.value).toBe(false)
  })

  it('skip silencieusement si pas de prompt courant', async () => {
    const loadFromDb = vi.fn(async () => true)
    const deps = makeDeps({
      activeTab: 'capitaine',
      entries: makeEntries(), // tous à 0
      loadFromDb,
    })
    const { loadFromDb: trigger } = useTabLoadPrompt(deps)
    const ok = await trigger()
    expect(ok).toBe(false)
    expect(loadFromDb).not.toHaveBeenCalled()
  })
})
