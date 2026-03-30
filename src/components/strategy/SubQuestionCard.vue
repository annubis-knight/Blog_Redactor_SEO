<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { SubQuestion } from '@shared/types/index.js'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'

const props = defineProps<{
  subQuestion: SubQuestion
  isSuggesting: boolean
}>()

const emit = defineEmits<{
  (e: 'update:subQuestion', data: SubQuestion): void
  (e: 'request-suggestion', id: string): void
  (e: 'request-merge', id: string): void
  (e: 'delete', id: string): void
  (e: 'validated'): void
}>()

const localInput = ref(props.subQuestion.input)
const showValidateMenu = ref(false)

watch(() => props.subQuestion.input, (v) => { localInput.value = v })

const canValidate = computed(() =>
  !props.isSuggesting && (localInput.value.trim() || props.subQuestion.suggestion),
)

function updateInput() {
  emit('update:subQuestion', { ...props.subQuestion, input: localInput.value })
}

function validateSuggestion() {
  const validated = props.subQuestion.suggestion ?? localInput.value
  emit('update:subQuestion', { ...props.subQuestion, validated, input: localInput.value })
  showValidateMenu.value = false
  setTimeout(() => emit('validated'), 0)
}

function validateOwnInput() {
  emit('update:subQuestion', { ...props.subQuestion, validated: localInput.value, input: localInput.value })
  showValidateMenu.value = false
  setTimeout(() => emit('validated'), 0)
}

function validateAll() {
  emit('update:subQuestion', { ...props.subQuestion, input: localInput.value })
  showValidateMenu.value = false
  setTimeout(() => emit('request-merge', props.subQuestion.id), 0)
}

function toggleValidateMenu() {
  showValidateMenu.value = !showValidateMenu.value
}

function regenerateSuggestion() {
  emit('request-suggestion', props.subQuestion.id)
}
</script>

<template>
  <div class="sub-question-card">
    <div class="sq-header">
      <h4 class="sq-title">{{ subQuestion.question }}</h4>
      <button
        class="sq-delete"
        title="Supprimer cette sous-question"
        @click="$emit('delete', subQuestion.id)"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>
    <p class="sq-desc">{{ subQuestion.description }}</p>

    <!-- Collapsible when validated -->
    <CollapsableSection
      v-if="subQuestion.validated"
      title="Modifier ma réponse"
      :default-open="false"
    >
      <div class="sq-input">
        <textarea
          v-model="localInput"
          class="sq-textarea"
          rows="2"
          placeholder="Votre réponse..."
          @blur="updateInput"
        />
      </div>

      <div v-if="subQuestion.suggestion" class="sq-suggestion">
        <p class="sq-suggestion-label">Suggestion :</p>
        <div class="sq-suggestion-content">
          <blockquote class="sq-suggestion-text">{{ subQuestion.suggestion }}</blockquote>
          <button
            class="sq-btn-icon"
            title="Régénérer"
            :disabled="isSuggesting"
            @click="regenerateSuggestion"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1.5 8a6.5 6.5 0 0112.48-2.5M14.5 8a6.5 6.5 0 01-12.48 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <path d="M14 2v3.5h-3.5M2 14v-3.5h3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Footer: suggest + validate at bottom -->
      <div class="sq-footer">
        <button
          v-if="!subQuestion.suggestion"
          class="sq-btn sq-btn--suggest"
          :disabled="isSuggesting"
          @click="$emit('request-suggestion', subQuestion.id)"
        >
          {{ isSuggesting ? 'Chargement...' : 'Suggestion Claude' }}
        </button>
        <div class="sq-footer-right">
          <div class="sq-validate-wrapper">
            <button
              class="sq-btn sq-btn--validate"
              :disabled="!canValidate"
              @click="toggleValidateMenu"
            >
              Valider
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <div v-if="showValidateMenu" class="sq-validate-menu">
              <button
                v-if="localInput.trim()"
                class="sq-validate-option"
                @click="validateOwnInput"
              >
                Mon texte
              </button>
              <button
                v-if="subQuestion.suggestion"
                class="sq-validate-option"
                @click="validateSuggestion"
              >
                La suggestion
              </button>
              <button
                v-if="localInput.trim() && subQuestion.suggestion"
                class="sq-validate-option sq-validate-option--merge"
                @click="validateAll"
              >
                Fusionner les deux
              </button>
            </div>
          </div>
        </div>
      </div>
    </CollapsableSection>

    <!-- Normal display when NOT validated -->
    <template v-else>
      <div class="sq-input">
        <textarea
          v-model="localInput"
          class="sq-textarea"
          rows="2"
          placeholder="Votre réponse..."
          @blur="updateInput"
        />
      </div>

      <div v-if="subQuestion.suggestion" class="sq-suggestion">
        <p class="sq-suggestion-label">Suggestion :</p>
        <div class="sq-suggestion-content">
          <blockquote class="sq-suggestion-text">{{ subQuestion.suggestion }}</blockquote>
          <button
            class="sq-btn-icon"
            title="Régénérer"
            :disabled="isSuggesting"
            @click="regenerateSuggestion"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1.5 8a6.5 6.5 0 0112.48-2.5M14.5 8a6.5 6.5 0 01-12.48 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <path d="M14 2v3.5h-3.5M2 14v-3.5h3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Footer: suggest + validate at bottom -->
      <div class="sq-footer">
        <button
          v-if="!subQuestion.suggestion"
          class="sq-btn sq-btn--suggest"
          :disabled="isSuggesting"
          @click="$emit('request-suggestion', subQuestion.id)"
        >
          {{ isSuggesting ? 'Chargement...' : 'Suggestion Claude' }}
        </button>
        <div class="sq-footer-right">
          <div class="sq-validate-wrapper">
            <button
              class="sq-btn sq-btn--validate"
              :disabled="!canValidate"
              @click="toggleValidateMenu"
            >
              Valider
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <div v-if="showValidateMenu" class="sq-validate-menu">
              <button
                v-if="localInput.trim()"
                class="sq-validate-option"
                @click="validateOwnInput"
              >
                Mon texte
              </button>
              <button
                v-if="subQuestion.suggestion"
                class="sq-validate-option"
                @click="validateSuggestion"
              >
                La suggestion
              </button>
              <button
                v-if="localInput.trim() && subQuestion.suggestion"
                class="sq-validate-option sq-validate-option--merge"
                @click="validateAll"
              >
                Fusionner les deux
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Validated badge -->
    <div v-if="subQuestion.validated" class="sq-validated">
      <svg class="sq-validated-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>{{ subQuestion.validated }}</span>
    </div>
  </div>
