<script setup lang="ts">
import type { TfidfResult, LexiqueTermRecommendation } from '@shared/types/serp-analysis.types.js'

interface LexiqueExplorationEntry {
  articleId: number
  sourceKeyword: string
  tfidfTerms: TfidfResult | null
  aiRecommendations: LexiqueTermRecommendation[]
  aiMissingTerms: string[]
  aiSummary: string | null
  exploredAt: string
}

defineProps<{
  customKeywordInput: string
  pastExplorations: LexiqueExplorationEntry[]
  activeSourceKeyword: string
  isLoading: boolean
  isLocked: boolean
}>()

defineEmits<{
  (e: 'update:custom-keyword', value: string): void
  (e: 'extract-custom'): void
  (e: 'select-past', entry: LexiqueExplorationEntry): void
}>()
</script>

<template>
  <div class="multi-keyword-section">
    <label class="multi-keyword-label">Extraire pour un autre mot-clé</label>
    <div class="multi-keyword-row">
      <input
        :value="customKeywordInput"
        type="text"
        class="multi-keyword-input"
        :disabled="isLoading || isLocked"
        placeholder="Ex: coach sportif Paris"
        @input="(e) => $emit('update:custom-keyword', (e.target as HTMLInputElement).value)"
        @keydown.enter="$emit('extract-custom')"
      />
      <button
        type="button"
        class="btn-secondary"
        :disabled="!customKeywordInput.trim() || isLoading || isLocked"
        @click="$emit('extract-custom')"
      >Extraire</button>
    </div>
    <div v-if="pastExplorations.length > 0" class="past-explorations">
      <span class="past-label">Explorations enregistrées ({{ pastExplorations.length }}) —</span>
      <button
        v-for="entry in pastExplorations"
        :key="entry.sourceKeyword"
        type="button"
        class="past-chip"
        :class="{ 'past-chip--active': activeSourceKeyword === entry.sourceKeyword }"
        :title="`Exploré le ${new Date(entry.exploredAt).toLocaleDateString('fr-FR')}`"
        @click="$emit('select-past', entry)"
      >{{ entry.sourceKeyword }}</button>
    </div>
  </div>
</template>

<style scoped>
.multi-keyword-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.multi-keyword-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.multi-keyword-row {
  display: flex;
  gap: 0.5rem;
}

.multi-keyword-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-elevated);
  color: var(--color-text);
}

.multi-keyword-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-secondary {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.past-explorations {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.past-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.past-chip {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text);
  background: var(--color-bg-soft);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s;
}

.past-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.past-chip--active {
  color: var(--color-primary);
  background: var(--color-block-info-bg);
  border-color: var(--color-primary);
}
</style>
