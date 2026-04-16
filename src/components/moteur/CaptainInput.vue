<script setup lang="ts">
import type { ArticleLevel } from '@shared/types/index.js'

defineProps<{
  modelValue: string
  compositionWarnings: { rule: string; message: string }[]
  compositionAllPass: boolean
  articleLevel: ArticleLevel
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
  'submit': []
}>()
</script>

<template>
  <div>
    <div class="keyword-input" data-testid="keyword-input">
      <input
        :value="modelValue"
        type="text"
        class="keyword-input-field"
        placeholder="Mot-clé capitaine à valider..."
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @keyup.enter="$emit('submit')"
      />
      <button
        class="keyword-input-btn"
        :disabled="!modelValue.trim() || disabled"
        @click="$emit('submit')"
      >
        Valider
      </button>
    </div>

    <div
      v-if="modelValue.trim().length >= 2 && compositionWarnings.length > 0"
      class="composition-warnings"
      data-testid="composition-warnings"
    >
      <div v-for="warning in compositionWarnings" :key="warning.rule" class="composition-warning">
        <span class="composition-icon">&#9888;</span>
        <span class="composition-msg">{{ warning.message }}</span>
      </div>
    </div>
    <div
      v-else-if="modelValue.trim().length >= 2 && compositionAllPass"
      class="composition-ok"
      data-testid="composition-ok"
    >
      <span class="composition-icon">&#10003;</span>
      <span class="composition-msg">
        Composition conforme pour un {{ articleLevel === 'pilier' ? 'Pilier' : articleLevel === 'intermediaire' ? 'Intermédiaire' : 'Spécialisé' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.keyword-input {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.keyword-input-field {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 6px;
  font-size: 0.875rem;
}

.keyword-input-btn {
  padding: 0.5rem 1rem;
  background: var(--color-primary, #3b82f6);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.keyword-input-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.composition-warnings {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.composition-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  background: var(--color-badge-amber-bg, rgba(232, 168, 56, 0.1));
  color: var(--color-badge-amber-text, #d97706);
  line-height: 1.4;
}

.composition-ok {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.5rem;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  background: var(--color-badge-green-bg, rgba(34, 197, 94, 0.1));
  color: var(--color-badge-green-text, #16a34a);
}

.composition-icon {
  flex-shrink: 0;
  font-size: 0.8125rem;
}

.composition-msg {
  flex: 1;
}
</style>
