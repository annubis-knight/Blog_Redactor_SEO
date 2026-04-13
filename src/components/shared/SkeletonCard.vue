<script setup lang="ts">
withDefaults(defineProps<{
  width?: string
  height?: string
}>(), {
  width: '100%',
  height: '160px',
})
</script>

<template>
  <div class="skeleton-card" :style="{ width, height }" aria-hidden="true">
    <div class="skeleton-card-header" />
    <div class="skeleton-card-body">
      <div class="skeleton-line" style="width: 100%" />
      <div class="skeleton-line" style="width: 85%" />
      <div class="skeleton-line" style="width: 60%" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.skeleton-card-header {
  height: 40%;
  background: var(--color-bg-soft);
  position: relative;
  overflow: hidden;
}

.skeleton-card-header::after {
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

.skeleton-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
}

.skeleton-line {
  height: 0.75rem;
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
