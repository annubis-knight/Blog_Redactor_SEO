import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ApiUsage, DbOp } from '@shared/types/index.js'

export type ActivityLevel = 'api' | 'db' | 'info' | 'warning' | 'error'

interface BaseEntry {
  id: string
  level: ActivityLevel
  label: string
  timestamp: string
}

export interface ApiActivityEntry extends BaseEntry {
  level: 'api'
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
}

export interface DbActivityEntry extends BaseEntry {
  level: 'db'
  operation: DbOp['operation']
  table: string
  rowCount: number
  ms: number
}

export interface MessageActivityEntry extends BaseEntry {
  level: 'info' | 'warning' | 'error'
  detail?: string
}

export type ActivityEntry = ApiActivityEntry | DbActivityEntry | MessageActivityEntry

// Legacy alias — existing code still imports CostLogEntry
export type CostLogEntry = ApiActivityEntry

let entryCounter = 0

export const useCostLogStore = defineStore('costLog', () => {
  const entries = ref<ActivityEntry[]>([])
  const isCollapsed = ref(true)

  const totalCost = computed(() =>
    entries.value.reduce(
      (sum, e) => (e.level === 'api' ? sum + e.estimatedCost : sum),
      0,
    ),
  )

  const entryCount = computed(() => entries.value.length)

  function addEntry(actionLabel: string, usage: ApiUsage) {
    entries.value.unshift({
      id: `cost-${++entryCounter}`,
      level: 'api',
      label: actionLabel,
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: usage.estimatedCost,
      timestamp: new Date().toISOString(),
    })
  }

  function addDbEntry(actionLabel: string, op: DbOp) {
    entries.value.unshift({
      id: `db-${++entryCounter}`,
      level: 'db',
      label: actionLabel,
      operation: op.operation,
      table: op.table,
      rowCount: op.rowCount,
      ms: op.ms,
      timestamp: new Date().toISOString(),
    })
  }

  function addMessage(
    level: 'info' | 'warning' | 'error',
    label: string,
    detail?: string,
  ) {
    entries.value.unshift({
      id: `msg-${++entryCounter}`,
      level,
      label,
      detail,
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
    addEntry, addDbEntry, addMessage, removeEntry, clearAll, toggleCollapsed,
  }
})
