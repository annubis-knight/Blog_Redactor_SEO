<script setup lang="ts">
import type { LinkSuggestion } from '@shared/types/index.js'

defineProps<{
  suggestions: LinkSuggestion[]
  isSuggesting: boolean
}>()

const emit = defineEmits<{
  'accept': [suggestion: LinkSuggestion]
  'dismiss': [suggestion: LinkSuggestion]
  'request': []
  'close': []
}>()
</script>

<template>
  <div class="link-suggestions">
    <div class="suggestions-header">
      <span class="suggestions-title">Suggestions de maillage</span>
      <div class="suggestions-actions">
        <button class="btn-refresh" :disabled="isSuggesting" @click="emit('request')">
          {{ isSuggesting ? 'Analyse...' : 'Actualiser' }}
        </button>
        <button class="btn-close" @click="emit('close')">✕</button>
      </div>
    </div>

    <div v-if="isSuggesting" class="suggestions-loading">
      Analyse du contenu en cours...
    </div>

    <div v-else-if="suggestions.length === 0" class="suggestions-empty">
      Aucune suggestion. Cliquez sur "Actualiser" pour analyser le contenu.
    </div>

    <div v-else class="suggestions-list">
      <div v-for="suggestion in suggestions" :key="suggestion.targetSlug" class="suggestion-item">
        <div class="suggestion-info">
          <span class="suggestion-title">{{ suggestion.targetTitle }}</span>
          <span class="suggestion-type" :class="suggestion.targetType">{{ suggestion.targetType }}</span>
          <span class="suggestion-anchor">Ancre : « {{ suggestion.suggestedAnchor }} »</span>
          <span class="suggestion-reason">{{ suggestion.reason }}</span>
        </div>
        <div class="suggestion-buttons">
          <button class="btn-accept" title="Appliquer" @click="emit('accept', suggestion)">✓</button>
          <button class="btn-dismiss" title="Ignorer" @click="emit('dismiss', suggestion)">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.link-suggestions {
  padding: 1rem;
}

.suggestions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.suggestions-title {
  font-weight: 600;
  font-size: 0.875rem;
}

.suggestions-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-refresh {
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  font-size: 0.75rem;
  background: var(--color-background);
  color: var(--color-primary);
  cursor: pointer;
}

.btn-refresh:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: var(--color-text-muted);
}

.suggestions-loading,
.suggestions-empty {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.suggestion-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.suggestion-title {
  font-size: 0.8125rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggestion-type {
  display: inline-block;
  width: fit-content;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
}

.suggestion-type.Pilier { background: var(--color-badge-blue-bg); color: var(--color-badge-blue-text); }
.suggestion-type.Intermédiaire { background: var(--color-badge-amber-bg); color: var(--color-badge-amber-text); }
.suggestion-type.Spécialisé { background: var(--color-badge-green-bg); color: var(--color-badge-green-text); }

.suggestion-anchor {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.suggestion-reason {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.suggestion-buttons {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-accept,
.btn-dismiss {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-accept { color: var(--color-success); }
.btn-accept:hover { background: var(--color-badge-green-bg); border-color: var(--color-success); }

.btn-dismiss { color: var(--color-error); }
.btn-dismiss:hover { background: var(--color-error-bg); border-color: var(--color-error); }
</style>
