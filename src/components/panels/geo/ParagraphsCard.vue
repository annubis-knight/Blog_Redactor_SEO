<script setup lang="ts">
import { computed } from 'vue'
import type { GeoScore } from '@shared/types/geo.types.js'
import IndicatorCard from '../indicators/IndicatorCard.vue'
import ParagraphAlerts from '../ParagraphAlerts.vue'

const props = defineProps<{
  score: GeoScore | null
  isOpen: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const alertCount = computed(() => props.score?.paragraphAlerts.length ?? 0)

const miniScore = computed(() => {
  if (!props.score) return null
  const count = props.score.paragraphAlerts.length
  return count === 0 ? 100 : Math.max(0, 100 - count * 15)
})
</script>

<template>
  <IndicatorCard
    title="Paragraphes"
    icon="📝"
    tooltip="Paragraphes dépassant 80 mots — cible : 0 alerte"
    :score="miniScore"
    :alert-count="alertCount"
    :is-open="isOpen"
    @toggle="emit('toggle')"
  >
    <div v-if="score">
      <ParagraphAlerts :alerts="score.paragraphAlerts" />
    </div>
    <span v-else class="ind-na">N/A</span>
  </IndicatorCard>
</template>

<style scoped>
@import '../indicators/indicators-shared.css';
</style>
