<script setup lang="ts">
/**
 * Vague 5 — Sous-composant Vue extrait de KeywordDiscoveryTab.
 *
 * Toggle "Filtre de pertinence" + compteur visible/masqués + barre de
 * progression du scoring sémantique. Visible uniquement après
 * `hasDiscovered === true`.
 */

defineProps<{
  relevanceFilterEnabled: boolean
  uniqueKeywordCount: number
  relevantCount: number
  irrelevantCount: number
  semanticLoading: boolean
  scoringProgress: { scored: number; total: number; pass: number }
}>()

defineEmits<{
  (e: 'toggle'): void
}>()
</script>

<template>
  <div class="relevance-toggle">
    <label class="relevance-toggle__label">
      <input
        type="checkbox"
        :checked="relevanceFilterEnabled"
        @change="$emit('toggle')"
      />
      Filtre de pertinence
    </label>
    <span v-if="uniqueKeywordCount > 0" class="relevance-toggle__total">
      {{ relevantCount }} pertinents / {{ uniqueKeywordCount }} total
    </span>
    <span v-if="semanticLoading && scoringProgress.total > 0" class="relevance-toggle__scoring">
      <span class="scoring-progress">
        <span class="scoring-progress__bar">
          <span
            class="scoring-progress__fill"
            :style="{ width: Math.round((scoringProgress.scored / scoringProgress.total) * 100) + '%' }"
          />
        </span>
        <span class="scoring-progress__text">
          Filtrage {{ scoringProgress.pass }}/2 · {{ scoringProgress.scored }}/{{ scoringProgress.total }}
        </span>
      </span>
    </span>
    <span v-else-if="semanticLoading" class="relevance-toggle__scoring">
      <span class="spinner-small" /> Analyse...
    </span>
    <span v-else-if="relevanceFilterEnabled && irrelevantCount > 0" class="relevance-toggle__count">
      {{ irrelevantCount }} hors-sujet masqués
    </span>
  </div>
</template>

<style scoped>
.relevance-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8125rem;
}

.relevance-toggle__label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text);
}

.relevance-toggle__count {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.relevance-toggle__scoring {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 500;
}

.relevance-toggle__total {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-bg-hover);
  padding: 2px 8px;
  border-radius: 4px;
}

.scoring-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scoring-progress__bar {
  width: 80px;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.scoring-progress__fill {
  display: block;
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.scoring-progress__text {
  font-size: 0.6875rem;
  color: var(--color-primary);
  white-space: nowrap;
}

.spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