</template>

<style scoped>
.sub-question-card {
  position: relative;
  margin-left: 1.5rem;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--color-primary-soft, #b3d4fc);
  background: var(--color-bg-soft);
  border-radius: 0 6px 6px 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sq-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.sq-title {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
  line-height: 1.4;
}

.sq-delete {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.sq-delete:hover {
  background: var(--color-danger-soft, #fde8e8);
  color: var(--color-danger, #e53e3e);
}

.sq-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0;
  font-style: italic;
  line-height: 1.4;
}

.sq-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-family: inherit;
  resize: vertical;
  background: var(--color-background);
  color: var(--color-text);
}

.sq-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* --- Suggestion --- */
.sq-suggestion {
  padding: 0.625rem;
  border-left: 2px solid var(--color-primary);
  background: var(--color-surface);
  border-radius: 0 4px 4px 0;
}

.sq-suggestion-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  margin: 0 0 0.375rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sq-suggestion-content {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.sq-suggestion-text {
  flex: 1;
  font-size: 0.8125rem;
  margin: 0;
  padding: 0;
  border: none;
  color: var(--color-text);
  line-height: 1.5;
}

/* Regenerate icon button */
.sq-btn-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.sq-btn-icon:hover:not(:disabled) {
  background: var(--color-bg-soft);
  color: var(--color-primary);
}

.sq-btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* --- Footer (bottom of card) --- */
.sq-footer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.25rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.sq-footer-right {
  margin-left: auto;
}

.sq-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 5px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.sq-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sq-btn--suggest {
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  background: transparent;
}

.sq-btn--suggest:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.sq-btn--validate {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--color-success);
  color: var(--color-success);
  background: transparent;
}

.sq-btn--validate:hover:not(:disabled) {
  background: var(--color-bg-elevated, #e8f5e9);
}

/* --- Validate dropdown --- */
.sq-validate-wrapper {
  position: relative;
}

.sq-validate-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 4px);
  min-width: 170px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  overflow: hidden;
}

.sq-validate-option {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  font-size: 0.8125rem;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.sq-validate-option:hover {
  background: var(--color-bg-soft);
}

.sq-validate-option--merge {
  color: var(--color-primary);
  font-weight: 600;
  border-top: 1px solid var(--color-border);
}

/* --- Validated badge --- */
.sq-validated {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--color-success);
  border-radius: 5px;
  background: var(--color-bg-elevated, #e8f5e9);
  font-size: 0.75rem;
  color: var(--color-success);
}

.sq-validated-icon {
  flex-shrink: 0;
  margin-top: 0.0625rem;
}
</style>
