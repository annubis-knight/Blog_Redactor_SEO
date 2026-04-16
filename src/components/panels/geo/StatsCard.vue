<script setup lang="ts">
import { computed } from 'vue'
import type { GeoScore } from '@shared/types/geo.types.js'
import IndicatorCard from '../indicators/IndicatorCard.vue'

const props = defineProps<{
  score: GeoScore | null
  isOpen: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const miniScore = computed(() => props.score?.factors.sourcedStatsScore ?? null)
</script>

<template>
  <IndicatorCard
    title="Stats sourcées"
    icon="📊"
    tooltip="Nombre de statistiques avec source citée — cible ≥3"
    :score="miniScore"
    :is-open="isOpen"
    @toggle="emit('toggle')"
  >
    <div v-if="score" class="stats-rows">
      <div class="ind-row">
        <span class="ind-row-label">Détectées</span>
        <span :class="score.sourcedStats.inTarget ? 'val-ok' : 'val-warn'">
          {{ score.sourcedStats.count }}
          <span class="target-hint">(cible ≥3)</span>
        </span>
      </div>
      <div class="ind-bar">
        <div
          class="ind-fill"
          :class="score.sourcedStats.inTarget ? 'fill-good' : score.sourcedStats.count > 0 ? 'fill-fair' : 'fill-poor'"
          :style="{ width: `${Math.min(100, (score.sourcedStats.count / 3) * 100)}%` }"
        />
      </div>
    </div>
    <span v-else class="ind-na">N/A</span>
  </IndicatorCard>
</template>

<style scoped>
@import '../indicators/indicators-shared.css';

.stats-rows {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.target-hint {
  font-size: 0.625rem;
  color: var(--color-text-muted, #6b7280);
  font-weight: 400;
}
</style>
