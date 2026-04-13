<script setup lang="ts">
withDefaults(defineProps<{
  lines?: number
  lastLineWidth?: string
}>(), {
  lines: 3,
  lastLineWidth: '60%',
})
</script>

<template>
  <div class="skeleton-text" role="status" aria-label="Chargement...">
    <div
      v-for="i in lines"
      :key="i"
      class="skeleton-line"
      :style="{ width: i === lines ? lastLineWidth : '100%' }"
    />
  </div>
</template>

<style scoped>
.skeleton-text {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.skeleton-line {
  height: 0.875rem;
  background: var(--color-bg-soft);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.skeleton-line::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--color-border) 50%,
    transparent 100%
  );
  animation: skeleton-shimmer 1.5s infinite;
}
</style>
