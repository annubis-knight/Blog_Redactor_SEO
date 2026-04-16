<script setup lang="ts">
import { computed } from 'vue'
import type { GeoScore } from '@shared/types/geo.types.js'
import IndicatorCard from '../indicators/IndicatorCard.vue'

const props = defineProps<{
  score: GeoScore | null
  isOpen: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const miniScore = computed(() => props.score?.factors.answerCapsulesScore ?? null)

const summary = computed(() => {
  if (!props.score) return ''
  const capsules = props.score.answerCapsules
  if (capsules.length === 0) return ''
  const present = capsules.filter(c => c.hasAnswerCapsule).length
  return `${present}/${capsules.length}`
})
</script>

<template>
  <IndicatorCard
    title="Answer Capsules"
    icon="💊"
    tooltip="Chaque section H2 doit commencer par une réponse directe et concise (≤50 mots)"
    :score="miniScore"
    :is-open="isOpen"
    @toggle="emit('toggle')"
  >
    <div v-if="score" class="capsules-content">
      <div v-if="score.answerCapsules.length === 0" class="ind-na">
        Aucun H2 détecté
      </div>
      <template v-else>
        <div class="capsule-summary ind-row">
          <span class="ind-row-label">Capsules détectées</span>
          <span class="ind-row-value">{{ summary }}</span>
        </div>
        <div
          v-for="(capsule, i) in score.answerCapsules"
          :key="i"
          class="capsule-item"
          :class="{ present: capsule.hasAnswerCapsule }"
        >
          <span class="capsule-icon">{{ capsule.hasAnswerCapsule ? '✓' : '✗' }}</span>
          <span class="capsule-heading">{{ capsule.heading }}</span>
        </div>
      </template>
    </div>
    <span v-else class="ind-na">N/A</span>
  </IndicatorCard>
</template>

<style scoped>
@import '../indicators/indicators-shared.css';

.capsules-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.capsule-summary {
  margin-bottom: 0.125rem;
}

.capsule-item {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  padding: 0.125rem 0;
  font-size: 0.75rem;
  color: var(--color-error, #b91c1c);
}

.capsule-item.present {
  color: var(--color-success, #15803d);
}

.capsule-icon {
  flex-shrink: 0;
  width: 1rem;
  text-align: center;
}

.capsule-heading {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
