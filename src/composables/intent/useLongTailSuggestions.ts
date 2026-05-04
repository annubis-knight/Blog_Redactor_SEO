/**
 * Composable de gestion de l'etat UI des suggestions longue-traine du Radar.
 *
 * Etat : idle | loading | success | error
 * - generate()    : 1er appel (POST), pre-coche le top 5 par preferenceScore desc.
 * - regenerate()  : meme route, conserve `selectedKeywords` qui matchent la nouvelle liste.
 * - toggle()      : add/remove du Set de selection, debounce PATCH 500ms vers la DB.
 * - hydrate()     : restauration depuis la DB (pas d'appel reseau).
 */
import { ref, type Ref } from 'vue'
import { apiPost, apiPatch } from '@/services/api.service'
import { log } from '@/utils/logger'
import type { LongTailSuggestion } from '@shared/types/long-tail.types'

export type LongTailStatus = 'idle' | 'loading' | 'success' | 'error'

const SELECTION_DEBOUNCE_MS = 500
const PRECHECK_TOP_N = 5

export interface UseLongTailSuggestionsApi {
  status: Ref<LongTailStatus>
  suggestions: Ref<LongTailSuggestion[]>
  selectedKeywords: Ref<Set<string>>
  error: Ref<string | null>
  generate: (radarKeywords: { keyword: string }[], articleTitle: string, articlePainPoint: string) => Promise<void>
  regenerate: (radarKeywords: { keyword: string }[], articleTitle: string, articlePainPoint: string) => Promise<void>
  toggle: (keyword: string) => void
  hydrate: (suggestions: LongTailSuggestion[], selected?: string[]) => void
  getSelectedSuggestions: () => LongTailSuggestion[]
  reset: () => void
}

export function useLongTailSuggestions(articleId: number): UseLongTailSuggestionsApi {
  const status = ref<LongTailStatus>('idle')
  const suggestions = ref<LongTailSuggestion[]>([])
  const selectedKeywords = ref<Set<string>>(new Set())
  const error = ref<string | null>(null)

  let pendingPatchTimer: ReturnType<typeof setTimeout> | null = null

  function sortDesc(list: LongTailSuggestion[]): LongTailSuggestion[] {
    return [...list].sort((a, b) =>
      b.preferenceScore - a.preferenceScore || a.keyword.localeCompare(b.keyword),
    )
  }

  function precheckTopN(list: LongTailSuggestion[]): Set<string> {
    return new Set(sortDesc(list).slice(0, PRECHECK_TOP_N).map(s => s.keyword))
  }

  async function callApi(
    radarKeywords: { keyword: string }[],
    articleTitle: string,
    articlePainPoint: string,
  ): Promise<LongTailSuggestion[]> {
    const res = await apiPost<{ suggestions: LongTailSuggestion[]; fromCache: boolean }>(
      `/articles/${articleId}/radar-exploration/long-tail`,
      { radarKeywords, articleTitle, articlePainPoint, strategyContext: '' },
    )
    return res.suggestions ?? []
  }

  async function generate(
    radarKeywords: { keyword: string }[],
    articleTitle: string,
    articlePainPoint: string,
  ): Promise<void> {
    status.value = 'loading'
    error.value = null
    try {
      const list = await callApi(radarKeywords, articleTitle, articlePainPoint)
      suggestions.value = sortDesc(list)
      selectedKeywords.value = precheckTopN(list)
      status.value = 'success'
      log.info('[useLongTailSuggestions] generated', { articleId, count: list.length })
    } catch (err) {
      const msg = (err as Error).message ?? 'Unknown error'
      error.value = msg
      status.value = 'error'
      log.warn('[useLongTailSuggestions] generation failed', { articleId, error: msg })
      throw err
    }
  }

  async function regenerate(
    radarKeywords: { keyword: string }[],
    articleTitle: string,
    articlePainPoint: string,
  ): Promise<void> {
    status.value = 'loading'
    error.value = null
    try {
      const list = await callApi(radarKeywords, articleTitle, articlePainPoint)
      // Conserve la selection precedente qui matche la nouvelle liste
      const newKeywordsSet = new Set(list.map(s => s.keyword))
      const preserved = new Set<string>()
      for (const kw of selectedKeywords.value) {
        if (newKeywordsSet.has(kw)) preserved.add(kw)
      }
      suggestions.value = sortDesc(list)
      selectedKeywords.value = preserved
      status.value = 'success'
      log.info('[useLongTailSuggestions] regenerated', { articleId, count: list.length, preserved: preserved.size })
    } catch (err) {
      const msg = (err as Error).message ?? 'Unknown error'
      error.value = msg
      status.value = 'error'
      log.warn('[useLongTailSuggestions] regeneration failed', { articleId, error: msg })
      throw err
    }
  }

  function toggle(keyword: string): void {
    const next = new Set(selectedKeywords.value)
    if (next.has(keyword)) next.delete(keyword)
    else next.add(keyword)
    selectedKeywords.value = next
    schedulePersistSelection()
  }

  function schedulePersistSelection(): void {
    if (pendingPatchTimer !== null) clearTimeout(pendingPatchTimer)
    pendingPatchTimer = setTimeout(() => {
      pendingPatchTimer = null
      const selectedArr = Array.from(selectedKeywords.value)
      apiPatch(`/articles/${articleId}/radar-exploration/long-tail/selection`, {
        selectedKeywords: selectedArr,
      }).catch(err => {
        log.warn('[useLongTailSuggestions] PATCH selection failed (best-effort)', {
          articleId,
          error: (err as Error).message,
        })
      })
    }, SELECTION_DEBOUNCE_MS)
  }

  function hydrate(list: LongTailSuggestion[], selected?: string[]): void {
    suggestions.value = sortDesc(list)
    selectedKeywords.value = new Set(selected ?? [])
    status.value = list.length > 0 ? 'success' : 'idle'
    error.value = null
  }

  function getSelectedSuggestions(): LongTailSuggestion[] {
    return sortDesc(suggestions.value.filter(s => selectedKeywords.value.has(s.keyword)))
  }

  function reset(): void {
    if (pendingPatchTimer !== null) {
      clearTimeout(pendingPatchTimer)
      pendingPatchTimer = null
    }
    status.value = 'idle'
    suggestions.value = []
    selectedKeywords.value = new Set()
    error.value = null
  }

  return {
    status,
    suggestions,
    selectedKeywords,
    error,
    generate,
    regenerate,
    toggle,
    hydrate,
    getSelectedSuggestions,
    reset,
  }
}
