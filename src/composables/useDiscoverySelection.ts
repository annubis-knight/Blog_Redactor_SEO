import { ref, computed, type Ref } from 'vue'
import type { DiscoveredKeyword, DiscoverySource } from '@shared/types/discovery-tab.types'
import type { AnalysisResult } from '@shared/types/discovery-tab.types'

export interface DiscoverySelectionDeps {
  allKeywordsFlat: { value: DiscoveredKeyword[] }
  matchesGroupFilter: (keyword: string) => boolean
  matchesRelevance: (keyword: string) => boolean
  filteredList: (list: DiscoveredKeyword[]) => DiscoveredKeyword[]
  getSourceList: (source: DiscoverySource) => DiscoveredKeyword[]
  analysisResult: Ref<AnalysisResult | null>
}

export function useDiscoverySelection(deps: DiscoverySelectionDeps) {
  const selected = ref<Set<string>>(new Set())
  const selectedCount = computed(() => selected.value.size)

  function toggleSelect(keyword: string) {
    const key = keyword.toLowerCase()
    const next = new Set(selected.value)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    selected.value = next
  }

  function isSelected(keyword: string): boolean {
    return selected.value.has(keyword.toLowerCase())
  }

  function selectAllInSource(source: DiscoverySource) {
    const list = deps.filteredList(deps.getSourceList(source))
    const next = new Set(selected.value)
    for (const kw of list) next.add(kw.keyword.toLowerCase())
    selected.value = next
  }

  function deselectAllInSource(source: DiscoverySource) {
    const list = deps.getSourceList(source)
    const next = new Set(selected.value)
    for (const kw of list) next.delete(kw.keyword.toLowerCase())
    selected.value = next
  }

  function isAllSourceSelected(source: DiscoverySource): boolean {
    const list = deps.filteredList(deps.getSourceList(source))
    if (list.length === 0) return false
    return list.every(kw => selected.value.has(kw.keyword.toLowerCase()))
  }

  function selectAll() {
    const next = new Set(selected.value)
    for (const kw of deps.allKeywordsFlat.value) {
      if (deps.matchesGroupFilter(kw.keyword) && deps.matchesRelevance(kw.keyword)) {
        next.add(kw.keyword.toLowerCase())
      }
    }
    selected.value = next
  }

  function deselectAll() {
    selected.value = new Set()
  }

  function selectAllAnalysis() {
    if (!deps.analysisResult.value) return
    const next = new Set(selected.value)
    for (const kw of deps.analysisResult.value.keywords) next.add(kw.keyword.toLowerCase())
    selected.value = next
  }

  function deselectAllAnalysis() {
    if (!deps.analysisResult.value) return
    const next = new Set(selected.value)
    for (const kw of deps.analysisResult.value.keywords) next.delete(kw.keyword.toLowerCase())
    selected.value = next
  }

  function isAllAnalysisSelected(): boolean {
    if (!deps.analysisResult.value || deps.analysisResult.value.keywords.length === 0) return false
    return deps.analysisResult.value.keywords.every(kw => selected.value.has(kw.keyword.toLowerCase()))
  }

  function resetSelection() {
    selected.value = new Set()
  }

  return {
    selected,
    selectedCount,
    toggleSelect,
    isSelected,
    selectAllInSource,
    deselectAllInSource,
    isAllSourceSelected,
    selectAll,
    deselectAll,
    selectAllAnalysis,
    deselectAllAnalysis,
    isAllAnalysisSelected,
    resetSelection,
  }
}
