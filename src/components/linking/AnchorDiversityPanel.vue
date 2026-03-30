<script setup lang="ts">
import type { AnchorDiversityAlert } from '@shared/types/index.js'

defineProps<{
  alerts: AnchorDiversityAlert[]
}>()
</script>

<template>
  <div class="anchor-diversity">
    <h3 class="panel-title">
      Diversité des ancres
      <span v-if="alerts.length > 0" class="alert-count">{{ alerts.length }}</span>
    </h3>

    <div v-if="alerts.length === 0" class="panel-empty">
      Bonne diversité : aucune ancre utilisée plus de 3 fois.
    </div>

    <div v-else class="alert-list">
      <div v-for="alert in alerts" :key="alert.anchorText" class="alert-item">
        <div class="alert-header">
          <span class="alert-anchor">« {{ alert.anchorText }} »</span>
          <span class="alert-badge">{{ alert.count }}x</span>
        </div>
        <div class="alert-targets">
          Cibles : {{ alert.targets.join(', ') }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.anchor-diversity {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.alert-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 0.375rem;
  border-radius: 11px;
  font-size: 0.6875rem;
  font-weight: 700;
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.panel-empty {
  padding: 0.75rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alert-item {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-block-warning-border);
  border-radius: 6px;
  background: var(--color-block-warning-bg);
}

.alert-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.alert-anchor {
  font-size: 0.8125rem;
  font-weight: 600;
  font-style: italic;
}

.alert-badge {
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.6875rem;
  font-weight: 700;
  background: var(--color-badge-amber-bg);
  color: var(--color-badge-amber-text);
}

.alert-targets {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  word-break: break-all;
}
</style>
