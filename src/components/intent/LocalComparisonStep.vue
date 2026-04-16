<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { useIntentStore } from '@/stores/keyword/intent.store'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import ErrorMessage from '@/components/shared/ErrorMessage.vue'
import ScoreGauge from '@/components/shared/ScoreGauge.vue'

const props = withDefaults(defineProps<{
  keyword: string
  mode?: 'workflow' | 'libre'
}>(), {
  mode: 'workflow',
})

const emit = defineEmits<{
  continue: []
}>()

const intentStore = useIntentStore()

const comparison = computed(() => intentStore.comparisonData)

interface MetricRow {
  label: string
  localValue: string
  nationalValue: string
  delta: number
  unit: string
  higherIsBetter: boolean
}

const metricRows = computed<MetricRow[]>(() => {
  if (!comparison.value) return []
  const local = comparison.value.local
  const national = comparison.value.national

  return [
    {
      label: 'Volume',
      localValue: local.searchVolume.toLocaleString('fr-FR'),
      nationalValue: national.searchVolume.toLocaleString('fr-FR'),
      delta: national.searchVolume > 0
        ? Math.round(((local.searchVolume - national.searchVolume) / national.searchVolume) * 100)
        : 0,
      unit: '',
      higherIsBetter: false,
    },
    {
      label: 'KD',
      localValue: `${local.keywordDifficulty}`,
      nationalValue: `${national.keywordDifficulty}`,
      delta: national.keywordDifficulty > 0
        ? Math.round(((local.keywordDifficulty - national.keywordDifficulty) / national.keywordDifficulty) * 100)
        : 0,
      unit: '/100',
      higherIsBetter: false,
    },
    {
      label: 'CPC',
      localValue: `${local.cpc.toFixed(2)} \u20AC`,
      nationalValue: `${national.cpc.toFixed(2)} \u20AC`,
      delta: national.cpc > 0
        ? Math.round(((local.cpc - national.cpc) / national.cpc) * 100)
        : 0,
      unit: '',
      higherIsBetter: false,
    },
    {
      label: 'Competition',
      localValue: `${(local.competition * 100).toFixed(0)}%`,
      nationalValue: `${(national.competition * 100).toFixed(0)}%`,
      delta: national.competition > 0
        ? Math.round(((local.competition - national.competition) / national.competition) * 100)
        : 0,
      unit: '',
      higherIsBetter: false,
    },
  ]
})

function deltaClass(row: MetricRow): string {
  if (row.delta === 0) return 'delta-neutral'
  // For KD, CPC, Competition: lower local = advantage (green)
  // For Volume: lower local is not necessarily bad at local level, keep neutral
  if (!row.higherIsBetter) {
    return row.delta < 0 ? 'delta-advantage' : 'delta-disadvantage'
  }
  return row.delta > 0 ? 'delta-advantage' : 'delta-disadvantage'
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta}%`
}

watch(() => props.keyword, (newKw) => {
  if (newKw) {
    intentStore.compareLocalNational(newKw)
  }
})

onMounted(() => {
  if (!intentStore.comparisonData && props.keyword) {
    intentStore.compareLocalNational(props.keyword)
  }
})
</script>

<template>
  <section class="comparison-step">
    <div class="step-header">
      <h2 class="step-title">Comparaison Local / National</h2>
      <p class="step-keyword">{{ keyword }}</p>
    </div>

    <LoadingSpinner v-if="intentStore.isComparing" />

    <ErrorMessage
      v-if="intentStore.comparisonError && !intentStore.isComparing"
      :message="intentStore.comparisonError"
      @retry="intentStore.compareLocalNational(keyword)"
    />

    <!-- No data state -->
    <div v-if="!intentStore.isComparing && !intentStore.comparisonError && !comparison" class="no-local-data">
      <p>Aucune donnée locale disponible pour « {{ keyword }} ».</p>
      <p class="no-local-hint">Essayez un mot-clé à dimension locale (ex: « plombier Toulouse »).</p>
    </div>

    <template v-if="comparison && !intentStore.isComparing">
      <!-- Alert banner -->
      <div
        v-if="comparison.alert"
        class="alert-banner"
        :class="comparison.alert.type === 'opportunity' ? 'alert-opportunity' : 'alert-warning'"
        role="alert"
      >
        <span class="alert-icon">{{ comparison.alert.type === 'opportunity' ? '\u2728' : '\u26A0\uFE0F' }}</span>
        <span class="alert-text">{{ comparison.alert.message }}</span>
      </div>

      <!-- Comparison table -->
      <div class="table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th class="col-metric">Metrique</th>
              <th class="col-value">Toulouse</th>
              <th class="col-value">France</th>
              <th class="col-delta">Delta</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in metricRows" :key="row.label">
              <td class="metric-label">{{ row.label }}</td>
              <td class="metric-value">{{ row.localValue }}</td>
              <td class="metric-value">{{ row.nationalValue }}</td>
              <td class="metric-delta" :class="deltaClass(row)">
                {{ formatDelta(row.delta) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Opportunity Index gauge -->
      <div class="opportunity-section">
        <h3 class="section-label">Indice d'opportunite</h3>
        <div class="opportunity-row">
          <ScoreGauge :score="comparison.opportunityIndex" label="Opp." size="lg" />
          <div class="opportunity-bar-wrapper">
            <div class="opportunity-bar-track">
              <div
                class="opportunity-bar-fill"
                :style="{ width: `${Math.min(comparison.opportunityIndex, 100)}%` }"
              ></div>
            </div>
            <div class="opportunity-labels">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>

      <p class="cache-info">
        Donnees mises en cache le {{ new Date(comparison.cachedAt).toLocaleDateString('fr-FR') }}
      </p>

      <!-- Continue -->
      <div class="step-actions">
        <button class="btn btn-primary" @click="emit('continue')">
          Continuer
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.comparison-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-header {
  margin-bottom: 0.5rem;
}

.step-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-heading);
  margin: 0 0 0.25rem;
}

.step-keyword {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
}

/* Alert banner */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
}

.alert-opportunity {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
  border: 1px solid var(--color-success);
}

.alert-warning {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
  border: 1px solid var(--color-warning);
}

.alert-icon {
  font-size: 1.125rem;
  flex-shrink: 0;
}

.alert-text {
  line-height: 1.4;
}

/* Comparison table */
.table-wrapper {
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.comparison-table th {
  padding: 0.625rem 0.75rem;
  text-align: left;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  border-bottom: 2px solid var(--color-border);
}

.comparison-table td {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.col-metric {
  width: 120px;
}

.col-value {
  text-align: right !important;
}

.col-delta {
  width: 80px;
  text-align: right !important;
}

.metric-label {
  font-weight: 600;
  color: var(--color-text);
}

.metric-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.metric-delta {
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.delta-advantage {
  color: var(--color-success);
}

.delta-disadvantage {
  color: var(--color-error);
}

.delta-neutral {
  color: var(--color-text-muted);
}

/* Opportunity section */
.opportunity-section {
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.section-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem;
}

.opportunity-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.opportunity-bar-wrapper {
  flex: 1;
}

.opportunity-bar-track {
  height: 10px;
  background: var(--color-border);
  border-radius: 5px;
  overflow: hidden;
}

.opportunity-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 5px;
  transition: width 0.5s ease;
}

.opportunity-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.cache-info {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: right;
}

/* Buttons */
.btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  margin-top: 0.5rem;
}

/* No data */
.no-local-data {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
}

.no-local-data p {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
}

.no-local-data p:last-child {
  margin-bottom: 0;
}

.no-local-hint {
  font-size: 0.75rem;
  font-style: italic;
}
</style>
