import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ApiUsage } from '@shared/types/index.js'

export interface CostLogEntry {
  id: string
  actionLabel: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  timestamp: string
}

let entryCounter = 0

export const useCostLogStore = defineStore('costLog', () => {
  const entries = ref<CostLogEntry[]>([])
  const isCollapsed = ref(true)

  const totalCost = computed(() =>
    entries.value.reduce((sum, e) => sum + e.estimatedCost, 0),
  )

  const entryCount = computed(() => entries.value.length)

  function addEntry(actionLabel: string, usage: ApiUsage) {
    entries.value.unshift({
      id: `cost-${++entryCounter}`,
      actionLabel,
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: usage.estimatedCost,
      timestamp: new Date().toISOString(),
    })
  }

  function removeEntry(id: string) {
    entries.value = entries.value.filter(e => e.id !== id)
  }

  function clearAll() {
    entries.value = []
  }

  function toggleCollapsed() {
    isCollapsed.value = !isCollapsed.value
  }

  return {
    entries, isCollapsed,
    totalCost, entryCount,
    addEntry, removeEntry, clearAll, toggleCollapsed,
  }
})
