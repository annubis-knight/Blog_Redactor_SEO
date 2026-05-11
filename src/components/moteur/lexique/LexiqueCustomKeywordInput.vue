<script setup lang="ts">
/**
 * Saisie libre d'un mot-clé pour déclencher une nouvelle exploration TF-IDF.
 *
 * Renommé depuis `LexiqueMultiKeywordPanel.vue` — la
 * liste des explorations passées (chips) est désormais portée par le
 * `<TabBar>` du parent `LexiquePanel.vue` (FR-LEX-MULTI-KEYWORD-TABS).
 *
 * Ce composant ne s'affiche que lorsque l'onglet « + Tester un mot-clé »
 * est actif côté parent.
 */
defineProps<{
  customKeywordInput: string
  isLoading: boolean
  isLocked: boolean
}>()

defineEmits<{
  (e: 'update:custom-keyword', value: string): void
  (e: 'extract-custom'): void
}>()
</script>

<template>
  <div class="custom-keyword-section" data-testid="custom-keyword-section">
    <label class="custom-keyword-label">Tester un mot-clé</label>
    <div class="custom-keyword-row">
      <input
        :value="customKeywordInput"
        type="text"
        class="custom-keyword-input"
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
  </div>
</template>

<style scoped>
.custom-keyword-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.custom-keyword-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.custom-keyword-row {
  display: flex;
  gap: 0.5rem;
}

.custom-keyword-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-elevated);
  color: var(--color-text);
}

.custom-keyword-input:focus {
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
</style>
