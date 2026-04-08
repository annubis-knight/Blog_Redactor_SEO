<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  recommendation: number | null
  articleType: string
  customTarget?: number
}>()

const emit = defineEmits<{
  'update:customTarget': [value: number]
}>()

const effectiveTarget = computed(() => props.customTarget ?? props.recommendation)

const range = computed(() => {
  if (!effectiveTarget.value) return null
  const min = Math.round(effectiveTarget.value * 0.8)
  const max = Math.round(effectiveTarget.value * 1.2)
  return { min, max }
})

const isCustom = computed(() => props.customTarget != null && props.customTarget !== props.recommendation)

function adjustTarget(delta: number) {
  const base = effectiveTarget.value ?? props.recommendation ?? 1500
  const next = Math.max(500, Math.min(10000, base + delta))
  emit('update:customTarget', next)
}

function resetTarget() {
  if (props.recommendation) {
    emit('update:customTarget', props.recommendation)
  }
}
</script>

<template>
  <div v-if="range" class="recommendation-card">
    <div class="recommendation-value">
      <span class="value-range">{{ range.min.toLocaleString('fr-FR') }} – {{ range.max.toLocaleString('fr-FR') }}</span>
      <span class="value-unit">mots</span>
    </div>

    <div class="target-controls">
      <span class="target-label">Cible :</span>
      <button class="btn-adjust" @click="adjustTarget(-100)" title="-100 mots">−</button>
      <span class="target-value">{{ effectiveTarget?.toLocaleString('fr-FR') }}</span>
      <button class="btn-adjust" @click="adjustTarget(100)" title="+100 mots">+</button>
      <button v-if="isCustom" class="btn-reset" @click="resetTarget" title="Revenir a la valeur par defaut">
        Reinitialiser
      </button>
    </div>

    <p class="recommendation-note">
      Base : ~{{ recommendation?.toLocaleString('fr-FR') }} mots (type <strong>{{ articleType }}</strong>)
      <span v-if="isCustom" class="custom-badge">ajuste</span>
    </p>
  </div>

  <div v-else class="no-data">
    Aucune recommandation disponible
  </div>
</template>

<style scoped>
.recommendation-card {
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.recommendation-value {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.value-range {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.value-unit {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.target-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.target-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.target-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  min-width: 3rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.btn-adjust {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 700;
  background: var(--color-bg-soft);
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.15s;
}

.btn-adjust:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-reset {
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 500;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  text-decoration: underline;
}

.btn-reset:hover {
  color: var(--color-primary);
}

.recommendation-note {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.custom-badge {
  display: inline-block;
  margin-left: 0.375rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--color-primary-soft, rgba(37, 99, 235, 0.1));
  color: var(--color-primary);
}

.no-data {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}
</style>
