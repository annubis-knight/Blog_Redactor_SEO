<script setup lang="ts">
import type { Cocoon } from '@shared/types/index.js'
import ProgressBar from '@/components/shared/ProgressBar.vue'

defineProps<{
  cocoon: Cocoon
}>()
</script>

<template>
  <RouterLink :to="`/cocoon/${cocoon.id}`" class="cocoon-card">
    <h3 class="cocoon-name">{{ cocoon.name }}</h3>

    <div class="cocoon-stats">
      <span class="stat">{{ cocoon.stats.totalArticles }} articles</span>
      <span class="stat-separator">|</span>
      <span class="stat type-pilier">{{ cocoon.stats.byType.pilier }} Pilier</span>
      <span class="stat type-inter">{{ cocoon.stats.byType.intermediaire }} Inter.</span>
      <span class="stat type-spec">{{ cocoon.stats.byType.specialise }} Spéc.</span>
    </div>

    <div class="cocoon-progress">
      <ProgressBar
        :percent="cocoon.stats.completionPercent"
        :color="cocoon.stats.completionPercent === 100 ? 'var(--color-success)' : 'var(--color-primary)'"
      />
      <span class="progress-label">{{ cocoon.stats.completionPercent }}% complété</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.cocoon-card {
  display: block;
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.cocoon-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
  text-decoration: none;
}

.cocoon-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: var(--color-text);
}

.cocoon-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.stat-separator {
  color: var(--color-border);
}

.cocoon-progress {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.progress-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
