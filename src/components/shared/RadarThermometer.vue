<script setup lang="ts">
import { computed } from 'vue'
import { radarHeatColor, radarHeatIcon, radarHeatLabel } from '@/composables/keyword/useResonanceScore'
import ConfidenceBar from '@/components/intent/ConfidenceBar.vue'

const props = withDefaults(defineProps<{
  /** Score 0-100, ou null en état "vide" (avant scan). */
  globalScore: number | null
  /** Heat level ('brulante' | 'chaude' | 'tiede' | 'froide' | null en état vide). */
  heatLevel: string | null
  keywordsCount?: number
  autocompleteCount?: number
  paaTotal?: number
  verdict?: string
  compact?: boolean
}>(), {
  compact: false,
})

const isEmpty = computed(() => props.globalScore === null || props.heatLevel === null)
const color = computed(() => isEmpty.value ? 'var(--color-border, #e2e8f0)' : radarHeatColor(props.heatLevel as never))
const icon = computed(() => isEmpty.value ? '○' : radarHeatIcon(props.heatLevel ?? ''))
const label = computed(() => isEmpty.value ? 'En attente' : radarHeatLabel(props.heatLevel as never))
const scoreText = computed(() => isEmpty.value ? '—' : String(props.globalScore))
const confidenceValue = computed(() => {
  // isEmpty garantit globalScore !== null sur la branche else (cf. computed
  // isEmpty), donc pas de fallback silencieux.
  if (isEmpty.value || props.globalScore === null) return 0
  return props.globalScore / 100
})
const hasKpis = computed(() =>
  !props.compact && (props.keywordsCount != null || props.autocompleteCount != null || props.paaTotal != null),
)
</script>

<template>
  <div
    class="thermometer"
    :class="{ 'thermometer--compact': compact, 'thermometer--empty': isEmpty }"
    :style="{ borderColor: color }"
  >
    <div class="thermo-header">
      <div class="thermo-left">
        <span class="thermo-icon">{{ icon }}</span>
        <span class="thermo-score" :style="{ color }">{{ scoreText }}/100</span>
        <span class="thermo-label" :style="{ color }">{{ label }}</span>
      </div>
      <div v-if="hasKpis" class="thermo-kpis">
        <span v-if="keywordsCount != null" class="kpi">
          <span class="kpi-value">{{ keywordsCount }}</span>
          <span class="kpi-label">Keywords</span>
        </span>
        <span v-if="autocompleteCount != null" class="kpi">
          <span class="kpi-value">{{ autocompleteCount }}</span>
          <span class="kpi-label">Autocomplete</span>
        </span>
        <span v-if="paaTotal != null" class="kpi">
          <span class="kpi-value">{{ paaTotal }}</span>
          <span class="kpi-label">PAA Total</span>
        </span>
      </div>
    </div>
    <p v-if="verdict && !compact" class="thermo-verdict">{{ verdict }}</p>
    <ConfidenceBar :value="confidenceValue" />
  </div>
</template>

<style scoped>
.thermometer {
  padding: 1.25rem;
  background: var(--color-surface);
  border: 2px solid;
  border-radius: 10px;
  transition: border-color 0.4s ease;
}

.thermometer--compact {
  padding: 0.75rem 1rem;
  border-radius: 8px;
}

.thermometer--empty {
  opacity: 0.55;
  border-style: dashed;
}

.thermo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.thermometer--compact .thermo-header {
  margin-bottom: 0.5rem;
}

.thermo-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.thermo-icon { font-size: 1.5rem; }
.thermometer--compact .thermo-icon { font-size: 1.125rem; }

.thermo-score {
  font-size: 1.75rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.thermometer--compact .thermo-score {
  font-size: 1.125rem;
  font-weight: 700;
}

.thermo-label {
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.thermometer--compact .thermo-label {
  font-size: 0.8125rem;
}

.thermo-kpis { display: flex; gap: 1rem; }

.kpi {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.kpi-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.kpi-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.thermo-verdict {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text);
  font-style: italic;
}
</style>
