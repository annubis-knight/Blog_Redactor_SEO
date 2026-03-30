<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { StrategyStepData, SubQuestion } from '@shared/types/index.js'
import SubQuestionCard from './SubQuestionCard.vue'
import CollapsableSection from '@/components/shared/CollapsableSection.vue'

const props = defineProps<{
  title: string
  description: string
  stepData: StrategyStepData
  isSuggesting: boolean
  isDeepening?: boolean
  suggestingSubId?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:stepData', data: StrategyStepData): void
  (e: 'request-suggestion'): void
  (e: 'request-merge'): void
  (e: 'request-deepen'): void
  (e: 'request-sub-suggestion', subId: string): void
  (e: 'request-sub-merge', subId: string): void
  (e: 'delete-sub-question', subId: string): void
  (e: 'request-enrich', subId: string): void
}>()

const localInput = ref(props.stepData.input)
const isEditingValidated = ref(false)
const editedValidated = ref('')
const isEditingSuggestion = ref(false)
const editedSuggestion = ref('')
const showValidateMenu = ref(false)

watch(() => props.stepData.input, (v) => { localInput.value = v })

/** True when the MAIN question is loading (not a sub-question) */
const mainSuggesting = computed(() => props.isSuggesting && !props.suggestingSubId)

function updateInput() {
  emit('update:stepData', { ...props.stepData, input: localInput.value })
}

function validateSuggestion() {
  const validated = props.stepData.suggestion ?? localInput.value
  emit('update:stepData', { ...props.stepData, validated, input: localInput.value })
  showValidateMenu.value = false
}

function validateOwnInput() {
  emit('update:stepData', { ...props.stepData, validated: localInput.value, input: localInput.value })
  showValidateMenu.value = false
}

function validateAll() {
  emit('update:stepData', { ...props.stepData, input: localInput.value })
  showValidateMenu.value = false
  setTimeout(() => emit('request-merge'), 0)
}

function regenerateSuggestion() {
  emit('request-suggestion')
}

function toggleValidateMenu() {
  showValidateMenu.value = !showValidateMenu.value
}

function startEditValidated() {
  editedValidated.value = props.stepData.validated
  isEditingValidated.value = true
}

function saveEditValidated() {
  if (editedValidated.value.trim()) {
    emit('update:stepData', { ...props.stepData, validated: editedValidated.value })
  }
  isEditingValidated.value = false
}

function cancelEditValidated() {
  isEditingValidated.value = false
}

function startEditSuggestion() {
  editedSuggestion.value = props.stepData.suggestion ?? ''
  isEditingSuggestion.value = true
}

function saveEditSuggestion() {
  emit('update:stepData', { ...props.stepData, suggestion: editedSuggestion.value })
  isEditingSuggestion.value = false
}

function cancelEditSuggestion() {
  isEditingSuggestion.value = false
}

function updateSubQuestion(id: string, updated: SubQuestion) {
  const subQuestions = (props.stepData.subQuestions ?? []).map(sq =>
    sq.id === id ? updated : sq,
  )
  emit('update:stepData', { ...props.stepData, subQuestions })
}

const canDeepen = computed(() =>
  !props.isSuggesting && !props.isDeepening,
)

const canValidate = computed(() =>
  !mainSuggesting.value && (localInput.value.trim() || props.stepData.suggestion),
)
</script>

