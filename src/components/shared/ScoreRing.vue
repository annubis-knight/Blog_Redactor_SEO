<script setup lang="ts">
import { computed } from 'vue'

/**
 * Small circular score ring. Used on the main radar card (score 0-100) and,
 * since Sprint 16, on each root variant in the captain KPI row so the user
 * can compare root candidates at a glance.
 */
const props = withDefaults(defineProps<{
  value: number
  size?: number
  strokeWidth?: number
  /** When true, render the numeric value inside the ring */
  showValue?: boolean
}>(), {
  size: 68,
  strokeWidth: 3,
  showValue: true,
})

const radius = computed(() => (props.size - props.strokeWidth * 2) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const center = computed(() => props.size / 2)

const color = computed(() => {
  const t = Math.max(0, Math.min(1, props.value / 100))
  const hue = Math.round(t * 120)
  return `hsl(${hue}, 70%, 45%)`
})

const dashoffset = computed(() => {
  const t = Math.max(0, Math.min(1, props.value / 100))
  return circumference.value * (1 - t)
})
</script>

<template>
  <div class="score-ring" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <circle
        :cx="center" :cy="center" :r="radius"
        fill="none"
        stroke="var(--color-border, #e2e8f0)"
        :stroke-width="strokeWidth"
      />
      <circle
        :cx="center" :cy="center" :r="radius"
        fill="none" :stroke="color" :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashoffset"
        :transform="`rotate(-90 ${center} ${center})`"
      />
    </svg>
    <span v-if="showValue" class="score-ring__value" :style="{ color }">{{ Math.round(value) }}</span>
  </div>
</template>

<style scoped>
.score-ring {
  position: relative;
  flex-shrink: 0;
}
.score-ring svg {
  display: block;
}
.score-ring__value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
</style>
