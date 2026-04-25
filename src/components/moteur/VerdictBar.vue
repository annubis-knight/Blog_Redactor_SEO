<script setup lang="ts">
import { computed } from 'vue'
import ConfidenceBar from '@/components/intent/ConfidenceBar.vue'
import { VERDICT_CONFIG } from '@/composables/ui/useVerdictColors'
import type { VerdictLevel, KpiResult } from '@shared/types/index.js'

/**
 * Single-line verdict bar that replaces VerdictThermometer + nogo-feedback.
 *
 * Why a merge: the nogo-feedback block was conditionally rendered BELOW the
 * thermometer, pushing the KPI row down when visible. That vertical shift
 * was jarring every time the carousel scrolled onto a NO-GO keyword.
 *
 * This component has a fixed height (`--verdict-bar-height`) so the layout
 * never shifts: NO-GO message slides in on the right of the same row.
 */

const props = defineProps<{
  verdict: VerdictLevel | null
  verdictLabel: string
  kpis: KpiResult[]
  fromCache?: boolean
  /** Surfaced inline on NO-GO (instead of a separate block below). */
  noGoMessage?: string | null
}>()

const config = computed(() => props.verdict ? (VERDICT_CONFIG[props.verdict] ?? VERDICT_CONFIG['ORANGE']) : VERDICT_CONFIG['ORANGE'])

const greenCount = computed(() =>
  props.kpis.filter(k => k.color === 'green' || k.color === 'bonus').length,
)

const greenRatio = computed(() => {
  const total = props.kpis.length || 1
  return greenCount.value / total
})
</script>

<template>
  <div
    v-if="verdict"
    class="verdict-bar"
    :style="{ borderColor: config.color, background: config.bg }"
    data-testid="verdict-bar"
  >
    <span class="verdict-bar__icon" :aria-hidden="true">{{ config.icon }}</span>
    <span class="verdict-bar__level" :style="{ color: config.color }">{{ verdict }}</span>
    <span class="verdict-bar__count">{{ greenCount }}/{{ kpis.length }}</span>
    <ConfidenceBar :value="greenRatio" class="verdict-bar__confidence" />
    <span v-if="fromCache" class="verdict-bar__cache" title="Résultat lu depuis le cache">cache</span>

    <!-- Sprint — NO-GO message was previously in its own block below the
         thermometer, pushing the KPI row down. Now it lives on the right of
         the same single-line bar. Fixed height => no layout jump. -->
    <div v-if="noGoMessage" class="verdict-bar__nogo" :style="{ color: config.color }" data-testid="verdict-bar-nogo">
      <span class="verdict-bar__nogo-sep" :aria-hidden="true">·</span>
      <span class="verdict-bar__nogo-text">{{ noGoMessage }}</span>
    </div>
    <div v-else-if="verdictLabel" class="verdict-bar__label" :title="verdictLabel">
      <span class="verdict-bar__nogo-sep" :aria-hidden="true">·</span>
      <span class="verdict-bar__nogo-text">{{ verdictLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.verdict-bar {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  height: 40px;
  padding: 0 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid;
  border-radius: 6px;
  font-size: 0.8125rem;
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
}

.verdict-bar__icon { font-size: 1rem; flex-shrink: 0; }

.verdict-bar__level {
  font-size: 0.8125rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

.verdict-bar__count {
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
  color: var(--color-text-muted, #64748b);
  flex-shrink: 0;
}

.verdict-bar__confidence {
  width: 72px;
  flex-shrink: 0;
}

.verdict-bar__cache {
  font-size: 0.625rem;
  color: var(--color-text-muted, #94a3b8);
  font-style: italic;
  flex-shrink: 0;
}

.verdict-bar__nogo,
.verdict-bar__label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
  font-size: 0.75rem;
  line-height: 1.2;
}

.verdict-bar__label { color: var(--color-text-muted, #64748b); }

.verdict-bar__nogo-sep {
  color: var(--color-border, #e2e8f0);
  flex-shrink: 0;
}

.verdict-bar__nogo-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
