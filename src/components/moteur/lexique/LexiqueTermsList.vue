<script setup lang="ts">
import CollapsableSection from '@/components/shared/CollapsableSection.vue'
import type { LexiqueTermRecommendation, TfidfTerm } from '@shared/types/serp-analysis.types.js'

defineProps<{
  title: string
  terms: TfidfTerm[]
  selectedTerms: Set<string>
  isLocked: boolean
  defaultOpen: boolean
  isIaRecommended: (term: string) => boolean | null
  getRecommendation: (term: string) => LexiqueTermRecommendation | undefined
  sortTermsByAlignment: <T extends { term: string; density?: number; documentFrequency?: number }>(terms: T[]) => T[]
  emptyLabel: string
}>()

defineEmits<{
  (e: 'toggle-term', term: string): void
}>()
</script>

<template>
  <CollapsableSection :title="title" :default-open="defaultOpen">
    <div v-if="terms.length > 0" class="term-list">
      <div
        v-for="term in sortTermsByAlignment(terms)"
        :key="term.term"
        class="term-row"
        :class="{ selected: selectedTerms.has(term.term) }"
      >
        <input
          type="checkbox"
          :checked="selectedTerms.has(term.term)"
          :disabled="isLocked"
          class="term-checkbox"
          @change="$emit('toggle-term', term.term)"
        />
        <span class="term-text">{{ term.term }}</span>
        <span
          v-if="isIaRecommended(term.term) !== null"
          :class="isIaRecommended(term.term) ? 'badge-ia badge-ia-recommended' : 'badge-ia badge-ia-optional'"
          :title="getRecommendation(term.term)?.aiReason"
        >
          {{ isIaRecommended(term.term) ? 'IA recommandé' : 'IA optionnel' }}
        </span>
        <span class="term-density">&times;{{ term.density }}/page</span>
        <span class="term-percent">{{ Math.round(term.documentFrequency * 100) }}%</span>
      </div>
    </div>
    <p v-else class="section-empty">{{ emptyLabel }}</p>
  </CollapsableSection>
</template>

<style scoped>
.term-list {
  display: flex;
  flex-direction: column;
}

.term-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.8125rem;
}

.term-row:last-child {
  border-bottom: none;
}

.term-row.selected {
  background: var(--color-block-success-bg, #f0fdf4);
}

.term-checkbox {
  cursor: pointer;
  flex-shrink: 0;
}

.term-text {
  flex: 1;
  font-weight: 500;
}

.term-density,
.term-percent {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.term-percent {
  min-width: 40px;
  text-align: right;
  font-weight: 600;
}

.badge-ia {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 999px;
  white-space: nowrap;
}

.badge-ia-recommended {
  color: var(--color-success, #16a34a);
  background: var(--color-block-success-bg, #f0fdf4);
  border: 1px solid var(--color-success, #22c55e);
}

.badge-ia-optional {
  color: var(--color-text-muted);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
}

.section-empty {
  margin: 0;
  padding: 0.75rem 1rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
