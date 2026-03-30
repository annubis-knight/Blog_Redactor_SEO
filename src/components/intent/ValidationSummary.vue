<script setup lang="ts">
import type { PainVerdictCategory } from '@shared/types/intent.types.js'
import ConfidenceBar from './ConfidenceBar.vue'
import LatentAlert from './LatentAlert.vue'

defineProps<{
  distribution: Record<PainVerdictCategory, number>
  averageConfidence: number
  sourcesRatio: string
  latentKeyword?: string | null
  latentExplanation?: string | null
}>()

const verdictConfig: { key: PainVerdictCategory; icon: string; label: string }[] = [
  { key: 'brulante', icon: '🔥', label: 'Brûlante' },
  { key: 'confirmee', icon: '✅', label: 'Confirmée' },
  { key: 'emergente', icon: '🌱', label: 'Émergente' },
  { key: 'latente', icon: '💡', label: 'Latente' },
  { key: 'incertaine', icon: '❓', label: 'Incertaine' },
  { key: 'froide', icon: '❄️', label: 'Froide' },
]
</script>

<template>
  <div class="validation-summary">
    <div class="summary-distribution">
      <div
        v-for="v in verdictConfig"
        :key="v.key"
        class="summary-item"
        :class="{ 'summary-item--zero': distribution[v.key] === 0 }"
      >
        <span class="summary-icon">{{ v.icon }}</span>
        <span class="summary-label">{{ v.label }}</span>
        <span class="summary-count">{{ distribution[v.key] }}</span>
      </div>
    </div>

    <div class="summary-meta">
      <div class="summary-confidence">
        <span class="summary-meta-label">Confiance moyenne</span>
        <ConfidenceBar :value="averageConfidence" />
      </div>
      <div class="summary-sources">
        <span class="summary-meta-label">Sources</span>
        <span class="summary-sources-ratio">{{ sourcesRatio }}</span>
      </div>
    </div>

    <LatentAlert
      v-if="latentKeyword && latentExplanation"
      :keyword="latentKeyword"
      :explanation="latentExplanation"
    />
  </div>
</template>

<style scoped>
.validation-summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-soft, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
}

.summary-distribution {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
}

.summary-item--zero {
  opacity: 0.4;
}

.summary-icon {
  font-size: 0.875rem;
}

.summary-label {
  font-weight: 500;
  color: var(--color-text, #1e293b);
}

.summary-count {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text, #1e293b);
}

.summary-meta {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.summary-meta-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, #64748b);
  margin-right: 0.375rem;
}

.summary-sources-ratio {
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
