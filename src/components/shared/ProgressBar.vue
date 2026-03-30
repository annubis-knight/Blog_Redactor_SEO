<script setup lang="ts">
const props = withDefaults(defineProps<{
  percent: number
  color?: string
}>(), {
  color: 'var(--color-primary)',
})
</script>

<template>
  <div
    class="progress-bar"
    role="progressbar"
    :aria-valuenow="Math.round(props.percent)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="progress-fill"
      :style="{ width: `${Math.min(100, Math.max(0, props.percent))}%`, background: props.color }"
    ></div>
  </div>
</template>

<style scoped>
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}
</style>
