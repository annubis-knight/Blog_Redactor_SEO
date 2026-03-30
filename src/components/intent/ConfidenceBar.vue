<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number // 0-1
  compact?: boolean
}>()

const fillColor = computed(() => {
  if (props.value > 0.70) return 'var(--color-success, #16a34a)'
  if (props.value >= 0.40) return 'var(--color-warning, #d97706)'
  return 'var(--color-error, #dc2626)'
})

const fillWidth = computed(() => `${Math.round(props.value * 100)}%`)
const label = computed(() => `${Math.round(props.value * 100)}%`)
</script>

<template>
  <div class="confidence-bar" :class="{ 'confidence-bar--compact': compact }">
    <div class="confidence-track">
      <div
        class="confidence-fill"
        :style="{ width: fillWidth, background: fillColor }"
      />
    </div>
    <span class="confidence-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.confidence-bar {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.confidence-track {
  width: 60px;
  height: 6px;
  background: var(--color-border, #e2e8f0);
  border-radius: 3px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}

.confidence-label {
  font-size: 0.6875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text, #1e293b);
  min-width: 2rem;
}
</style>
