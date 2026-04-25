<script setup lang="ts">
// Sprint 16 — composition-warnings messages removed: the warning is now
// surfaced via an icon in the carousel header (CaptainCarousel.vue) with a
// hover tooltip. Keeping props for backward compat but no longer rendered.
defineProps<{
  modelValue: string
  compositionWarnings?: { rule: string; message: string }[]
  compositionAllPass?: boolean
  articleLevel?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
  'submit': []
}>()
</script>

<template>
  <div class="keyword-input" data-testid="keyword-input">
    <span class="keyword-input__icon" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </span>
    <input
      :value="modelValue"
      type="text"
      class="keyword-input__field"
      placeholder="Tester un mot-clé capitaine…"
      spellcheck="false"
      autocomplete="off"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="$emit('submit')"
    />
    <kbd v-if="!modelValue.trim()" class="keyword-input__hint" aria-hidden="true">Entrée</kbd>
    <button
      class="keyword-input__btn"
      :disabled="!modelValue.trim() || disabled"
      @click="$emit('submit')"
    >
      <svg v-if="!disabled" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <span v-else class="keyword-input__spinner" aria-hidden="true" />
      Analyser
    </button>
  </div>
</template>

<style scoped>
.keyword-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.375rem 0.375rem 0.375rem 0.75rem;
  background: #fff;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.keyword-input:focus-within {
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.keyword-input__icon {
  display: inline-flex;
  align-items: center;
  color: var(--color-text-muted, #94a3b8);
  flex-shrink: 0;
}

.keyword-input__field {
  flex: 1;
  min-width: 0;
  padding: 0.375rem 0;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.875rem;
  color: var(--color-text, #1e293b);
}

.keyword-input__field::placeholder {
  color: var(--color-text-muted, #94a3b8);
}

.keyword-input__hint {
  font-family: var(--font-mono, monospace);
  font-size: 0.625rem;
  color: var(--color-text-muted, #94a3b8);
  background: #fff;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 3px;
  padding: 1px 5px;
  flex-shrink: 0;
  user-select: none;
}

.keyword-input__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-primary, #3b82f6);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, transform 0.06s;
}

.keyword-input__btn:hover:not(:disabled) { background: #2563eb; }
.keyword-input__btn:active:not(:disabled) { transform: scale(0.97); }
.keyword-input__btn:disabled {
  background: var(--color-border, #cbd5e1);
  color: #fff;
  cursor: not-allowed;
}

.keyword-input__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
