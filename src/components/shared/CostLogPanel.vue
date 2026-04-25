<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useCostLogStore } from '@/stores/ui/cost-log.store'
import { apiGet } from '@/services/api.service'

const store = useCostLogStore()

// Sprint 0.3 — DataForSEO sliding-window budget.
// Polls the backend every 15s to show live spend in the pile header.
interface CostStatus { spentUsd: number; budgetUsd: number; windowMin: number; entries: number; sandbox: boolean }
const costStatus = ref<CostStatus | null>(null)
let pollId: ReturnType<typeof setInterval> | null = null
async function refreshCostStatus() {
  try {
    costStatus.value = await apiGet<CostStatus>('/dataforseo/cost-status')
  } catch {
    // Silent — endpoint may be unavailable briefly.
  }
}
onMounted(() => {
  refreshCostStatus()
  pollId = setInterval(refreshCostStatus, 15_000)
})
onBeforeUnmount(() => { if (pollId) clearInterval(pollId) })

function budgetRatio(s: CostStatus | null): number {
  if (!s || s.budgetUsd <= 0) return 0
  return Math.min(1, s.spentUsd / s.budgetUsd)
}

function formatCost(cost: number): string {
  if (cost < 0.001) return '< $0.001'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function shortModel(model: string): string {
  return model
    .replace('claude-', '')
    .replace(/-\d{8}$/, '')
}

function iconFor(level: 'info' | 'warning' | 'error'): string {
  if (level === 'error') return '!'
  if (level === 'warning') return '?'
  return 'i'
}

const DB_OP_SYMBOL: Record<string, string> = {
  insert: '+',
  upsert: '&uArr;',
  update: '~',
  delete: '&minus;',
  select: '?',
}
function dbSymbol(op: string): string {
  return DB_OP_SYMBOL[op] ?? '&bull;'
}
</script>

<template>
  <Teleport to="body">
    <div v-if="store.entryCount > 0 || costStatus" class="cost-log" data-testid="cost-log-panel">
      <!-- Collapsed pill -->
      <button
        v-if="store.isCollapsed"
        class="cost-log__pill"
        @click="store.toggleCollapsed()"
      >
        <span class="cost-log__pill-cost">{{ formatCost(store.totalCost) }}</span>
        <span class="cost-log__pill-sep">&middot;</span>
        <span class="cost-log__pill-count">{{ store.entryCount }} appel{{ store.entryCount > 1 ? 's' : '' }}</span>
        <span class="cost-log__pill-arrow">&blacktriangle;</span>
      </button>

      <!-- Expanded panel -->
      <div v-else class="cost-log__panel">
        <div class="cost-log__header">
          <span class="cost-log__title">Co&ucirc;ts API</span>
          <span class="cost-log__total">{{ formatCost(store.totalCost) }}</span>
          <button class="cost-log__clear" @click="store.clearAll()">Effacer</button>
          <button class="cost-log__collapse" @click="store.toggleCollapsed()">&blacktriangledown;</button>
        </div>
        <div v-if="costStatus" class="cost-log__budget" :class="{ 'cost-log__budget--warn': budgetRatio(costStatus) > 0.8 }">
          <span class="cost-log__budget-label">
            DataForSEO
            <span v-if="costStatus.sandbox" class="cost-log__budget-sandbox">SANDBOX</span>
            <span v-else class="cost-log__budget-prod">PROD</span>
          </span>
          <span class="cost-log__budget-value">
            {{ formatCost(costStatus.spentUsd) }} / {{ formatCost(costStatus.budgetUsd) }}
            <span class="cost-log__budget-window">({{ costStatus.windowMin }}min)</span>
          </span>
          <div class="cost-log__budget-bar">
            <div class="cost-log__budget-bar-fill" :style="{ width: (budgetRatio(costStatus) * 100) + '%' }"></div>
          </div>
        </div>

        <div class="cost-log__list">
          <TransitionGroup name="cost-entry">
            <div
              v-for="entry in store.entries"
              :key="entry.id"
              class="cost-log__entry"
              :class="`cost-log__entry--${entry.level}`"
            >
              <template v-if="entry.level === 'api'">
                <div class="cost-log__entry-top">
                  <span class="cost-log__entry-label">{{ entry.label }}</span>
                  <span class="cost-log__entry-cost">{{ formatCost(entry.estimatedCost) }}</span>
                </div>
                <div class="cost-log__entry-bottom">
                  <span class="cost-log__entry-model">{{ shortModel(entry.model) }}</span>
                  <span class="cost-log__entry-tokens">
                    {{ formatTokens(entry.inputTokens) }}&rarr;{{ formatTokens(entry.outputTokens) }}
                  </span>
                  <span class="cost-log__entry-time">{{ formatTime(entry.timestamp) }}</span>
                  <button
                    class="cost-log__entry-close"
                    aria-label="Supprimer"
                    @click="store.removeEntry(entry.id)"
                  >&times;</button>
                </div>
              </template>
              <template v-else-if="entry.level === 'db'">
                <div class="cost-log__entry-top">
                  <span class="cost-log__entry-icon cost-log__entry-icon--db" v-html="dbSymbol(entry.operation)" :aria-hidden="true"></span>
                  <span class="cost-log__entry-label">{{ entry.label }}</span>
                  <span class="cost-log__entry-db-table">{{ entry.table }}</span>
                </div>
                <div class="cost-log__entry-bottom">
                  <span class="cost-log__entry-db-op">{{ entry.operation }} ({{ entry.rowCount }} row{{ entry.rowCount > 1 ? 's' : '' }})</span>
                  <span class="cost-log__entry-tokens">{{ entry.ms }}ms</span>
                  <span class="cost-log__entry-time">{{ formatTime(entry.timestamp) }}</span>
                  <button
                    class="cost-log__entry-close"
                    aria-label="Supprimer"
                    @click="store.removeEntry(entry.id)"
                  >&times;</button>
                </div>
              </template>
              <template v-else>
                <div class="cost-log__entry-top">
                  <span class="cost-log__entry-icon" :aria-hidden="true">{{ iconFor(entry.level) }}</span>
                  <span class="cost-log__entry-label">{{ entry.label }}</span>
                  <button
                    class="cost-log__entry-close"
                    aria-label="Supprimer"
                    @click="store.removeEntry(entry.id)"
                  >&times;</button>
                </div>
                <div v-if="entry.detail" class="cost-log__entry-detail">{{ entry.detail }}</div>
                <div class="cost-log__entry-bottom cost-log__entry-bottom--msg">
                  <span class="cost-log__entry-time">{{ formatTime(entry.timestamp) }}</span>
                </div>
              </template>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cost-log {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  z-index: 9998;
  font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
}

/* --- Pill (collapsed) --- */
.cost-log__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
  color: var(--color-text-muted, #64748b);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.cost-log__pill:hover {
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.15);
}