<template>
  <div class="strategy-step-wrapper">
    <!-- Validated result — ABOVE the card -->
    <div v-if="stepData.validated" class="validated-result">
      <svg class="validated-icon" width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <template v-if="isEditingValidated">
        <textarea
          v-model="editedValidated"
          class="validated-edit-textarea"
          rows="3"
        />
        <div class="validated-edit-actions">
          <button class="btn-icon-sm btn-icon-save" title="Sauvegarder" @click="saveEditValidated">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button class="btn-icon-sm btn-icon-cancel" title="Annuler" @click="cancelEditValidated">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
          </button>
        </div>
      </template>
      <template v-else>
        <span class="validated-text">{{ stepData.validated }}</span>
        <button class="btn-icon-edit" title="Modifier le texte validé" @click="startEditValidated">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </template>
    </div>

    <!-- Main question card -->
    <div class="strategy-step">
      <h3 class="step-title">{{ title }}</h3>
      <p class="step-desc">{{ description }}</p>

      <!-- Collapsible when validated -->
      <CollapsableSection
        v-if="stepData.validated"
        title="Modifier ma réponse"
        :default-open="false"
      >
        <div class="step-input">
          <label class="input-label">Votre réponse</label>
          <textarea
            v-model="localInput"
            class="input-textarea"
            rows="3"
            placeholder="Décrivez..."
            @blur="updateInput"
          />
        </div>

        <div v-if="stepData.suggestion" class="suggestion-box">
          <div class="suggestion-header">
            <p class="suggestion-label">Suggestion Claude :</p>
          </div>
          <div class="suggestion-content">
            <template v-if="isEditingSuggestion">
              <textarea
                v-model="editedSuggestion"
                class="suggestion-edit-textarea"
                rows="3"
              />
              <div class="suggestion-edit-actions">
                <button class="btn-icon-sm btn-icon-save" title="Sauvegarder" @click="saveEditSuggestion">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
                <button class="btn-icon-sm btn-icon-cancel" title="Annuler" @click="cancelEditSuggestion">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
                </button>
              </div>
            </template>
            <template v-else>
              <blockquote class="suggestion-text">{{ stepData.suggestion }}</blockquote>
              <div class="suggestion-icon-actions">
                <button class="btn-icon-edit" title="Modifier la suggestion" @click="startEditSuggestion">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
                <button
                  class="btn-icon-edit"
                  title="Régénérer la suggestion"
                  :disabled="mainSuggesting"
                  @click="regenerateSuggestion"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M1.5 8a6.5 6.5 0 0112.48-2.5M14.5 8a6.5 6.5 0 01-12.48 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    <path d="M14 2v3.5h-3.5M2 14v-3.5h3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- Footer: suggest + validate at bottom -->
        <div class="step-footer">
          <button
            v-if="!stepData.suggestion"
            class="btn-suggest"
            :disabled="mainSuggesting"
            @click="$emit('request-suggestion')"
          >
            {{ mainSuggesting ? 'Chargement...' : 'Demander une suggestion à Claude' }}
          </button>
          <div class="footer-right">
            <div class="validate-wrapper">
              <button
                class="btn-validate"
                :disabled="!canValidate"
                @click="toggleValidateMenu"
              >
                Valider
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <div v-if="showValidateMenu" class="validate-menu">
                <button
                  v-if="localInput.trim()"
                  class="validate-option"
                  @click="validateOwnInput"
                >
                  Mon texte
                </button>
                <button
                  v-if="stepData.suggestion"
                  class="validate-option"
                  @click="validateSuggestion"
                >
                  La suggestion
                </button>
                <button
                  v-if="localInput.trim() && stepData.suggestion"
                  class="validate-option validate-option--merge"
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
        <div class="step-input">
          <label class="input-label">Votre réponse</label>
          <textarea
            v-model="localInput"
            class="input-textarea"
            rows="3"
            placeholder="Décrivez..."
            @blur="updateInput"
          />
        </div>

        <div v-if="stepData.suggestion" class="suggestion-box">
          <div class="suggestion-header">
            <p class="suggestion-label">Suggestion Claude :</p>
          </div>
          <div class="suggestion-content">
            <template v-if="isEditingSuggestion">
              <textarea
                v-model="editedSuggestion"
                class="suggestion-edit-textarea"
                rows="3"
              />
              <div class="suggestion-edit-actions">
                <button class="btn-icon-sm btn-icon-save" title="Sauvegarder" @click="saveEditSuggestion">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
                <button class="btn-icon-sm btn-icon-cancel" title="Annuler" @click="cancelEditSuggestion">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
                </button>
              </div>
            </template>
            <template v-else>
              <blockquote class="suggestion-text">{{ stepData.suggestion }}</blockquote>
              <div class="suggestion-icon-actions">
                <button class="btn-icon-edit" title="Modifier la suggestion" @click="startEditSuggestion">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
                <button
                  class="btn-icon-edit"
                  title="Régénérer la suggestion"
                  :disabled="mainSuggesting"
                  @click="regenerateSuggestion"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M1.5 8a6.5 6.5 0 0112.48-2.5M14.5 8a6.5 6.5 0 01-12.48 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    <path d="M14 2v3.5h-3.5M2 14v-3.5h3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- Footer: suggest + validate at bottom of the card -->
        <div class="step-footer">
          <button
            v-if="!stepData.suggestion"
            class="btn-suggest"
            :disabled="mainSuggesting"
            @click="$emit('request-suggestion')"
          >
            {{ mainSuggesting ? 'Chargement...' : 'Demander une suggestion à Claude' }}
          </button>
          <div class="footer-right">
            <div class="validate-wrapper">
              <button
                class="btn-validate"
                :disabled="!canValidate"
                @click="toggleValidateMenu"
              >
                Valider
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <div v-if="showValidateMenu" class="validate-menu">
                <button
                  v-if="localInput.trim()"
                  class="validate-option"
                  @click="validateOwnInput"
                >
                  Mon texte
                </button>
                <button
                  v-if="stepData.suggestion"
                  class="validate-option"
                  @click="validateSuggestion"
                >
                  La suggestion
                </button>
                <button
                  v-if="localInput.trim() && stepData.suggestion"
                  class="validate-option validate-option--merge"
                  @click="validateAll"
                >
                  Fusionner les deux
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Sub-questions — outside the card -->
    <div v-if="stepData.subQuestions?.length" class="sub-questions-list">
      <SubQuestionCard
        v-for="sq in stepData.subQuestions"
        :key="sq.id"
        :sub-question="sq"
        :is-suggesting="isSuggesting && suggestingSubId === sq.id"
        @update:sub-question="updateSubQuestion(sq.id, $event)"
        @request-suggestion="$emit('request-sub-suggestion', sq.id)"
        @request-merge="$emit('request-sub-merge', sq.id)"
        @delete="$emit('delete-sub-question', sq.id)"
        @validated="$emit('request-enrich', sq.id)"
      />
    </div>

    <!-- "+" button — always after the last question card -->
    <button
      class="btn-add-sub"
      :disabled="!canDeepen"
      :title="isDeepening ? 'Génération...' : 'Approfondir'"
      @click="$emit('request-deepen')"
    >
      <svg v-if="!isDeepening" width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span v-else class="btn-add-spinner" />
    </button>

  </div>
