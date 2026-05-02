<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'regen' | 'ghost'
  loading?: boolean
  disabled?: boolean
  label?: string
  loadingLabel?: string
}>(), {
  variant: 'primary',
  loading: false,
  disabled: false,
  label: "Analyser avec l'IA",
  loadingLabel: 'Analyse en cours…',
})

defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <button
    type="button"
    class="aip-cta"
    :class="`aip-cta--${variant}`"
    :disabled="disabled || loading"
    :data-testid="`ai-trigger-${variant}`"
    @click="$emit('click')"
  >
    <span class="aip-cta__icon" aria-hidden="true">
      <svg v-if="!loading && variant !== 'regen'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
      <svg v-else-if="!loading && variant === 'regen'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
      <span v-else class="aip-cta__spinner" />
    </span>
    <span class="aip-cta__label">{{ loading ? loadingLabel : label }}</span>
  </button>
</template>

<style scoped>
.aip-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.aip-cta:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.aip-cta--primary {
  background: var(--color-badge-purple-text);
  color: #fff;
}
.aip-cta--primary:hover:not(:disabled) {
  background: #6d28d9;
}
.aip-cta--regen {
  background: var(--color-background);
  color: var(--color-badge-purple-text);
  border-color: var(--color-badge-purple-text);
}
.aip-cta--regen:hover:not(:disabled) {
  background: var(--color-badge-purple-bg);
}
.aip-cta--ghost {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}
.aip-cta--ghost:hover:not(:disabled) {
  background: var(--color-bg-hover);
}
.aip-cta__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.aip-cta__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: aip-spin 0.7s linear infinite;
}
@keyframes aip-spin {
  to { transform: rotate(360deg); }
}
</style>
