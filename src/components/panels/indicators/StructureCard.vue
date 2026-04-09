<script setup lang="ts">
import { computed } from 'vue'
import type { SeoScore } from '@shared/types/seo.types.js'
import IndicatorCard from './IndicatorCard.vue'

const props = defineProps<{
  score: SeoScore | null
  contentLengthTarget: number
  isOpen: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const miniScore = computed(() => {
  if (!props.score) return null
  return Math.round(
    (props.score.factors.headingScore + props.score.factors.contentLengthScore) / 2,
  )
})
</script>

<template>
  <IndicatorCard
    title="Structure"
    icon="🏗"
    tooltip="Analyse de la structure du contenu : hiérarchie Hn, longueur, lisibilité"
    :score="miniScore"
    :is-open="isOpen"
    @toggle="emit('toggle')"
  >
    <div v-if="score" class="structure-rows">
      <!-- Titres -->
      <div
        class="ind-row"
        :title="score.headingValidation.h1Count === 1
          ? `H1 unique — ${score.headingValidation.h2Count} H2, ${score.headingValidation.h3Count} H3`
          : score.headingValidation.h1Count === 0
            ? 'Aucun H1 trouvé — le titre principal est manquant'
            : `${score.headingValidation.h1Count} H1 trouvés — un seul est attendu`"
      >
        <span class="ind-row-label">Titres</span>
        <span class="ind-row-value">
          <span :class="score.headingValidation.h1Count === 1 ? 'val-ok' : 'val-error'">H1{{ score.headingValidation.h1Count === 1 ? '✓' : '✗' }}</span>
          · {{ score.headingValidation.h2Count }} H2
          · {{ score.headingValidation.h3Count }} H3
        </span>
      </div>

      <!-- Paragraphes -->
      <div class="ind-row" title="Nombre de paragraphes dans l'article">
        <span class="ind-row-label">Paragraphes</span>
        <span class="ind-row-value">{{ score.paragraphCount }}</span>
      </div>

      <!-- Mots -->
      <div
        class="ind-row"
        :title="`Objectif : ${contentLengthTarget} mots (basé sur le type d'article)`"
      >
        <span class="ind-row-label">Mots</span>
        <span class="ind-row-value">{{ score.wordCount }} / {{ contentLengthTarget }}</span>
      </div>

      <!-- Lecture -->
      <div class="ind-row" title="Temps de lecture estimé à 200 mots/min">
        <span class="ind-row-label">Lecture</span>
        <span class="ind-row-value">{{ score.readingTimeMinutes < 1 ? '< 1 min' : `~${score.readingTimeMinutes} min` }}</span>
      </div>
    </div>
    <span v-else class="ind-na">N/A</span>
  </IndicatorCard>
</template>

<style scoped>
@import './indicators-shared.css';

.structure-rows {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
