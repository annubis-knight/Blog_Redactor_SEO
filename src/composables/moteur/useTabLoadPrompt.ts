/**
 * Orchestrateur TabLoadPrompt : décide si notifier "Charger depuis DB/Cache",
 * expose actions MERGE. Périmètre : Radar, Capitaine, Lieutenants, Lexique (pas Discovery).
 *
 * Comportement :
 *   - Le prompt apparaît à chaque visite d'onglet (pas de dismiss persistant).
 *   - Il s'affiche dès qu'au moins une des sources (DB ou Cache) a des données,
 *     même si le store contient déjà ces données (raccourci "rafraîchir").
 *   - Les loaders délèguent aux méthodes `merge*` exposées par chaque domaine
 *     pour garantir l'absence de doublons.
 */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { TabCacheEntry } from '@/components/moteur/TabCachePanel.vue'
import { log } from '@/utils/logger'

export type LoadPromptTab = 'radar' | 'capitaine' | 'lieutenants' | 'lexique'

export interface TabLoadPromptData {
  tabId: LoadPromptTab
  tabLabel: string
  dbCount: number
  cacheCount: number
}

export interface TabLoadPromptLoaders {
  /** Charge depuis DB et merge dans le store. Retourne true si quelque chose a été chargé. */
  loadFromDb: (tab: LoadPromptTab) => Promise<boolean>
  /** Charge depuis Cache et merge dans le store. Retourne true si quelque chose a été chargé. */
  loadFromCache: (tab: LoadPromptTab) => Promise<boolean>
}

export interface UseTabLoadPromptDeps {
  activeTab: Ref<string>
  selectedArticleId: Ref<number | null>
  tabCacheEntries: ComputedRef<TabCacheEntry[]>
  loaders: TabLoadPromptLoaders
  onLoaded?: (tab: LoadPromptTab, source: 'db' | 'cache') => void
}

const PROMPT_TABS: ReadonlySet<string> = new Set(['radar', 'capitaine', 'lieutenants', 'lexique'])

export function useTabLoadPrompt(deps: UseTabLoadPromptDeps) {
  // Ferme le prompt courant via le bouton "fermer". Réinitialisé à chaque
  // changement d'onglet ou d'article (cf. spec : pas de dismiss persistant).
  const dismissedFor = ref<LoadPromptTab | null>(null)
  const isLoading = ref(false)

  watch([() => deps.activeTab.value, () => deps.selectedArticleId.value], () => {
    dismissedFor.value = null
  })

  const current = computed<TabLoadPromptData | null>(() => {
    const tab = deps.activeTab.value
    if (!PROMPT_TABS.has(tab)) return null
    if (!deps.selectedArticleId.value) return null
    if (dismissedFor.value === tab) return null
    const entry = deps.tabCacheEntries.value.find(e => e.tabId === tab)
    if (!entry) return null
    if (entry.dbCount === 0 && entry.cacheCount === 0) return null
    return {
      tabId: tab as LoadPromptTab,
      tabLabel: entry.tabLabel,
      dbCount: entry.dbCount,
      cacheCount: entry.cacheCount,
    }
  })

  async function loadFromDb() {
    const data = current.value
    if (!data || isLoading.value) return false
    isLoading.value = true
    try {
      const ok = await deps.loaders.loadFromDb(data.tabId)
      if (ok && deps.onLoaded) deps.onLoaded(data.tabId, 'db')
      log.info(`[TabLoadPrompt] Load from DB on tab=${data.tabId} → ${ok ? 'ok' : 'noop'}`)
      return ok
    } finally {
      isLoading.value = false
    }
  }

  async function loadFromCache() {
    const data = current.value
    if (!data || isLoading.value) return false
    isLoading.value = true
    try {
      const ok = await deps.loaders.loadFromCache(data.tabId)
      if (ok && deps.onLoaded) deps.onLoaded(data.tabId, 'cache')
      log.info(`[TabLoadPrompt] Load from Cache on tab=${data.tabId} → ${ok ? 'ok' : 'noop'}`)
      return ok
    } finally {
      isLoading.value = false
    }
  }

  function dismiss() {
    const tab = deps.activeTab.value
    if (PROMPT_TABS.has(tab)) {
      dismissedFor.value = tab as LoadPromptTab
    }
  }

  return { current, isLoading, loadFromDb, loadFromCache, dismiss }
}
