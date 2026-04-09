<script setup lang="ts">
import { computed } from 'vue'
import type { SeoScore } from '@shared/types/seo.types.js'
import { META_TITLE_LENGTH, META_DESCRIPTION_LENGTH } from '@shared/constants/seo.constants.js'
import IndicatorCard from './IndicatorCard.vue'

const props = defineProps<{
  score: SeoScore | null
  metaTitle?: string | null
  metaDescription?: string | null
  isOpen: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const miniScore = computed(() => {
  if (!props.score) return null
  return Math.round(
    (props.score.factors.metaTitleScore + props.score.factors.metaDescriptionScore) / 2,
  )
})

function lengthPercent(length: number, range: { min: number; max: number }): number {
  if (length === 0) return 0
  return Math.min(100, (length / range.max) * 100)
}

function lengthBarClass(length: number, range: { min: number; max: number }): string {
  if (length >= range.min && length <= range.max) return 'fill-good'
  if (length < range.min) return 'fill-fair'
  return 'fill-over'
}
</script>

<template>
  <IndicatorCard
    title="Meta"
    icon="🏷"
    tooltip="Analyse des balises meta title et meta description"
    :score="miniScore"
    :is-open="isOpen"
    @toggle="emit('toggle')"
  >
    <div v-if="score" class="meta-rows">
      <!-- Meta Title -->
      <div class="meta-block" :title="`Longueur optimale : ${META_TITLE_LENGTH.min}–${META_TITLE_LENGTH.max} caractères. Le capitaine doit y figurer.`">
        <div class="meta-header">
          <span class="meta-label">Title</span>
          <span
            class="meta-length"
            :class="score.metaAnalysis.titleInRange ? 'val-ok' : score.metaAnalysis.titleLength > META_TITLE_LENGTH.max ? 'val-error' : 'val-warn'"
          >
            {{ score.metaAnalysis.titleLength }} / {{ META_TITLE_LENGTH.max }}
          </span>
        </div>
        <div class="ind-bar-3">
          <div
            class="ind-fill"
            :class="lengthBarClass(score.metaAnalysis.titleLength, META_TITLE_LENGTH)"
            :style="{ width: `${lengthPercent(score.metaAnalysis.titleLength, META_TITLE_LENGTH)}%` }"
          />
        </div>
        <div class="meta-details">
          <span class="meta-range">{{ META_TITLE_LENGTH.min }}–{{ META_TITLE_LENGTH.max }} car.</span>
          <span
            class="meta-kw"
            :class="score.metaAnalysis.titleHasKeyword ? 'val-ok' : 'val-warn'"
            :title="score.metaAnalysis.titleHasKeyword ? 'Capitaine détecté dans le title' : 'Capitaine absent du title'"
          >
            Capitaine {{ score.metaAnalysis.titleHasKeyword ? '✓' : '✗' }}
          </span>
        </div>
        <div v-if="metaTitle" class="meta-preview" :title="metaTitle">{{ metaTitle }}</div>
        <div v-else-if="score.metaAnalysis.titleLength === 0" class="meta-empty">Non défini</div>
      </div>

      <!-- Meta Description -->
      <div class="meta-block" :title="`Longueur optimale : ${META_DESCRIPTION_LENGTH.min}–${META_DESCRIPTION_LENGTH.max} caractères. Le capitaine doit y figurer.`">
        <div class="meta-header">
          <span class="meta-label">Description</span>
          <span
            class="meta-length"
            :class="score.metaAnalysis.descriptionInRange ? 'val-ok' : score.metaAnalysis.descriptionLength > META_DESCRIPTION_LENGTH.max ? 'val-error' : 'val-warn'"
          >
            {{ score.metaAnalysis.descriptionLength }} / {{ META_DESCRIPTION_LENGTH.max }}
          </span>
        </div>
        <div class="ind-bar-3">
          <div
            class="ind-fill"
            :class="lengthBarClass(score.metaAnalysis.descriptionLength, META_DESCRIPTION_LENGTH)"
            :style="{ width: `${lengthPercent(score.metaAnalysis.descriptionLength, META_DESCRIPTION_LENGTH)}%` }"
          />
        </div>
        <div class="meta-details">
          <span class="meta-range">{{ META_DESCRIPTION_LENGTH.min }}–{{ META_DESCRIPTION_LENGTH.max }} car.</span>
          <span
            class="meta-kw"
            :class="score.metaAnalysis.descriptionHasKeyword ? 'val-ok' : 'val-warn'"
            :title="score.metaAnalysis.descriptionHasKeyword ? 'Capitaine détecté dans la description' : 'Capitaine absent de la description'"
          >
            Capitaine {{ score.metaAnalysis.descriptionHasKeyword ? '✓' : '✗' }}
          </span>
        </div>
        <div v-if="metaDescription" class="meta-preview" :title="metaDescription">{{ metaDescription }}</div>
        <div v-else-if="score.metaAnalysis.descriptionLength === 0" class="meta-empty">Non défini</div>
      </div>
    </div>
    <span v-else class="ind-na">N/A</span>
  </IndicatorCard>
</template>

<style scoped>
@import './indicators-shared.css';

.meta-rows {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.meta-block {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.meta-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-label {
  font-weight: 600;
  color: var(--color-text, #1f2937);
}

.meta-length {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.meta-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
}

.meta-range {
  font-size: 0.625rem;
  color: var(--color-text-muted, #6b7280);
}

.meta-kw {
  font-weight: 600;
}

.meta-preview {
  font-size: 0.625rem;
  color: var(--color-text-muted, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.125rem;
  font-style: italic;
}

.meta-empty {
  font-size: 0.625rem;
  color: var(--color-text-muted, #6b7280);
  font-style: italic;
  margin-top: 0.125rem;
}
</style>
