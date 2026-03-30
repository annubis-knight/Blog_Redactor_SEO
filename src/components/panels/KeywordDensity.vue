<script setup lang="ts">
import { computed } from 'vue'
import type { KeywordDensity } from '@shared/types/seo.types.js'
import ProgressBar from '@/components/shared/ProgressBar.vue'

const props = defineProps<{
  densities: KeywordDensity[]
}>()

function densityColor(d: KeywordDensity): string {
  if (d.inTarget) return 'var(--color-score-good-arc)'
  if (d.density < d.target.min) return 'var(--color-score-fair-arc)'
  return 'var(--color-score-poor-arc)'
}

function densityPercent(d: KeywordDensity): number {
  if (d.target.max === 0) return 0
  return Math.min(100, (d.density / d.target.max) * 100)
}

const pilier = computed(() => props.densities.filter(d => d.type === 'Pilier'))
const moyenne = computed(() => props.densities.filter(d => d.type === 'Moyenne traine'))
const longue = computed(() => props.densities.filter(d => d.type === 'Longue traine'))
</script>

<template>
  <div class="keyword-density">
    <template v-for="(group, groupLabel) in { 'Pilier': pilier, 'Moyenne traîne': moyenne, 'Longue traîne': longue }" :key="groupLabel">
      <div v-if="group.length > 0" class="density-group">
        <h4 class="group-label">{{ groupLabel }}</h4>
        <div v-for="d in group" :key="d.keyword" class="density-item">
          <div class="density-header">
            <span class="keyword-name">{{ d.keyword }}</span>
            <span class="density-value" :class="{ 'in-target': d.inTarget, 'out-target': !d.inTarget }">
              {{ d.density }}% <span class="density-target">({{ d.target.min }}–{{ d.target.max }}%)</span>
            </span>
          </div>
          <ProgressBar :percent="densityPercent(d)" :color="densityColor(d)" />
          <span class="occurrence-count">{{ d.occurrences }} occurrence{{ d.occurrences !== 1 ? 's' : '' }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.keyword-density {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.group-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted, #6b7280);
  margin: 0 0 0.375rem;
}

.density-item {
  margin-bottom: 0.5rem;
}

.density-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
}

.keyword-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text, #1f2937);
}

.density-value {
  font-size: 0.75rem;
  font-weight: 600;
}

.in-target {
  color: var(--color-score-good);
}

.out-target {
  color: var(--color-score-fair);
}

.density-target {
  font-weight: 400;
  color: var(--color-text-muted, #6b7280);
}

.occurrence-count {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #6b7280);
}
</style>
