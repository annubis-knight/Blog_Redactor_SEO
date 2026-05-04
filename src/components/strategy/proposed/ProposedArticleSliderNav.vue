<script setup lang="ts">
import { IconArrow } from '@/components/shared/icons'

defineProps<{
  currentIndex: number
  total: number
}>()

defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
}>()
</script>

<template>
  <div v-if="total > 1" class="slider-nav" @click.stop>
    <button
      class="slider-arrow"
      :disabled="currentIndex <= 0"
      @click.stop="$emit('prev')"
    >
      <IconArrow direction="left" />
    </button>
    <span class="slider-counter">{{ currentIndex + 1 }}/{{ total }}</span>
    <button
      class="slider-arrow"
      :disabled="currentIndex >= total - 1"
      @click.stop="$emit('next')"
    >
      <IconArrow direction="right" />
    </button>
  </div>
</template>

<style scoped>
.slider-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
}

.slider-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 3px;
  padding: 0;
  flex-shrink: 0;
}

.slider-arrow:hover:not(:disabled) {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.slider-arrow:disabled {
  opacity: 0.25;
  cursor: default;
}

.slider-counter {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  min-width: 1.5rem;
  text-align: center;
}
</style>