.cost-log__pill-cost {
  font-weight: 600;
  color: var(--color-success, #15803d);
}

.cost-log__pill-sep {
  color: var(--color-border, #e2e8f0);
}

.cost-log__pill-arrow {
  font-size: 0.5rem;
  margin-left: 0.125rem;
}

/* --- Panel (expanded) --- */
.cost-log__panel {
  width: 320px;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.cost-log__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-background, #ffffff);
}

.cost-log__title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}

.cost-log__total {
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  color: var(--color-success, #15803d);
  margin-right: auto;
}

.cost-log__clear {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #64748b);
  background: none;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 4px;
  padding: 0.125rem 0.375rem;
  cursor: pointer;
  transition: color 0.15s;
}

.cost-log__clear:hover {
  color: var(--color-error, #b91c1c);
  border-color: var(--color-error, #b91c1c);
}

.cost-log__collapse {
  background: none;
  border: none;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  font-size: 0.625rem;
  padding: 0.125rem;
  line-height: 1;
}

/* --- Entry list --- */
.cost-log__list {
  overflow-y: auto;
  flex: 1;
  padding: 0.375rem;
}

.cost-log__entry {
  padding: 0.5rem 0.625rem;
  border-radius: 6px;
  background: var(--color-background, #ffffff);
  margin-bottom: 0.25rem;
  border: 1px solid transparent;
  transition: border-color 0.15s;
}

.cost-log__entry:hover {
  border-color: var(--color-border, #e2e8f0);
}

.cost-log__entry--info {
  border-left: 3px solid var(--color-primary, #3b82f6);
}

.cost-log__entry--warning {
  border-left: 3px solid var(--color-warning, #f59e0b);
}

.cost-log__entry--error {
  border-left: 3px solid var(--color-error, #dc2626);
}

.cost-log__entry-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 0.625rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  color: white;
  flex-shrink: 0;
  margin-right: 0.375rem;
}

.cost-log__entry--info .cost-log__entry-icon { background: var(--color-primary, #3b82f6); }
.cost-log__entry--warning .cost-log__entry-icon { background: var(--color-warning, #f59e0b); }
.cost-log__entry--error .cost-log__entry-icon { background: var(--color-error, #dc2626); }
.cost-log__budget {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-background, #ffffff);
  font-family: var(--font-mono, monospace);
  font-size: 0.6875rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.125rem 0.5rem;
}
.cost-log__budget--warn { background: #fef3c7; }
.cost-log__budget-label {
  color: var(--color-text-muted, #64748b);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.cost-log__budget-sandbox { font-size: 0.5625rem; background: #dbeafe; color: #1e40af; padding: 1px 4px; border-radius: 3px; }
.cost-log__budget-prod { font-size: 0.5625rem; background: #fee2e2; color: #991b1b; padding: 1px 4px; border-radius: 3px; }
.cost-log__budget-value { color: var(--color-text, #1e293b); font-weight: 600; text-align: right; }
.cost-log__budget-window { color: var(--color-text-muted, #64748b); font-weight: 400; }
.cost-log__budget-bar {
  grid-column: 1 / -1;
  height: 3px;
  background: var(--color-border, #e2e8f0);
  border-radius: 2px;
  overflow: hidden;
}
.cost-log__budget-bar-fill {
  height: 100%;
  background: #8b5cf6;
  transition: width 0.3s ease;
}
.cost-log__budget--warn .cost-log__budget-bar-fill { background: #f59e0b; }
.cost-log__entry--db { border-left: 3px solid #8b5cf6; }
.cost-log__entry-icon--db { background: #8b5cf6; }
.cost-log__entry-db-table {
  font-size: 0.625rem;
  font-family: var(--font-mono, monospace);
  color: #8b5cf6;
  font-weight: 600;
  margin-left: auto;
}
.cost-log__entry-db-op {
  font-size: 0.625rem;
  font-family: var(--font-mono, monospace);
  color: var(--color-text-muted, #64748b);
}

.cost-log__entry-detail {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #64748b);
  margin: 0.25rem 0 0.25rem 22px;
  line-height: 1.4;
}

.cost-log__entry-bottom--msg {
  justify-content: flex-end;
  margin-top: 0.125rem;
}

.cost-log__entry-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.cost-log__entry-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.cost-log__entry-cost {
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  color: var(--color-success, #15803d);
  flex-shrink: 0;
}

.cost-log__entry-bottom {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.625rem;
  font-family: var(--font-mono, monospace);
  color: var(--color-text-muted, #64748b);
}

.cost-log__entry-model {
  font-weight: 500;
}

.cost-log__entry-tokens {
  white-space: nowrap;
}

.cost-log__entry-time {
  margin-left: auto;
}

.cost-log__entry-close {
  background: none;
  border: none;
  color: var(--color-text-muted, #64748b);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 0.15s, color 0.15s;
}

.cost-log__entry-close:hover {
  opacity: 1;
  color: var(--color-error, #b91c1c);
}

/* --- Transitions --- */
.cost-entry-enter-active {
  transition: all 0.25s ease;
}

.cost-entry-leave-active {
  transition: all 0.2s ease;
}

.cost-entry-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.cost-entry-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.cost-entry-move {
  transition: transform 0.25s ease;
}
</style>
