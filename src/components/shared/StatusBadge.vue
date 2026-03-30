<script setup lang="ts">
import type { ArticleStatus } from '@shared/types/index.js'

const props = defineProps<{
  status: ArticleStatus
}>()

const statusConfig: Record<ArticleStatus, { label: string; cssClass: string }> = {
  'à rédiger': { label: 'À rédiger', cssClass: 'status--todo' },
  'brouillon': { label: 'Brouillon', cssClass: 'status--draft' },
  'publié': { label: 'Publié', cssClass: 'status--published' },
}
</script>

<template>
  <span class="status-badge" :class="statusConfig[props.status].cssClass">
    <span class="status-dot"></span>
    {{ statusConfig[props.status].label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status--todo {
  background: var(--color-badge-slate-bg);
  color: var(--color-badge-slate-text);
}
.status--todo .status-dot {
  background: var(--color-badge-slate-text);
}

.status--draft {
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}
.status--draft .status-dot {
  background: var(--color-badge-amber-text);
}

.status--published {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}
.status--published .status-dot {
  background: var(--color-badge-green-text);
}
</style>
