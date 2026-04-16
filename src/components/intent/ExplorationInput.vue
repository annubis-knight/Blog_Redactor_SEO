<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useIntentStore } from '@/stores/keyword/intent.store'

const props = withDefaults(defineProps<{
  defaultKeyword: string
  mode?: 'workflow' | 'libre'
}>(), {
  mode: 'workflow',
})

const emit = defineEmits<{
  explore: [keyword: string]
}>()

const intentStore = useIntentStore()
const inputValue = ref(props.defaultKeyword || '')

// Pre-fill when defaultKeyword changes (article toggle, pain translation, etc.)
watch(() => props.defaultKeyword, (newVal) => {
  if (newVal) inputValue.value = newVal
})

const isLoading = computed(() =>
  intentStore.isAnalyzingIntent || intentStore.isValidatingAutocomplete,
)

function handleExplore() {
  const kw = inputValue.value.trim()
  if (!kw) return
  emit('explore', kw)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') handleExplore()
}

function useDefault() {
  inputValue.value = props.defaultKeyword
  handleExplore()
}

function exploreFromHistory(keyword: string) {
  inputValue.value = keyword
  emit('explore', keyword)
}
</script>

<template>
  <div class="exploration-input">
    <div class="input-row">
      <input
        v-model="inputValue"
        type="text"
        class="keyword-input"
        placeholder="Tapez un mot-cle a explorer..."
        :disabled="isLoading"
        @keydown="handleKeydown"
      />
      <button
        class="btn btn-primary"
        :disabled="!inputValue.trim() || isLoading"
        @click="handleExplore"
      >
        {{ isLoading ? 'Analyse...' : 'Explorer' }}
      </button>
    </div>

    <div v-if="!intentStore.hasExplored && !isLoading" class="suggestions-row">
      <span class="suggestion-label">Suggestion :</span>
      <button class="suggestion-chip" @click="useDefault">
        {{ defaultKeyword }}
      </button>
    </div>

    <!-- Exploration history -->
    <div v-if="intentStore.explorationHistory.length > 0" class="history-section">
      <span class="history-label">Historique</span>
      <div class="history-list">
        <button
          v-for="entry in intentStore.explorationHistory"
          :key="entry.keyword + entry.timestamp"
          class="history-chip"
          :class="{
            'history-chip--active': entry.keyword === intentStore.explorationKeyword,
            'history-chip--validated': entry.hasAutocomplete && (entry.certaintyTotal ?? 0) > 0.3,
          }"
          :disabled="isLoading"
          :title="`Certitude : combinaison Autocomplete + Volume + SERP (${Math.round((entry.certaintyTotal ?? 0) * 100)}%)`"
          @click="exploreFromHistory(entry.keyword)"
        >
          <span class="history-keyword">{{ entry.keyword }}</span>
          <span v-if="entry.certaintyTotal != null" class="history-score">
            certitude {{ Math.round(entry.certaintyTotal * 100) }}%
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exploration-input {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.keyword-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  transition: border-color 0.15s;
}

.keyword-input:focus {
  border-color: var(--color-primary);
}

.keyword-input:disabled {
  opacity: 0.6;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Suggestions */
.suggestions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.suggestion-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.suggestion-chip {
  padding: 0.25rem 0.625rem;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.suggestion-chip:hover {
  background: var(--color-primary);
  color: white;
}

/* History */
.history-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.history-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.history-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.5rem;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s;
}

.history-chip:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.history-chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.history-chip--active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-weight: 600;
}

.history-chip--validated {
  border-color: var(--color-success);
}

.history-score {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
