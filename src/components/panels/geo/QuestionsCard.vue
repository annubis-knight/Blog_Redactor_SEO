<script setup lang="ts">
import { computed } from 'vue'
import type { GeoScore } from '@shared/types/geo.types.js'
import IndicatorCard from '../indicators/IndicatorCard.vue'

const props = defineProps<{
  score: GeoScore | null
  isOpen: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const miniScore = computed(() => props.score?.factors.questionHeadingsScore ?? null)
</script>

<template>
  <IndicatorCard
    title="Questions H2/H3"
    icon="❓"
    tooltip="Pourcentage de titres H2/H3 formulés en question — cible 70%"
    :score="miniScore"
    :is-open="isOpen"
    @toggle="emit('toggle')"
  >
    <div v-if="score" class="questions-rows">
      <div class="ind-row">
        <span class="ind-row-label">H2/H3 en question</span>
        <span class="ind-row-value">
          {{ score.questionHeadings.questionCount }}/{{ score.questionHeadings.totalH2H3 }}
        </span>
      </div>
      <div class="ind-row">
        <span class="ind-row-label">Pourcentage</span>
        <span :class="score.questionHeadings.percentage >= 70 ? 'val-ok' : 'val-warn'">
          {{ score.questionHeadings.percentage }}%
          <span class="target-hint">(cible 70%)</span>
        </span>
      </div>
      <div class="ind-bar">
        <div
          class="ind-fill"
          :class="score.questionHeadings.percentage >= 70 ? 'fill-good' : score.questionHeadings.percentage >= 40 ? 'fill-fair' : 'fill-poor'"
          :style="{ width: `${Math.min(100, score.questionHeadings.percentage)}%` }"
        />
      </div>
    </div>
    <span v-else class="ind-na">N/A</span>
  </IndicatorCard>
</template>

<style scoped>
@import '../indicators/indicators-shared.css';

.questions-rows {
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
