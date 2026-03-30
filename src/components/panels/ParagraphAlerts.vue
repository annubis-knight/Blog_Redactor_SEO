<script setup lang="ts">
import type { ParagraphAlert } from '@shared/types/geo.types.js'

defineProps<{
  alerts: ParagraphAlert[]
}>()
</script>

<template>
  <div class="paragraph-alerts">
    <div v-if="alerts.length === 0" class="alert-ok">
      &#10003; Tous les paragraphes sont concis
    </div>
    <div
      v-for="(alert, i) in alerts"
      :key="i"
      class="alert-item"
    >
      <span class="alert-icon">&#9888;</span>
      <div class="alert-content">
        <span class="alert-count">P{{ alert.index + 1 }} &mdash; {{ alert.wordCount }} mots</span>
        <span class="alert-excerpt">{{ alert.excerpt }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.paragraph-alerts {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.alert-ok {
  color: var(--color-score-good);
  font-size: 0.75rem;
  font-weight: 500;
}

.alert-item {
  display: flex;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--color-score-fair);
}

.alert-icon {
  flex-shrink: 0;
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.alert-count {
  font-weight: 600;
  font-size: 0.6875rem;
}

.alert-excerpt {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
</style>
