<script setup lang="ts">
import { ref } from 'vue'

interface Assignment {
  articleId: number
  articleTitle: string
  articleType: string
  capitaine: string
  lieutenants: string[]
  lexique: string[]
}

const props = defineProps<{
  assignments: Assignment[]
  warnings: string[]
  isApplying: boolean
}>()

const emit = defineEmits<{
  (e: 'apply', assignments: Assignment[]): void
  (e: 'cancel'): void
}>()

const editableAssignments = ref([...props.assignments])
</script>

<template>
  <div class="migration-preview">
    <h3 class="preview-title">Assignation des mots-cles</h3>

    <div v-if="warnings.length > 0" class="warnings">
      <p v-for="(warn, i) in warnings" :key="i" class="warning-item">{{ warn }}</p>
    </div>

    <div class="assignments-table">
      <div
        v-for="assignment in editableAssignments"
        :key="assignment.articleId"
        class="assignment-row"
      >
        <div class="assignment-article">
          <span class="article-type" :class="assignment.articleType.toLowerCase()">{{ assignment.articleType }}</span>
          <span class="article-title">{{ assignment.articleTitle }}</span>
        </div>
        <div class="assignment-keywords">
          <div class="kw-level">
            <span class="kw-label">Capitaine</span>
            <input
              v-model="assignment.capitaine"
              class="kw-input capitaine"
              placeholder="Mot-cle principal"
            />
          </div>
          <div class="kw-level">
            <span class="kw-label">Lieutenants</span>
            <span v-if="assignment.lieutenants.length === 0" class="kw-empty">Aucun</span>
            <span v-for="(lt, j) in assignment.lieutenants" :key="j" class="kw-badge lieutenant">{{ lt }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-actions">
      <button class="btn-cancel" @click="$emit('cancel')">Annuler</button>
      <button
        class="btn-apply"
        :disabled="isApplying"
        @click="$emit('apply', editableAssignments)"
      >
        {{ isApplying ? 'Application...' : 'Confirmer l\'assignation' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.migration-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.warnings {
  padding: 0.75rem 1rem;
  background: var(--color-warning-soft, #fff3cd);
  border: 1px solid var(--color-warning, #ffc107);
  border-radius: 6px;
}

.warning-item {
  font-size: 0.8125rem;
  margin: 0 0 0.25rem;
  color: var(--color-warning-text, #856404);
}

.warning-item:last-child {
  margin-bottom: 0;
}

.assignment-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.assignment-article {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.article-type {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
}

.article-type.pilier {
  background: var(--color-badge-blue-bg, #dbeafe);
  color: var(--color-primary);
}

.article-type.intermediaire,
.article-type.interm\00e9diaire {
  background: var(--color-badge-slate-bg, #e2e8f0);
  color: var(--color-secondary, #475569);
}

.article-type.specialise,
.article-type.sp\00e9cialis\00e9 {
  background: var(--color-badge-green-bg, #dcfce7);
  color: var(--color-success);
}

.article-title {
  font-size: 0.875rem;
  font-weight: 600;
}

.assignment-keywords {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-left: 1rem;
}

.kw-level {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.kw-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  min-width: 5rem;
}

.kw-input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.8125rem;
  font-family: inherit;
  max-width: 300px;
}

.kw-input.capitaine {
  font-weight: 600;
  border-color: var(--color-primary);
}

.kw-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.kw-badge.lieutenant {
  background: var(--color-bg-soft);
  color: var(--color-text);
}

.kw-empty {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.btn-cancel {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  background: transparent;
  cursor: pointer;
}

.btn-apply {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
}

.btn-apply:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-apply:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
