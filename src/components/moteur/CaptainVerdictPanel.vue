<script setup lang="ts">
import { ref } from 'vue'
import VerdictThermometer from '@/components/moteur/VerdictThermometer.vue'
import { KPI_COLORS } from '@/composables/useVerdictColors'
import type { KpiResult, VerdictLevel, ArticleLevel } from '@shared/types/index.js'

const props = defineProps<{
  verdict: VerdictLevel | null
  verdictLabel: string
  kpis: KpiResult[]
  fromCache: boolean
  noGoMessage?: string | null
  articleLevel: ArticleLevel
}>()

const hoveredKpi = ref<string | null>(null)

const KPI_LABELS: Record<string, string> = {
  volume: 'Vol.',
  kd: 'KD',
  cpc: 'CPC',
  paa: 'PAA',
  intent: 'Intent',
  autocomplete: 'Auto.',
}

function kpiDisplayName(name: string): string {
  return KPI_LABELS[name] ?? name
}

function tooltipText(kpi: KpiResult): string {
  const levelLabel = props.articleLevel
  const g = kpi.thresholds.green
  const o = kpi.thresholds.orange

  if (kpi.name === 'cpc') return `CPC — ${levelLabel} : BONUS >${g}\u20ac, sinon NEUTRE`
  if (kpi.name === 'intent') return `Intent — ${levelLabel} : VERT = match, ORANGE = mixed, ROUGE = mismatch`
  if (kpi.name === 'kd') return `Difficulté — ${levelLabel} : VERT <${g}, ORANGE ${g}-${o}, ROUGE >${o}`
  if (kpi.name === 'autocomplete') return `Autocomplete — ${levelLabel} : VERT pos \u2264${g}, ORANGE pos \u2264${o}, ROUGE au-delà`
  if (o != null) return `${kpiDisplayName(kpi.name)} — ${levelLabel} : VERT >${g}, ORANGE ${o}-${g - 1}, ROUGE <${o}`
  return `${kpiDisplayName(kpi.name)} — ${levelLabel} : VERT >${g}`
}
</script>

<template>
  <div class="captain-verdict-panel">
    <VerdictThermometer
      v-if="verdict"
      :verdict="verdict"
      :verdict-label="verdictLabel"
      :kpis="kpis"
      :from-cache="fromCache"
    />

    <div v-if="noGoMessage" class="nogo-feedback" data-testid="nogo-feedback">
      <p>{{ noGoMessage }}</p>
    </div>

    <div class="kpi-row">
      <div class="kpi-grid">
        <div
          v-for="kpi in kpis"
          :key="kpi.name"
          class="kpi-cell"
          :data-testid="`kpi-${kpi.name}`"
          @mouseenter="hoveredKpi = kpi.name"
          @mouseleave="hoveredKpi = null"
        >
          <span class="kpi-label">{{ kpiDisplayName(kpi.name) }}</span>
          <span class="kpi-value" :style="{ color: KPI_COLORS[kpi.color] }">{{ kpi.label }}</span>
          <div
            v-if="hoveredKpi === kpi.name"
            class="kpi-tooltip"
            :data-testid="`tooltip-${kpi.name}`"
          >
            {{ tooltipText(kpi) }}
          </div>
        </div>
      </div>
      <div class="kpi-root-zone">
        <slot name="root-zone" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.nogo-feedback {
  padding: 0.75rem 1rem;
  background: var(--color-error-bg, #fef2f2);
  border-radius: 8px;
  color: var(--color-error, #ef4444);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.kpi-row {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  margin-bottom: 0.75rem;
  height: 70px;
  background: var(--color-surface, #f8fafc);
  border-radius: 6px;
  border: 1px solid var(--color-border, #e2e8f0);
  overflow: hidden;
}

.kpi-grid {
  display: flex;
  flex: 1;
  min-width: 0;
  max-width: 700px;
}

.kpi-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  position: relative;
  padding: 0.375rem 0.125rem;
  border-right: 1px solid var(--color-border-light, #f1f5f9);
}

.kpi-cell:last-child {
  border-right: none;
}

.kpi-label {
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted, #94a3b8);
  white-space: nowrap;
}

.kpi-value {
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-align: center;
}

.kpi-tooltip {
  position: absolute;
  top: -2rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-text, #1e293b);
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
}

.kpi-root-zone {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  width: 200px;
  max-height: 70px;
  overflow-y: auto;
  flex-shrink: 0;
  padding: 0.25rem 0.375rem;
  border-left: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface-dim, #f1f5f9);
  gap: 2px;
}

.kpi-root-zone :deep(.kpi-root-head) {
  font-size: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-text-muted, #94a3b8);
  text-align: center;
}

.kpi-root-zone :deep(.kpi-root-item) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 2px 6px;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 0.625rem;
  transition: background 0.1s;
}

.kpi-root-zone :deep(.kpi-root-item:hover) {
  background: rgba(0, 0, 0, 0.05);
}

.kpi-root-zone :deep(.kpi-root-item--active) {
  background: rgba(0, 0, 0, 0.08);
  font-weight: 600;
}

.kpi-root-zone :deep(.kpi-root-kw) {
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--color-text, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.kpi-root-zone :deep(.kpi-root-verdict) {
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  flex-shrink: 0;
}

.kpi-root-zone :deep(.kpi-root-verdict small) {
  font-size: 0.5rem;
  font-weight: 500;
  opacity: 0.7;
}

.kpi-root-zone :deep(.kpi-root-loading) {
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-border, #e2e8f0);
  border-top-color: var(--color-primary, #3b82f6);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.kpi-root-zone :deep(.kpi-root-failed) {
  font-size: 0.625rem;
  color: var(--color-text-muted, #94a3b8);
  font-style: italic;
  opacity: 0.6;
  padding: 0.125rem 0.375rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
