<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  score: number
  label: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const arcColor = computed(() => {
  if (props.score >= 70) return 'var(--color-score-good-arc)'
  if (props.score >= 40) return 'var(--color-score-fair-arc)'
  return 'var(--color-score-poor-arc)'
})

const textColor = computed(() => {
  if (props.score >= 70) return 'var(--color-score-good)'
  if (props.score >= 40) return 'var(--color-score-fair)'
  return 'var(--color-score-poor)'
})

const sizeMap = { sm: 60, md: 90, lg: 120 }
const dimension = computed(() => sizeMap[props.size])
const strokeWidth = computed(() => props.size === 'sm' ? 6 : 8)
const radius = computed(() => (dimension.value - strokeWidth.value) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => {
  const progress = Math.min(100, Math.max(0, props.score)) / 100
  return circumference.value * (1 - progress)
})
const fontSize = computed(() => props.size === 'sm' ? '0.875rem' : props.size === 'md' ? '1.25rem' : '1.5rem')
const labelSize = computed(() => props.size === 'sm' ? '0.75rem' : '0.75rem')
</script>

<template>
  <div class="score-gauge" :style="{ width: `${dimension}px` }">
    <svg
      :width="dimension"
      :height="dimension"
      :viewBox="`0 0 ${dimension} ${dimension}`"
      role="img"
      :aria-label="`Score ${label}: ${score} sur 100`"
    >
      <title>{{ label }}: {{ score }}/100</title>
      <circle
        class="gauge-bg"
        :cx="dimension / 2"
        :cy="dimension / 2"
        :r="radius"
        :stroke-width="strokeWidth"
        fill="none"
      />
      <circle
        class="gauge-fill"
        :cx="dimension / 2"
        :cy="dimension / 2"
        :r="radius"
        :stroke-width="strokeWidth"
        fill="none"
        :stroke="arcColor"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
        transform="rotate(-90)"
        :transform-origin="`${dimension / 2} ${dimension / 2}`"
      />
    </svg>
    <div class="gauge-center">
      <span class="gauge-score" :style="{ fontSize, color: textColor }">{{ score }}</span>
      <span class="gauge-label" :style="{ fontSize: labelSize }">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.score-gauge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.gauge-bg {
  stroke: var(--color-border, #e5e7eb);
}

.gauge-fill {
  transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
}

.gauge-center {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}

.gauge-score {
  font-weight: 700;
}

.gauge-label {
  color: var(--color-text-muted, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
</style>
