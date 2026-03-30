<script setup lang="ts">
import { computed } from 'vue'
import type { NlpTermResult } from '@shared/types/seo.types.js'

const props = defineProps<{
  terms: NlpTermResult[]
}>()

const detectedCount = computed(() => props.terms.filter(t => t.isDetected).length)

const sortedTerms = computed(() =>
  [...props.terms].sort((a, b) => {
    if (a.isDetected !== b.isDetected) return a.isDetected ? -1 : 1
    return b.searchVolume - a.searchVolume
  }),
)
</script>

<template>
  <div class="nlp-terms">
    <div class="nlp-summary">
      {{ detectedCount }}/{{ terms.length }} termes d&eacute;tect&eacute;s
    </div>
    <div class="nlp-list">
      <span
        v-for="(term, i) in sortedTerms"
        :key="i"
        class="nlp-tag"
        :class="{ detected: term.isDetected }"
        :title="`Vol: ${term.searchVolume}`"
      >
        {{ term.term }}
      </span>
    </div>
    <div v-if="terms.length === 0" class="nlp-empty">
      Aucun terme NLP disponible
    </div>
  </div>
</template>

<style scoped>
.nlp-terms {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nlp-summary {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #6b7280);
  font-weight: 500;
}

.nlp-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.nlp-tag {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.6875rem;
  background: var(--color-border, #e5e7eb);
  color: var(--color-text-muted, #6b7280);
}

.nlp-tag.detected {
  background: var(--color-badge-green-bg);
  color: var(--color-badge-green-text);
}

.nlp-empty {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}
</style>
