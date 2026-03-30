<script setup lang="ts">
import type { JargonDetection } from '@shared/types/geo.types.js'

defineProps<{
  detections: JargonDetection[]
}>()

defineEmits<{
  (e: 'apply-suggestion', term: string, suggestion: string): void
}>()
</script>

<template>
  <div class="jargon-alerts">
    <div v-if="detections.length === 0" class="alert-ok">
      &#10003; Aucun jargon d&eacute;tect&eacute;
    </div>
    <div
      v-for="(d, i) in detections"
      :key="i"
      class="jargon-item"
    >
      <div class="jargon-header">
        <span class="jargon-term">&laquo; {{ d.term }} &raquo;</span>
        <span class="jargon-count">&times;{{ d.count }}</span>
      </div>
      <button
        class="jargon-suggestion"
        @click="$emit('apply-suggestion', d.term, d.suggestion)"
      >
        &rarr; {{ d.suggestion }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.jargon-alerts {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.alert-ok {
  color: var(--color-score-good);
  font-size: 0.75rem;
  font-weight: 500;
}

.jargon-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.75rem;
}

.jargon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jargon-term {
  color: var(--color-score-fair);
  font-weight: 500;
}

.jargon-count {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #6b7280);
}

.jargon-suggestion {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.6875rem;
  color: var(--color-primary, #3b82f6);
  cursor: pointer;
  text-align: left;
}

.jargon-suggestion:hover {
  text-decoration: underline;
}
</style>
