<script setup lang="ts">
import { useRecapPanel } from '@/composables/ui/useRecapRadioGroup'

const props = withDefaults(defineProps<{
  panelId: string
  label?: string
  variant?: 'recap' | 'panel'
}>(), {
  variant: 'recap',
})

const { isOpen, toggle } = useRecapPanel(props.panelId)
</script>

<template>
  <div class="recap-toggle-wrapper" :class="[`variant--${variant}`]">
    <button
      class="recap-toggle-btn"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <svg
        class="recap-toggle-chevron"
        :class="{ open: isOpen }"
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <slot name="header">
        <span class="recap-toggle-label">{{ label }}</span>
      </slot>
    </button>

    <slot name="between" />

    <div class="recap-toggle-body" :class="{ collapsed: !isOpen }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* --- Wrapper --- */
.recap-toggle-wrapper {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.variant--recap {
  background: var(--color-bg-soft);
}

.variant--panel {
  background: var(--color-surface);
  border-color: var(--color-primary);
}

/* --- Toggle button --- */
.recap-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: color 0.15s, background 0.15s;
}

.variant--recap .recap-toggle-btn {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.variant--recap .recap-toggle-btn:hover {
  color: var(--color-primary);
}

.variant--panel .recap-toggle-btn {
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: var(--color-primary-soft, rgba(74, 144, 217, 0.08));
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.variant--panel .recap-toggle-btn:hover {
  background: var(--color-primary-soft, rgba(74, 144, 217, 0.12));
}

/* --- Chevron --- */
.recap-toggle-chevron {
  flex-shrink: 0;
  transition: transform 0.2s ease;
  color: inherit;
}

.recap-toggle-chevron.open {
  transform: rotate(90deg);
}

/* --- Label --- */
.recap-toggle-label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex: 1;
}

.variant--panel .recap-toggle-label {
  text-transform: none;
  letter-spacing: normal;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- Collapsible body --- */
.recap-toggle-body {
  height: auto;
  overflow: hidden;
  transition: height 0.25s ease, opacity 0.2s ease;
  opacity: 1;
  padding: 0 0.75rem 0.625rem;
  interpolate-size: allow-keywords;
}

.variant--panel .recap-toggle-body {
  padding-bottom: 0.75rem;
}

.recap-toggle-body.collapsed {
  height: 0;
  opacity: 0;
  padding-bottom: 0;
}
</style>
