<script setup lang="ts">
import { computed } from 'vue'
import ConfidenceBar from '@/components/intent/ConfidenceBar.vue'
import { VERDICT_CONFIG } from '@/composables/ui/useVerdictColors'
import type { VerdictLevel, KpiResult } from '@shared/types/index.js'

const props = defineProps<{
  verdict: VerdictLevel
  verdictLabel: string
  kpis: KpiResult[]
  fromCache?: boolean
}>()

const config = computed(() => VERDICT_CONFIG[props.verdict] ?? VERDICT_CONFIG['ORANGE'])

const greenRatio = computed(() => {
  const total = props.kpis.length || 1
  const greens = props.kpis.filter(k => k.color === 'green' || k.color === 'bonus').length
  return greens / total
})

const greenCount = computed(() =>
  props.kpis.filter(k => k.color === 'green' || k.color === 'bonus').length,
)
</script>

<template>
  <div
    class="verdict-thermo"
    :style="{ borderColor: config.color, background: config.bg }"
    data-testid="verdict-thermometer"
  >
    <div class="vt-header">
      <div class="vt-left">
        <span class="vt-icon">{{ config.icon }}</span>
        <span class="vt-level" :style="{ color: config.color }">{{ verdict }}</span>
      </div>
      <div class="vt-right">
        <span class="vt-count">{{ greenCount }}/{{ kpis.length }} verts</span>
        <span v-if="fromCache" class="vt-cache">(cache)</span>
      </div>
    </div>
    <div class="vt-label">{{ verdictLabel }}</div>
    <ConfidenceBar :value="greenRatio" />
    <slot name="actions" />
  </div>
</template>

<style scoped>
.verdict-thermo {
  border: 2px solid;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  box-sizing: border-box;
}

.vt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.vt-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vt-icon { font-size: 1.25rem; }

.vt-level {
  font-size: 1.375rem;
  font-weight: 800;
  text-transform: uppercase;
}

.vt-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.vt-count {
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
}

.vt-cache {
  font-size: 0.75rem;
  color: var(--color-text-muted, #94a3b8);
  font-style: italic;
}

.vt-label {
  font-size: 0.8125rem;
  color: var(--color-text-muted, #64748b);
  margin-bottom: 0.5rem;
  min-height: 1.25em;
  line-height: 1.25em;
}

</style>
