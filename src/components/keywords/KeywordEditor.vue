<script setup lang="ts">
import { ref } from 'vue'
import { log } from '@/utils/logger'
import { useKeywordAuditStore } from '@/stores/keyword-audit.store'
import type { KeywordType } from '../../../shared/types/index.js'

const props = defineProps<{
  cocoonName: string
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const auditStore = useKeywordAuditStore()

const keyword = ref('')
const type = ref<KeywordType>('Longue traine')
const saving = ref(false)
const errorMsg = ref('')

const types: KeywordType[] = ['Pilier', 'Moyenne traine', 'Longue traine']

async function handleSave() {
  if (!keyword.value.trim()) {
    errorMsg.value = 'Le mot-clé ne peut pas être vide'
    return
  }

  saving.value = true
  errorMsg.value = ''

  try {
    log.info('Adding keyword', { keyword: keyword.value.trim(), type: type.value, cocoon: props.cocoonName })
    await auditStore.addKeyword(keyword.value.trim(), props.cocoonName, type.value)
    log.info('Keyword added', { keyword: keyword.value.trim() })
    emit('saved')
    emit('close')
  } catch (err) {
    log.error('Failed to add keyword', { keyword: keyword.value.trim(), error: (err as Error).message })
    errorMsg.value = err instanceof Error ? err.message : 'Erreur lors de l\'ajout'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="editor-overlay" @click.self="emit('close')">
    <div class="editor-panel">
      <div class="editor-header">
        <h3>Ajouter un mot-clé</h3>
        <button class="btn-close" @click="emit('close')">×</button>
      </div>

      <div class="editor-form">
        <div class="form-group">
          <label for="kw-input">Mot-clé</label>
          <input
            id="kw-input"
            v-model="keyword"
            type="text"
            placeholder="Ex: refonte site web PME"
            @keyup.enter="handleSave"
          />
        </div>

        <div class="form-group">
          <label for="kw-type">Type de traîne</label>
          <select id="kw-type" v-model="type">
            <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Cocon</label>
          <input type="text" :value="cocoonName" disabled />
        </div>

        <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>
      </div>

      <div class="editor-footer">
        <button class="btn-secondary" @click="emit('close')">Annuler</button>
        <button class="btn-primary" :disabled="saving" @click="handleSave">
          {{ saving ? 'Ajout...' : 'Ajouter' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.editor-panel {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  width: 400px;
  max-width: 95vw;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.editor-header h3 {
  margin: 0;
  font-size: 1.125rem;
}

.btn-close {
  width: 2rem;
  height: 2rem;
  border: none;
  background: var(--color-surface);
  border-radius: 6px;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--color-text-muted);
}

.btn-close:hover {
  background: var(--color-border);
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.form-group input,
.form-group select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--color-surface);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group input:disabled {
  opacity: 0.6;
}

.form-error {
  font-size: 0.8125rem;
  color: var(--color-danger, #ef4444);
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
</style>
