<script setup lang="ts">
import type { KeywordHealthAlert } from '@/utils/keyword-health'

defineProps<{
  alerts: KeywordHealthAlert[]
}>()
</script>

<template>
  <div v-if="alerts.length > 0" class="health-alerts">
    <div
      v-for="(alert, idx) in alerts"
      :key="idx"
      class="health-alert"
      :class="`alert-${alert.level}`"
    >
      <span class="alert-icon">
        <template v-if="alert.level === 'danger'">&#x2716;</template>
        <template v-else-if="alert.level === 'warning'">&#x26A0;</template>
        <template v-else>&#x2714;</template>
      </span>
      <span class="alert-message">{{ alert.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.health-alerts {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.health-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  border-left: 3px solid;
}

.alert-danger {
  background: var(--color-badge-red-bg, #fef2f2);
  color: var(--color-badge-red-text, #991b1b);
  border-left-color: var(--color-badge-red-text, #991b1b);
}

.alert-warning {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
  border-left-color: var(--color-badge-amber-text);
}

.alert-good {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
  border-left-color: var(--color-badge-green-text);
}

.alert-icon {
  flex-shrink: 0;
  font-size: 0.875rem;
  line-height: 1;
}

.alert-message {
  line-height: 1.3;
}
</style>
