<script setup lang="ts">
withDefaults(defineProps<{
  loading: boolean
  lines?: number
}>(), {
  lines: 3,
})
</script>

<template>
  <div class="skeleton-loader">
    <div v-if="loading" class="skeleton-lines" role="status" aria-label="Chargement...">
      <div
        v-for="i in lines"
        :key="i"
        class="skeleton-line"
        :style="{ width: i === lines ? '60%' : '100%' }"
      />
    </div>
    <slot v-else />
  </div>
</template>

<style scoped>
.skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.5rem 0;
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

<!-- Global keyframes shared by all skeleton components -->
<style>
@keyframes skeleton-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
