<script setup lang="ts">
import { computed } from 'vue'
import type { KeywordDensity } from '@shared/types/seo.types.js'
import ProgressBar from '@/components/shared/ProgressBar.vue'

const props = defineProps<{
  densities: KeywordDensity[]
  hasArticleKeywords?: boolean
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

function densityTooltip(d: KeywordDensity): string {
  const methodLabel = d.matchMethod === 'exact' ? 'exacte' : d.matchMethod === 'semantic' ? 'sémantique' : 'partielle'
  return `Densité : ${d.density}% (cible : ${d.target.min}%–${d.target.max}%). Détection ${methodLabel}. ${d.occurrences} occurrence(s) trouvée(s).`
}

const pilier = computed(() => props.densities.filter(d => d.type === 'Pilier'))
const moyenne = computed(() => props.densities.filter(d => d.type === 'Moyenne traine'))
const longue = computed(() => props.densities.filter(d => d.type === 'Longue traine'))
</script>

<template>
  <div class="keyword-density">
    <div v-if="hasArticleKeywords === false" class="density-warning">
      Aucun mot-cl&eacute; article d&eacute;fini &mdash; la densit&eacute; ne peut pas &ecirc;tre calcul&eacute;e.
    </div>
    <template v-for="(group, groupLabel) in { 'Pilier': pilier, 'Moyenne traîne': moyenne, 'Longue traîne': longue }" :key="groupLabel">
      <div v-if="group.length > 0" class="density-group">
        <h4 class="group-label">{{ groupLabel }}</h4>
        <div v-for="d in group" :key="d.keyword" class="density-item" :title="densityTooltip(d)">
          <div class="density-header">
            <span class="keyword-name">{{ d.keyword }}</span>
            <span class="density-value" :class="{ 'in-target': d.inTarget, 'out-target': !d.inTarget }">
              {{ d.density }}% <span class="density-target">({{ d.target.min }}–{{ d.target.max }}%)</span>
            </span>
          </div>
          <ProgressBar :percent="densityPercent(d)" :color="densityColor(d)" />
          <span class="occurrence-count">
            {{ d.occurrences }} occurrence{{ d.occurrences !== 1 ? 's' : '' }}
            <span v-if="d.matchMethod !== 'exact' && d.matchMethod !== 'none'" class="match-indicator">({{ d.matchMethod === 'semantic' ? 'sémantique' : 'partiel' }})</span>
          </span>
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

.density-warning {
  font-size: 0.75rem;
  color: var(--color-warning-text, #92400e);
  background: var(--color-warning-bg, #fffbeb);
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
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

.match-indicator {
  font-style: italic;
  color: var(--color-badge-blue-text, #2563eb);
}
</style>
