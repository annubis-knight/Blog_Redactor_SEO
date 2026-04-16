<script setup lang="ts">
import type { SerpAnalysisResult, SerpCompetitor } from '@shared/types/index.js'

defineProps<{
  serpResultsByKeyword: Map<string, SerpAnalysisResult>
  activeSerpTab: string
  activeSerpTabResult: SerpAnalysisResult | null
  displayedCompetitors: SerpCompetitor[]
  serpResult: SerpAnalysisResult | null
  sliderValue: number
  isLoading: boolean
  canAnalyze: boolean
  isLocked: boolean
  iaIsStreaming: boolean
  serpDoneCount: number
  serpTotalCount: number
  iaChunks: string
  currentStep: string
}>()

defineEmits<{
  'analyze': []
  'refresh': []
  'update:sliderValue': [value: number]
  'update:activeSerpTab': [value: string]
}>()
</script>

<template>
  <div>
    <!-- SERP controls -->
    <div class="serp-controls">
      <div class="slider-row">
        <label class="slider-label">Resultats SERP : <strong>{{ sliderValue }}</strong></label>
        <input
          type="range"
          min="3"
          max="10"
          :value="sliderValue"
          class="serp-slider"
          :disabled="!canAnalyze"
          @input="$emit('update:sliderValue', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <button class="btn-analyze" :disabled="!canAnalyze" @click="$emit('analyze')">
        {{ isLoading ? 'Analyse en cours...' : 'Analyser SERP' }}
      </button>
      <button
        v-if="serpResult && !isLocked"
        class="btn-refresh"
        :disabled="isLoading || iaIsStreaming"
        @click="$emit('refresh')"
      >
        Tout relancer (SERP + IA)
      </button>
    </div>

    <!-- Multi-step progress -->
    <div v-if="currentStep !== 'idle' && currentStep !== 'done'" class="analysis-steps" data-testid="analysis-steps">
      <div class="step-item" :class="{ active: currentStep === 'serp', done: currentStep !== 'serp' }">
        <span class="step-icon">{{ currentStep === 'serp' ? '&#9899;' : '&#9989;' }}</span>
        <span class="step-label">Scraping SERP Google
          <span class="step-progress">({{ serpDoneCount }} / {{ serpTotalCount }} mots-cles)</span>
        </span>
      </div>
      <div class="step-item" :class="{ active: currentStep === 'ia-proposal', done: currentStep === 'filtering', pending: currentStep === 'serp' }">
        <span class="step-icon">{{ currentStep === 'ia-proposal' ? '&#9899;' : currentStep === 'serp' ? '&#9898;' : '&#9989;' }}</span>
        <span class="step-label">Analyse IA — proposition de lieutenants
          <span v-if="currentStep === 'ia-proposal' && iaChunks" class="step-progress">({{ Math.round(iaChunks.length / 1000) }}k car. recus)</span>
        </span>
      </div>
      <div class="step-item" :class="{ active: currentStep === 'filtering', pending: currentStep === 'serp' || currentStep === 'ia-proposal' }">
        <span class="step-icon">{{ currentStep === 'filtering' ? '&#9899;' : (currentStep === 'serp' || currentStep === 'ia-proposal') ? '&#9898;' : '&#9989;' }}</span>
        <span class="step-label">Filtrage et selection des meilleurs candidats</span>
      </div>
    </div>

    <!-- Results summary -->
    <div v-if="serpResult" class="results-summary">
      <p>
        {{ displayedCompetitors.length }} concurrent{{ displayedCompetitors.length > 1 ? 's' : '' }}
        affiche{{ displayedCompetitors.length > 1 ? 's' : '' }}
        <span v-if="serpResult.fromCache" class="cache-badge">(cache)</span>
      </p>
      <p v-if="serpResult.paaQuestions.length > 0" class="paa-count">
        {{ serpResult.paaQuestions.length }} questions PAA
      </p>
      <p v-else class="paa-count paa-warning">0 PAA — les lieutenants seront bases sur les headings et la strategie du cocon</p>
    </div>

    <!-- Per-keyword SERP tabs -->
    <div v-if="serpResultsByKeyword.size > 0" class="serp-keyword-tabs" data-testid="serp-keyword-tabs">
      <div class="serp-tab-headers">
        <button
          v-for="[kw] in serpResultsByKeyword"
          :key="kw"
          class="serp-tab-btn"
          :class="{ active: activeSerpTab === kw }"
          @click="$emit('update:activeSerpTab', kw)"
        >
          {{ kw }}
          <span class="serp-tab-count">{{ serpResultsByKeyword.get(kw)?.competitors.filter(c => !c.fetchError).length ?? 0 }}</span>
        </button>
      </div>
      <div v-if="activeSerpTabResult" class="serp-tab-content">
        <div class="serp-tab-summary">
          {{ activeSerpTabResult.competitors.filter(c => !c.fetchError).length }} concurrents,
          {{ activeSerpTabResult.paaQuestions.length }} PAA
          <span v-if="activeSerpTabResult.fromCache" class="cache-badge">(cache)</span>
        </div>
        <div class="serp-urls" data-testid="serp-urls">
          <div
            v-for="comp in activeSerpTabResult.competitors"
            :key="comp.url"
            class="serp-url-item"
            :class="{ 'serp-url-error': comp.fetchError }"
          >
            <span class="serp-url-position">#{{ comp.position }}</span>
            <span class="serp-url-domain">{{ comp.domain }}</span>
            <a :href="comp.url" target="_blank" rel="noopener" class="serp-url-link">{{ comp.title }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.serp-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-secondary, #f9fafb);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.slider-label {
  font-size: 0.8125rem;
  white-space: nowrap;
  color: var(--color-text);
}

