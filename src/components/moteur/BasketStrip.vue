<script setup lang="ts">
import type { BasketKeyword } from '@/stores/article/moteur-basket.store'

defineProps<{
  keywords: BasketKeyword[]
}>()

const emit = defineEmits<{
  remove: [keyword: string]
  clear: []
}>()
</script>

<template>
  <div class="basket-strip">
    <span class="basket-label">Panier ({{ keywords.length }})</span>
    <div class="basket-chips">
      <span
        v-for="kw in keywords"
        :key="kw.keyword"
        class="basket-chip"
        :class="{ 'basket-chip--validated': kw.validated }"
        :title="kw.reasoning || kw.source"
      >
        {{ kw.keyword }}
        <button class="basket-chip-remove" @click.stop="emit('remove', kw.keyword)">&times;</button>
      </span>
    </div>
    <button class="basket-clear" @click="emit('clear')">Vider</button>
  </div>
</template>

<style scoped>
.basket-strip {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.basket-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.basket-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
}

.basket-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.5rem;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--color-text);
  white-space: nowrap;
  transition: all 0.15s;
}

.basket-chip--validated {
  border-color: var(--color-success);
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.basket-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  border-radius: 50%;
  opacity: 0.4;
  transition: opacity 0.15s;
}

.basket-chip-remove:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.06);
}

.basket-clear {
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
}

.basket-clear:hover {
  border-color: var(--color-error);
  color: var(--color-error);
}
</style>
