<script setup lang="ts">
import { computed } from 'vue'
import type { GeoScore } from '@shared/types/geo.types.js'
import IndicatorCard from '../indicators/IndicatorCard.vue'
import JargonAlerts from '../JargonAlerts.vue'

const props = defineProps<{
  score: GeoScore | null
  isOpen: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const alertCount = computed(() => props.score?.jargonDetections.length ?? 0)

const miniScore = computed(() => {
  if (!props.score) return null
  const count = props.score.jargonDetections.length
  return count === 0 ? 100 : Math.max(0, 100 - count * 20)
})
</script>

<template>
  <IndicatorCard
    title="Jargon"
    icon="🗣️"
    tooltip="Termes techniques détectés — cible : 0 détection"
    :score="miniScore"
    :alert-count="alertCount"
    :is-open="isOpen"
    @toggle="emit('toggle')"
  >
    <div v-if="score">
      <JargonAlerts :detections="score.jargonDetections" />
    </div>
    <span v-else class="ind-na">N/A</span>
  </IndicatorCard>
</template>

<style scoped>
@import '../indicators/indicators-shared.css';
</style>
