<script setup lang="ts">
import { computed, ref } from 'vue'
import { log } from '@/utils/logger'
import { useKeywordAuditStore } from '@/stores/keyword-audit.store'
import { useKeywordScoring } from '@/composables/useKeywordScoring'
import type { KeywordSuggestion } from '../../../shared/types/index.js'

const props = defineProps<{
  keyword: string
  cocoonName: string
}>()

const emit = defineEmits<{
  close: []
  replace: []
}>()

const auditStore = useKeywordAuditStore()
const { getSuggestionsForKeyword, getScoreColor } = useKeywordScoring()

const currentResult = computed(() => auditStore.results.find(r => r.keyword === props.keyword))
const suggestions = computed(() => getSuggestionsForKeyword(props.keyword))
const selectedSuggestion = ref<KeywordSuggestion | null>(suggestions.value[0] ?? null)

const replacing = ref(false)

async function handleReplace() {
  if (!selectedSuggestion.value || !currentResult.value) return
  replacing.value = true
  try {
    log.info('Replacing keyword', { from: props.keyword, to: selectedSuggestion.value.suggested.keyword })
    await auditStore.replaceKeywordAction(
      props.keyword,
      selectedSuggestion.value.suggested.keyword,
      props.cocoonName,
      currentResult.value.type,
    )
    log.info('Keyword replaced', { from: props.keyword, to: selectedSuggestion.value.suggested.keyword })
    emit('replace')
    emit('close')
  } catch (err) {
    log.error('Keyword replacement failed', { keyword: props.keyword, error: (err as Error).message })
    alert(err instanceof Error ? err.message : 'Erreur lors du remplacement')
  } finally {
    replacing.value = false
  }
}
</script>

<template>
  <div class="comparison-overlay" @click.self="emit('close')">
    <div class="comparison-panel">
      <div class="comparison-header">
        <h3>Comparaison de mots-clés</h3>
        <button class="btn-close" @click="emit('close')">×</button>
      </div>

      <!-- Suggestion selector -->
      <div v-if="suggestions.length > 1" class="suggestion-selector">
        <label>Alternative :</label>
        <select @change="selectedSuggestion = suggestions[Number(($event.target as HTMLSelectElement).value)] ?? null">
          <option v-for="(s, i) in suggestions" :key="s.suggested.keyword" :value="i">
            {{ s.suggested.keyword }} (+{{ s.scoreDelta }} pts)
          </option>
        </select>
      </div>

      <!-- Side-by-side -->
      <div v-if="currentResult && selectedSuggestion" class="comparison-grid">
        <div class="comparison-col current">
          <div class="col-header">Actuel</div>
          <div class="col-keyword">{{ currentResult.keyword }}</div>
          <div class="metric-row">
            <span class="metric-label">Volume</span>
            <span class="metric-value">{{ currentResult.searchVolume.toLocaleString() }}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Difficulté</span>
            <span class="metric-value">{{ currentResult.difficulty }}/100</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">CPC</span>
            <span class="metric-value">{{ currentResult.cpc.toFixed(2) }}€</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Compétition</span>
            <span class="metric-value">{{ (currentResult.competition * 100).toFixed(0) }}%</span>
          </div>
          <div class="metric-row score-row">
            <span class="metric-label">Score</span>
            <span class="metric-value score" :style="{ color: getScoreColor(currentResult.compositeScore.total) }">
              {{ currentResult.compositeScore.total }}/100
            </span>
          </div>
        </div>

        <div class="comparison-divider">
          <span class="vs">VS</span>
        </div>

        <div class="comparison-col suggested">
          <div class="col-header">Alternative suggérée</div>
          <div class="col-keyword">{{ selectedSuggestion.suggested.keyword }}</div>
          <div class="metric-row">
            <span class="metric-label">Volume</span>
            <span class="metric-value better">{{ selectedSuggestion.suggested.searchVolume.toLocaleString() }}</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Difficulté</span>
            <span class="metric-value">N/A</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">CPC</span>
            <span class="metric-value">{{ selectedSuggestion.suggested.cpc.toFixed(2) }}€</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">Compétition</span>
            <span class="metric-value">{{ (selectedSuggestion.suggested.competition * 100).toFixed(0) }}%</span>
          </div>
          <div class="metric-row score-row">
            <span class="metric-label">Score</span>
            <span class="metric-value score" :style="{ color: getScoreColor(selectedSuggestion.suggested.compositeScore) }">
              {{ selectedSuggestion.suggested.compositeScore }}/100
              <span class="score-delta">(+{{ selectedSuggestion.scoreDelta }})</span>
            </span>
          </div>
        </div>
      </div>

      <div class="comparison-footer">
        <button class="btn-secondary" @click="emit('close')">Annuler</button>
        <button
          class="btn-primary"
          :disabled="replacing"
          @click="handleReplace"
        >
          {{ replacing ? 'Remplacement...' : 'Remplacer le mot-clé' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comparison-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.comparison-panel {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  width: 640px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.comparison-header h3 {
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

.suggestion-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.8125rem;
}

.suggestion-selector select {
  flex: 1;
  padding: 0.375rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  font-size: 0.8125rem;
}

.comparison-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0;
  margin-bottom: 1.25rem;
}

.comparison-col {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.comparison-col.suggested {
  border-color: var(--color-primary);
  background: rgba(59, 130, 246, 0.03);
}

.comparison-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.75rem;
}

.vs {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.col-header {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.col-keyword {
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  word-break: break-word;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--color-border);
}

.metric-row:last-child {
  border-bottom: none;
}

.metric-label {
  color: var(--color-text-muted);
}

.metric-value {
  font-weight: 500;
}

.metric-value.better {
  color: var(--color-success);
  font-weight: 700;
}

.score-row {
  margin-top: 0.25rem;
  border-bottom: none;
}

.metric-value.score {
  font-weight: 700;
  font-size: 1rem;
}

.score-delta {
  font-size: 0.75rem;
  opacity: 0.8;
}

.comparison-footer {
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