</template>

<style scoped>
.strategy-step-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* --- Validated result (ABOVE the card) --- */
.validated-result {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-success);
  border-radius: 8px;
  background: var(--color-bg-elevated, #e8f5e9);
}

.validated-icon {
  flex-shrink: 0;
  color: var(--color-success);
  margin-top: 0.125rem;
}

.validated-text {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

.validated-edit-textarea {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-success);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  background: var(--color-background);
  color: var(--color-text);
  line-height: 1.5;
}

.validated-edit-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.validated-edit-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* --- Main card --- */
.strategy-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
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

.input-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
}

.input-textarea {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  background: var(--color-background);
  color: var(--color-text);
}

.input-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* --- Footer (bottom of card) --- */
.step-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.footer-right {
  margin-left: auto;
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

/* --- Validate dropdown button --- */
.validate-wrapper {
  position: relative;
}

.btn-validate {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-success);
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-success);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-validate:hover:not(:disabled) {
  background: var(--color-bg-elevated, #e8f5e9);
}

.btn-validate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.validate-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 4px);
  min-width: 180px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  overflow: hidden;
}

.validate-option {
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

.validate-option:hover {
  background: var(--color-bg-soft);
}

.validate-option--merge {
  color: var(--color-primary);
  font-weight: 600;
  border-top: 1px solid var(--color-border);
}

/* --- Suggestion box --- */
.suggestion-box {
  padding: 1rem;
  border-left: 3px solid var(--color-primary);
  background: var(--color-bg-soft);
  border-radius: 0 6px 6px 0;
}

.suggestion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.suggestion-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.suggestion-content {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.suggestion-text {
  flex: 1;
  font-size: 0.875rem;
  margin: 0;
  padding: 0;
  border: none;
  color: var(--color-text);
  line-height: 1.6;
}

.suggestion-edit-textarea {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  background: var(--color-background);
  color: var(--color-text);
  line-height: 1.5;
}

.suggestion-edit-textarea:focus {
  outline: none;
}

.suggestion-edit-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Column of icon buttons next to suggestion text */
.suggestion-icon-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* --- Edit / action icon buttons --- */
.btn-icon-edit {
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

.btn-icon-edit:hover:not(:disabled) {
  background: var(--color-bg-soft);
  color: var(--color-primary);
}

.btn-icon-edit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-icon-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: none;
  transition: all 0.15s;
}

.btn-icon-save {
  color: var(--color-success);
}

.btn-icon-save:hover {
  background: var(--color-bg-elevated, #e8f5e9);
}

.btn-icon-cancel {
  color: var(--color-text-muted);
}

.btn-icon-cancel:hover {
  background: var(--color-bg-soft);
  color: var(--color-danger, #e53e3e);
}

/* --- "+" round button --- */
.btn-add-sub {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 2px dashed var(--color-border);
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-sub:hover:not(:disabled) {
  border-color: var(--color-primary);
  border-style: solid;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  transform: scale(1.1);
}

.btn-add-sub:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-add-spinner {
  display: block;
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

/* --- Sub-questions list --- */
.sub-questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

</style>
