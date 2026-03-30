<script setup lang="ts">
import type { Cocoon } from '@shared/types/index.js'

const props = defineProps<{
  cocoons: Cocoon[]
}>()

function totalArticles(): number {
  return props.cocoons.reduce((sum, c) => sum + c.stats.totalArticles, 0)
}

function globalCompletion(): number {
  const total = totalArticles()
  if (total === 0) return 0
  const completed = props.cocoons.reduce(
    (sum, c) => sum + Math.round((c.stats.completionPercent / 100) * c.stats.totalArticles),
    0,
  )
  return Math.round((completed / total) * 100)
}
</script>

<template>
  <div class="cocoon-stats-bar">
    <div class="stat-item">
      <span class="stat-value">{{ cocoons.length }}</span>
      <span class="stat-label">Th\u00e9matiques</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">{{ totalArticles() }}</span>
      <span class="stat-label">Articles</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">{{ globalCompletion() }}%</span>
      <span class="stat-label">Progression</span>
    </div>
  </div>
</template>

<style scoped>
.cocoon-stats-bar {
  display: flex;
  gap: 2rem;
  padding: 1rem 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}
</style>
