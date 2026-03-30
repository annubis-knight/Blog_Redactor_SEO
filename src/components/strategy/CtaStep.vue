<script setup lang="ts">
import { ref } from 'vue'
import type { CtaData } from '@shared/types/index.js'

const props = defineProps<{
  cta: CtaData
  isSuggesting: boolean
}>()

const emit = defineEmits<{
  (e: 'update:cta', data: CtaData): void
  (e: 'request-suggestion'): void
}>()

const ctaTypes = [
  { value: 'service' as const, label: 'Page service du silo' },
  { value: 'formulaire' as const, label: 'Formulaire de contact' },
  { value: 'guide' as const, label: 'Guide PDF' },
  { value: 'autre' as const, label: 'Autre' },
]

const selectedType = ref(props.cta.type)
const target = ref(props.cta.target)

function updateCta() {
  emit('update:cta', { ...props.cta, type: selectedType.value, target: target.value })
}
</script>

<template>
  <div class="cta-step">
    <h3 class="step-title">Call-to-Action</h3>
    <p class="step-desc">Où voulez-vous envoyer le lecteur après cet article ?</p>

    <div class="cta-options">
      <button
        v-for="ct in ctaTypes"
        :key="ct.value"
        class="cta-btn"
        :class="{ active: selectedType === ct.value }"
        @click="selectedType = ct.value; updateCta()"
      >
        {{ ct.label }}
      </button>
    </div>

    <div class="cta-target">
      <label class="input-label">URL ou description de la cible</label>
      <input
        v-model="target"
        type="text"
        class="input-text"
        placeholder="https://... ou description"
        @blur="updateCta"
      />
    </div>

    <div class="step-actions">
      <button
        class="btn-suggest"
        :disabled="isSuggesting"
        @click="$emit('request-suggestion')"
      >
        {{ isSuggesting ? 'Chargement...' : 'Suggérer un CTA' }}
      </button>
    </div>

    <div v-if="cta.suggestion" class="suggestion-box">
      <p class="suggestion-label">Suggestion Claude :</p>
      <blockquote class="suggestion-text">{{ cta.suggestion }}</blockquote>
    </div>
  </div>
</template>

<style scoped>
.cta-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.step-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
}

.cta-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cta-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8125rem;
  cursor: pointer;
  background: transparent;
  color: var(--color-text);
  transition: all 0.15s;
}

.cta-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 600;
}

.cta-btn:hover:not(.active) {
  background: var(--color-bg-soft);
}

.input-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
}

.input-text {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  background: var(--color-background);
  color: var(--color-text);
}

.input-text:focus {
  outline: none;
  border-color: var(--color-primary);
}

.step-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-suggest {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  cursor: pointer;
}

.btn-suggest:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.btn-suggest:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.suggestion-box {
  padding: 1rem;
  border-left: 3px solid var(--color-primary);
  background: var(--color-surface);
  border-radius: 0 6px 6px 0;
}

.suggestion-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  margin: 0 0 0.5rem;
  text-transform: uppercase;
}

.suggestion-text {
  font-size: 0.875rem;
  margin: 0;
  padding: 0;
  border: none;
  color: var(--color-text);
  line-height: 1.6;
}
</style>
