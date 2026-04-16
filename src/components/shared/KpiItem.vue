<script setup lang="ts">
import { computed } from 'vue'
import { getKpiColor } from '@/composables/ui/useVerdictColors'

const props = defineProps<{
  label: string
  value: string | number
  color?: string
}>()

const colorStyle = computed(() =>
  props.color ? getKpiColor(props.color) : 'inherit',
)
</script>

<template>
  <div class="kpi-item">
    <span class="kpi-item__label">{{ label }}</span>
    <span class="kpi-item__value" :style="{ color: colorStyle }">{{ value }}</span>
  </div>
</template>

<style scoped>
.kpi-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.kpi-item__label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, #64748b);
}

.kpi-item__value {
  font-size: 0.8125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
