<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  cible: string | null
  douleur: string | null
  angle: string | null
  promesse: string | null
  cta: string | null
}>()

const isOpen = ref(false)

const fields = [
  { key: 'cible', label: 'Cible' },
  { key: 'douleur', label: 'Douleur' },
  { key: 'angle', label: 'Angle' },
  { key: 'promesse', label: 'Promesse' },
  { key: 'cta', label: 'CTA' },
] as const

const visibleFields = () =>
  fields.filter(f => props[f.key])
</script>

<template>
  <div class="strategy-context">
    <button
      class="strategy-context-toggle"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <svg
        class="strategy-context-chevron"
        :class="{ 'strategy-context-chevron--open': isOpen }"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <span class="strategy-context-title">Contexte stratégique</span>
    </button>

    <div v-if="isOpen" class="strategy-context-body">
      <dl class="strategy-context-list">
        <template v-for="field in visibleFields()" :key="field.key">
          <dt class="strategy-context-label">{{ field.label }}</dt>
          <dd class="strategy-context-value">{{ props[field.key] }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.strategy-context {
  margin-bottom: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  overflow: hidden;
}

.strategy-context-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-heading);
  text-align: left;
}

.strategy-context-toggle:hover {
  background: var(--color-hover);
}

.strategy-context-chevron {
  flex-shrink: 0;
  transition: transform 0.15s ease;
  color: var(--color-text-muted);
}

.strategy-context-chevron--open {
  transform: rotate(90deg);
}

.strategy-context-title {
  flex: 1;
}

.strategy-context-body {
  padding: 0 0.875rem 0.75rem;
}

.strategy-context-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.375rem 0.75rem;
  margin: 0;
}

.strategy-context-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.strategy-context-value {
  font-size: 0.8125rem;
  color: var(--color-text);
  margin: 0;
  line-height: 1.4;
}
</style>
