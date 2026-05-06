<script setup lang="ts">
import { ref } from 'vue'

interface BreakdownRow {
  label: string
  desc: string
  value: number
  weight: string
  rawLabel?: string
}

type RelevanceMissingReason = 'no-pain' | 'no-signals' | 'long-tail' | 'missing-paa' | 'missing-autocomplete' | null

defineProps<{
  displayedScore: number | null
  scoreColor: string
  scoreLabel: string
  breakdownRows: BreakdownRow[]
  hasScore: boolean
  relevanceMissingReason: RelevanceMissingReason
  circleRadius: number
  circleCircumference: number
  scoreDashoffset: number
}>()

const showTooltip = ref(false)
</script>

<template>
  <!-- Sprint 3 (2026-05-04) — `@click.stop` empêche la propagation au parent
       (radar-list-item dans CaptainValidation), qui ouvrait à tort la sidebar
       lors d'un clic sur le score-ring. -->
  <div
    class="radar-card__score-ring"
    :class="{ 'radar-card__score-ring--empty': !hasScore }"
    @mouseenter.stop="showTooltip = true"
    @mouseleave.stop="showTooltip = false"
    @click.stop
  >
    <svg width="68" height="68" viewBox="0 0 68 68">
      <circle cx="34" cy="34" :r="circleRadius" fill="none" :stroke="scoreColor" stroke-width="3"
        stroke-linecap="round" :stroke-dasharray="circleCircumference" :stroke-dashoffset="scoreDashoffset"
        transform="rotate(-90 34 34)" />
    </svg>
    <span class="score-ring__value" :style="{ color: scoreColor }">{{ hasScore ? displayedScore : '—' }}</span>
    <span class="score-ring__label">{{ scoreLabel }}</span>
    <Transition name="tooltip-fade">
      <div v-if="showTooltip" class="score-tooltip" @click.stop>
        <div class="tooltip-header">{{ scoreLabel }}</div>
        <template v-if="hasScore">
          <div v-for="(row, i) in breakdownRows" :key="'tt-' + i" class="tooltip-row">
            <span class="tooltip-label">{{ row.label }} <span class="tooltip-weight">({{ row.weight }})</span></span>
            <span class="tooltip-desc">{{ row.desc }}</span>
            <span class="tooltip-val">{{ row.value }}/100</span>
          </div>
          <div class="tooltip-total">
            <span>Total</span>
            <span>{{ displayedScore }}/100</span>
          </div>
        </template>
        <p v-else-if="relevanceMissingReason === 'no-pain'" class="tooltip-empty">
          Score Pertinence indisponible. D&eacute;finis un point de douleur sur l'article et recharge l'onglet Capitaine pour obtenir le score.
        </p>
        <p v-else-if="relevanceMissingReason === 'missing-paa'" class="tooltip-empty">
          Score Pertinence indisponible &mdash; aucune question PAA trouv&eacute;e pour ce mot-cl&eacute;. Relance la validation pour r&eacute;cup&eacute;rer les PAA depuis la SERP.
        </p>
        <p v-else-if="relevanceMissingReason === 'missing-autocomplete'" class="tooltip-empty">
          Score Pertinence indisponible &mdash; aucune suggestion autocomplete trouv&eacute;e. Relance la validation pour r&eacute;cup&eacute;rer les suggestions depuis la SERP.
        </p>
        <p v-else-if="relevanceMissingReason === 'no-signals'" class="tooltip-empty">
          Le point de douleur est d&eacute;fini, mais les signaux SERP n'ont rien produit. Relance la validation pour r&eacute;essayer.
        </p>
        <p v-else-if="relevanceMissingReason === 'long-tail'" class="tooltip-empty">
          Score Pertinence non applicable aux longues tra&icirc;nes &mdash; utilise plut&ocirc;t le score Pertinence de leur racine dans l'onglet Capitaine.
        </p>
        <p v-else class="tooltip-empty">
          Score Pertinence indisponible.
        </p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.radar-card__score-ring {
  position: relative;
  width: 68px;
  height: 68px;
  flex-shrink: 0;
}

.radar-card__score-ring svg {
  display: block;
}

.score-ring__value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.score-ring__label {
  position: absolute;
  bottom: -1.125rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.radar-card__score-ring--empty .score-ring__value {
  font-weight: 400;
  font-size: 1.5rem;
}

.score-tooltip {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 30;
  min-width: 280px;
  max-width: 360px;
  padding: 0.75rem 0.875rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.75rem;
  cursor: default;
}

.tooltip-header {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--color-border);
}

.tooltip-row {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 0.125rem 0.5rem;
  align-items: baseline;
}

.tooltip-label {
  font-weight: 600;
  color: var(--color-text);
  grid-column: 1;
  grid-row: 1;
}

.tooltip-weight {
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: 0.6875rem;
}

.tooltip-desc {
  grid-column: 1;
  grid-row: 2;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.tooltip-val {
  grid-column: 2;
  grid-row: 1 / 3;
  align-self: center;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--color-text);
}

.tooltip-total {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}

.tooltip-empty {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
