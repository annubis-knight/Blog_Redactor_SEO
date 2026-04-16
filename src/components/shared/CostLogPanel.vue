<script setup lang="ts">
import { useCostLogStore } from '@/stores/ui/cost-log.store'

const store = useCostLogStore()

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
</script>

<template>
  <Teleport to="body">
    <div v-if="store.entryCount > 0" class="cost-log" data-testid="cost-log-panel">
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

        <div class="cost-log__list">
          <TransitionGroup name="cost-entry">
            <div
              v-for="entry in store.entries"
              :key="entry.id"
              class="cost-log__entry"
            >
              <div class="cost-log__entry-top">
                <span class="cost-log__entry-label">{{ entry.actionLabel }}</span>
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