.serp-slider { flex: 1; max-width: 200px; }

.btn-analyze {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.btn-analyze:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn-analyze:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-refresh {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.btn-refresh:hover:not(:disabled) { background: var(--color-primary); color: white; }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

.analysis-steps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-block-info-bg, #eff6ff);
  border: 1px solid var(--color-info, #3b82f6);
  border-radius: 8px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted, #6b7280);
  transition: color 0.2s;
}

.step-item.active { color: var(--color-primary, #3b82f6); font-weight: 600; }
.step-item.done { color: var(--color-success, #22c55e); }
.step-item.active .step-icon { animation: pulse 1.5s ease-in-out infinite; }
.step-progress { font-weight: 400; font-size: 0.75rem; opacity: 0.7; }
.paa-warning { color: var(--color-warning, #f59e0b); font-style: italic; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.results-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.results-summary p { margin: 0; }

.cache-badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-badge-amber-bg, #fef3c7);
  border-radius: 4px;
}

.serp-keyword-tabs { margin-top: 0.5rem; }

.serp-tab-headers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.serp-tab-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.serp-tab-btn:hover { color: var(--color-primary); background: var(--color-bg-secondary, #f9fafb); }

.serp-tab-btn.active {
  color: var(--color-primary);
  font-weight: 600;
  border-color: var(--color-border);
  border-bottom-color: var(--color-primary);
  background: var(--color-bg-secondary, #f9fafb);
}

.serp-tab-count {
  display: inline-block;
  margin-left: 0.25rem;
  padding: 0 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  background: var(--color-badge-blue-bg, #dbeafe);
  color: var(--color-primary);
  border-radius: 4px;
}

.serp-tab-content { padding: 0.5rem 0; }

.serp-tab-summary { font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 0.5rem; }

.serp-urls {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-secondary, #f9fafb);
  border-radius: 6px;
  font-size: 0.8125rem;
  max-height: 200px;
  overflow-y: auto;
}

.serp-url-item { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
.serp-url-item.serp-url-error { opacity: 0.5; text-decoration: line-through; }
.serp-url-position { flex-shrink: 0; color: var(--color-text-muted, #6b7280); font-weight: 600; width: 1.75rem; }
.serp-url-domain { flex-shrink: 0; color: var(--color-primary, #3b82f6); font-weight: 500; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.serp-url-link { color: var(--color-text-muted, #6b7280); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.serp-url-link:hover { text-decoration: underline; }
</style>
