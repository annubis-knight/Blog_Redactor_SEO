<script setup lang="ts">
defineProps<{
  currentKeyword: string
  currentIndex: number
  count: number
}>()

defineEmits<{
  'prev': []
  'next': []
}>()
</script>

<template>
  <div class="carousel-nav" data-testid="carousel-nav">
    <button
      type="button"
      class="carousel-arrow"
      :disabled="currentIndex === 0"
      data-testid="carousel-prev"
      @click.prevent="$emit('prev')"
    >
      &larr;
    </button>
    <div class="carousel-info">
      <span class="carousel-keyword">{{ currentKeyword }}</span>
      <span class="carousel-counter">({{ currentIndex + 1 }}/{{ count }})</span>
    </div>
    <button
      type="button"
      class="carousel-arrow"
      :disabled="currentIndex === count - 1"
      data-testid="carousel-next"
      @click.prevent="$emit('next')"
    >
      &rarr;
    </button>
  </div>
</template>

<style scoped>
.carousel-nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: var(--color-surface, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.carousel-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  background: #fff;
  font-size: 1rem;
  cursor: pointer;
  color: var(--color-text, #1e293b);
  flex-shrink: 0;
  transition: border-color 0.15s;
}

.carousel-arrow:hover:not(:disabled) {
  border-color: var(--color-primary, #3b82f6);
}

.carousel-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.carousel-info {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.carousel-keyword {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-text, #1e293b);
}

.carousel-counter {
  margin-left: 0.375rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
}
</style>
