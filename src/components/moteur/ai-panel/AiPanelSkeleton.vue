<script setup lang="ts">
withDefaults(defineProps<{ lines?: number }>(), { lines: 4 })
</script>

<template>
  <div class="aip-skeleton" data-testid="ai-panel-skeleton" role="status" aria-label="Chargement IA">
    <div v-for="n in lines" :key="n" class="aip-skeleton__line" :style="{ width: `${100 - (n * 7) % 30}%` }" />
  </div>
</template>

<style scoped>
.aip-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}
.aip-skeleton__line {
  height: 0.875rem;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--color-bg-hover) 0%, var(--color-border) 50%, var(--color-bg-hover) 100%);
  background-size: 200% 100%;
  animation: aip-shimmer 1.5s ease-in-out infinite;
}
@keyframes aip-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
