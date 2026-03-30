<script setup lang="ts">
import type { KeywordAlert } from '../../../shared/types/index.js'

defineProps<{ alert: KeywordAlert }>()

const icons: Record<string, string> = {
  danger: '!',
  warning: '⚠',
  info: 'i',
}
</script>

<template>
  <span class="alert-badge" :class="'alert-' + alert.level" :title="alert.message">
    <span class="alert-icon">{{ icons[alert.level] ?? '?' }}</span>
    <span class="alert-text">{{ alert.message }}</span>
  </span>
</template>

<style scoped>
.alert-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1.3;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0.0625rem 0;
}

.alert-danger {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.alert-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.alert-info {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.alert-icon {
  flex-shrink: 0;
}

.alert-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
