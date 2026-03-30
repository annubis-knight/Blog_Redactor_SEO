<script setup lang="ts">
defineProps<{
  level: 'capitaine' | 'lieutenant' | 'lexique'
  label: string
  removable?: boolean
}>()

defineEmits<{
  (e: 'remove'): void
}>()
</script>

<template>
  <span class="kw-badge" :class="level">
    {{ label }}
    <button v-if="removable" class="btn-remove" @click="$emit('remove')">&times;</button>
  </span>
</template>

<style scoped>
.kw-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.kw-badge.capitaine {
  background: var(--color-badge-blue-bg, #dbeafe);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.8125rem;
  border: 1px solid var(--color-primary);
}

.kw-badge.lieutenant {
  background: var(--color-badge-slate-bg, #e2e8f0);
  color: var(--color-secondary, #475569);
}

.kw-badge.lexique {
  background: var(--color-bg-soft);
  color: var(--color-text-muted);
  font-size: 0.6875rem;
}

.btn-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  color: inherit;
  opacity: 0.6;
  padding: 0;
}

.btn-remove:hover {
  opacity: 1;
}
</style>
