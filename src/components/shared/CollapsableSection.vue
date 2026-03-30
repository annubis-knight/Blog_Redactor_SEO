<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  defaultOpen?: boolean
}>(), {
  defaultOpen: true,
})

const isOpen = ref(props.defaultOpen)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <section class="collapsable-section">
    <button class="collapsable-header" :aria-expanded="isOpen" @click="toggle">
      <span class="collapsable-title">{{ title }}</span>
      <svg
        class="collapsable-icon"
        :class="{ open: isOpen }"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div class="collapsable-content" :class="{ collapsed: !isOpen }">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.collapsable-section {
  interpolate-size: allow-keywords;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 0.25rem;
}

.collapsable-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.625rem 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-heading);
  font-size: 0.9375rem;
  font-weight: 600;
  text-align: left;
  transition: color 0.15s;
}

.collapsable-header:hover {
  color: var(--color-primary);
}

.collapsable-title {
  flex: 1;
}

.collapsable-icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transition: transform 0.2s ease;
}

.collapsable-icon.open {
  transform: rotate(90deg);
}

.collapsable-content {
  height: auto;
  overflow: hidden;
  transition: height 0.25s ease, opacity 0.2s ease;
  opacity: 1;
}

.collapsable-content.collapsed {
  height: 0;
  opacity: 0;
}
</style>
