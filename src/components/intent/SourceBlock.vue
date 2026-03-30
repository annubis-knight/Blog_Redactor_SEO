<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  sourceName: string
  sourceState: 'ok' | 'loading' | 'error' | 'disabled'
  score: number
  summary: string
  expandable?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  retry: []
}>()

const expanded = ref(false)

function toggle() {
  if (props.expandable) expanded.value = !expanded.value
}

const stateIcon: Record<string, string> = {
  ok: '✅',
  loading: '◐',
  error: '✕',
  disabled: '─',
}
</script>

<template>
  <div class="source-block" :class="{ 'source-block--expandable': expandable, 'source-block--error': sourceState === 'error' }">
    <div class="source-block-header" @click="toggle">
      <span class="source-state" :class="`source-state--${sourceState}`">{{ stateIcon[sourceState] }}</span>
      <span class="source-name">{{ sourceName }}</span>
      <div class="source-score-bar" v-if="sourceState !== 'disabled'">
        <div class="source-score-track">
          <div class="source-score-fill" :style="{ width: `${Math.round(score * 100)}%` }" />
        </div>
        <span class="source-score-value">{{ score.toFixed(2) }}</span>
      </div>
      <span class="source-summary">{{ summary }}</span>
      <span v-if="expandable" class="source-chevron" :class="{ 'source-chevron--open': expanded }">▸</span>
    </div>

    <!-- Error state -->
    <div v-if="sourceState === 'error'" class="source-error">
      <span class="source-error-msg">{{ errorMessage || 'Erreur de chargement' }}</span>
      <button class="source-retry-btn" @click.stop="emit('retry')">Réessayer</button>
    </div>

    <!-- Expandable slot (Level 3) -->
    <div v-if="expandable && expanded" class="source-block-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.source-block {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.source-block:last-child {
  border-bottom: none;
}

.source-block-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.source-block--expandable .source-block-header {
  cursor: pointer;
}

.source-block--expandable .source-block-header:hover {
  background: var(--color-bg-hover, #f1f5f9);
  border-radius: 4px;
  margin: -0.125rem -0.25rem;
  padding: 0.125rem 0.25rem;
}

.source-state {
  font-size: 0.875rem;
  flex-shrink: 0;
  width: 1.25rem;
  text-align: center;
}

.source-state--loading {
  color: var(--color-warning, #d97706);
  animation: pulse 1s infinite;
}

.source-state--error {
  color: var(--color-error, #dc2626);
}

.source-state--disabled {
  color: var(--color-text-muted, #94a3b8);
}

.source-name {
  font-weight: 600;
  min-width: 6rem;
  color: var(--color-text, #1e293b);
}

.source-score-bar {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.source-score-track {
  width: 200px;
  max-width: 200px;
  height: 8px;
  background: var(--color-border, #e2e8f0);
  border-radius: 4px;
  overflow: hidden;
}

.source-score-fill {
  height: 100%;
  background: var(--color-primary, #3b82f6);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.source-score-value {
  font-size: 0.6875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-width: 2rem;
  color: var(--color-text, #1e293b);
}

.source-summary {
  font-size: 0.75rem;
  color: var(--color-text-muted, #64748b);
  flex: 1;
}

.source-chevron {
  font-size: 0.75rem;
  transition: transform 0.25s ease;
  color: var(--color-text-muted, #94a3b8);
}

.source-chevron--open {
  transform: rotate(90deg);
}

.source-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0 0 1.75rem;
}

.source-error-msg {
  font-size: 0.75rem;
  color: var(--color-error, #dc2626);
}

.source-retry-btn {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  background: var(--color-error, #dc2626);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.source-block-content {
  padding: 0.5rem 0 0.25rem 1.75rem;
  animation: expandContent 0.25s ease;
}

@keyframes expandContent {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 500px; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
